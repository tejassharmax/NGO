process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const upload = multer({ limits: { fileSize: 15 * 1024 * 1024 } }); // Max 15MB

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static frontend files
app.use(express.static(__dirname));
app.use('/pages', express.static('pages'));


/* ═══════════════════════════════════════════════════════
   IMAGE PREPROCESSING PIPELINE
   ═══════════════════════════════════════════════════════ */

/**
 * Preprocess a document image for OCR.
 * Handles low-light, blurry, noisy, and small images.
 *
 * Modes:
 *  - standard   → moderate enhancement (best for decent-quality photos)
 *  - aggressive  → heavy contrast + binarisation (for poor-quality / faded docs)
 *  - brightened  → gamma correction + denoising (for dark / low-light photos)
 */
async function preprocessImage(buffer, mode = 'standard') {
  const metadata = await sharp(buffer).metadata();
  let pipeline = sharp(buffer);

  // 1. Auto-rotate based on EXIF (phone cameras often embed rotation)
  pipeline = pipeline.rotate();

  // 2. Convert to grayscale — removes colour noise, improves character edges
  pipeline = pipeline.grayscale();

  // 3. Up-scale small / phone-camera images so characters are large enough for Tesseract
  //    Tesseract works best at ~300 DPI; most phone photos of cards are ~150 DPI effective
  const targetWidth = mode === 'aggressive' ? 2500 : 1800;
  if (metadata.width && metadata.width < targetWidth) {
    const scale = Math.min(4, Math.ceil(targetWidth / metadata.width));
    pipeline = pipeline.resize({
      width: Math.round(metadata.width * scale),
      kernel: 'lanczos3'
    });
  }

  // 4. Normalize brightness & contrast — stretches histogram to full range
  //    This is the single most important step for low-light images
  pipeline = pipeline.normalize();

  // 5. Mode-specific enhancements
  switch (mode) {
    case 'aggressive':
      // Heavy sharpening + high contrast + binarisation
      pipeline = pipeline
        .sharpen(2.5)
        .linear(2.0, -128)     // double the contrast
        .threshold(130);        // binarise (pure black & white)
      break;

    case 'brightened':
      // Brighten dark images, then sharpen
      pipeline = pipeline
        .modulate({ brightness: 1.6 })  // brighten dark photos
        .sharpen(2.0)
        .linear(1.5, -64)              // boost contrast
        .median(3);                     // denoise
      break;

    default: // 'standard'
      // Moderate enhancement
      pipeline = pipeline
        .sharpen(1.5)
        .linear(1.4, -51)     // +40% contrast
        .median(3);            // denoise
      break;
  }

  return pipeline.png().toBuffer();
}


/* ═══════════════════════════════════════════════════════
   MULTI-PASS OCR ENGINE
   ═══════════════════════════════════════════════════════ */

/**
 * Runs Tesseract with multiple preprocessing strategies and picks the best.
 * This handles a wide variety of image qualities — from studio scans to
 * dark phone photos of crumpled documents.
 */
async function performOCR(buffer) {
  const passes = [
    { mode: 'standard',   label: 'standard enhancement' },
    { mode: 'brightened', label: 'low-light brightening' },
    { mode: 'aggressive', label: 'aggressive binarisation' },
  ];

  let bestText = '';
  let bestConfidence = 0;
  let bestFields = 0;

  for (const pass of passes) {
    console.log(`  → ${pass.label}…`);
    try {
      const processed = await preprocessImage(buffer, pass.mode);
      const result = await Tesseract.recognize(processed, 'eng', { langPath: __dirname });
      const text = result.data.text || '';
      const confidence = result.data.confidence || 0;
      const parsed = parseOCRText(text, true); // silent mode for evaluation
      const fields = countExtractedFields(parsed);

      console.log(`    confidence ${confidence.toFixed(1)}%  |  fields extracted: ${fields}`);

      if (fields > bestFields || (fields === bestFields && confidence > bestConfidence)) {
        bestText = text;
        bestConfidence = confidence;
        bestFields = fields;
      }

      // If we already have a great result, skip remaining passes
      if (confidence > 75 && fields >= 3) {
        console.log(`    ✓ good result — skipping remaining passes`);
        break;
      }
    } catch (err) {
      console.warn(`    ✗ ${pass.label} failed: ${err.message}`);
    }
  }

  // Final fallback: raw image (sometimes preprocessing hurts clean scans)
  if (bestFields < 2) {
    console.log('  → raw image (no preprocessing)…');
    try {
      const result = await Tesseract.recognize(buffer, 'eng', { langPath: __dirname });
      const text = result.data.text || '';
      const confidence = result.data.confidence || 0;
      const parsed = parseOCRText(text, true);
      const fields = countExtractedFields(parsed);
      console.log(`    confidence ${confidence.toFixed(1)}%  |  fields extracted: ${fields}`);

      if (fields > bestFields || (fields === bestFields && confidence > bestConfidence)) {
        bestText = text;
        bestConfidence = confidence;
        bestFields = fields;
      }
    } catch (err) {
      console.warn(`    ✗ raw pass failed: ${err.message}`);
    }
  }

  return { text: bestText, confidence: bestConfidence, fields: bestFields };
}

function countExtractedFields(parsed) {
  return ['firstName', 'idNumber', 'dob', 'gender', 'father', 'mother', 'phone', 'hemoglobin', 'rbc', 'wbc', 'platelets']
    .filter(k => parsed[k] && String(parsed[k]).trim().length > 0).length;
}


/* ═══════════════════════════════════════════════════════
   API ENDPOINT
   ═══════════════════════════════════════════════════════ */

app.post('/api/ocr', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    console.log(`\n═══ Processing: ${req.file.originalname} (${req.file.mimetype}, ${(req.file.size / 1024).toFixed(0)} KB) ═══`);

    const { text: rawText, confidence, fields } = await performOCR(req.file.buffer);

    if (!rawText || rawText.trim().length === 0) {
      console.warn('✗ No text detected by any OCR pass');
      return res.status(422).json({ error: 'No text detected in this document.' });
    }

    console.log('--- BEST OCR TEXT ---');
    console.log(rawText);
    console.log('--------------------');

    const parsedData = parseOCRText(rawText);

    if (!parsedData.firstName && !parsedData.idNumber && !parsedData.dob && !parsedData.father && !parsedData.mother && !parsedData.hemoglobin && !parsedData.rbc) {
      console.warn('✗ Could not extract any identifiable fields');
      return res.status(422).json({
        error: 'Could not extract valid information from this document. Please ensure the image is clear and is a supported document (e.g. Aadhaar Card, Birth Certificate, Blood Test Report).'
      });
    }

    console.log('✓ Extracted:', JSON.stringify(parsedData, null, 2));

    res.json({
      success: true,
      confidence: Math.round(confidence),
      data: parsedData
    });
  } catch (error) {
    console.error('Error during OCR processing:', error);
    res.status(500).json({ error: 'Failed to process document. Check backend logs.' });
  }
});


/* ═══════════════════════════════════════════════════════
   TEXT PARSING ENGINE
   ═══════════════════════════════════════════════════════ */

/**
 * Remove common OCR artefacts from a single field value.
 */
function cleanValue(val) {
  return (val || '')
    .replace(/[|`¢~©®™•°§¶{}\[\]<>_]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:\-./]+|[\s:\-./]+$/g, '')
    .trim();
}

/**
 * Master parse function — classifies the document and delegates.
 * @param {string} text   Raw OCR text
 * @param {boolean} silent  If true, suppress console logs (used during multi-pass eval)
 */
function parseOCRText(text, silent = false) {
  const result = {
    firstName: '', lastName: '', dob: '', gender: '',
    blood: '', father: '', mother: '', phone: '', idNumber: '',
    // CBC / Blood Report specific fields
    isBloodReport: false,
    hemoglobin: '',
    wbc: '',
    rbc: '',
    platelets: '',
    pcv: ''
  };

  const cleanText = text.replace(/[|`¢~©®™•°§¶]/g, '').trim();
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  // ── Document classification ──
  let docType = 'unknown';
  const headerText = lines.slice(0, 20).join(' ');

  if (/birth\s*certif|form\s*5|department\s*of\s*health|birth\s*(?:and|&)\s*death|जन्म\s*प्रमाण|registration\s*of\s*birth/i.test(headerText)) {
    docType = 'birth_certificate';
  } else if (/aadh[ae]+r|gov[eao]?r?n?ment\s*of\s*ind|unique\s*ident|uid|आधार|मेरा\s*आधार|भारत\s*सरकार|\d{4}\s\d{4}\s\d{4}/i.test(headerText)) {
    docType = 'aadhaar';
  } else if (/padmavathi|diagnostic|pathology|haemoglobin|w\.b\.c|rbc|platelets|cbc|cbp|blood\s*report|clinical|biological|interval/i.test(headerText)) {
    docType = 'blood_report';
  }

  // Secondary classification: if we see an Aadhaar number pattern anywhere, it's likely Aadhaar
  if (docType === 'unknown') {
    const fullText = lines.join(' ');
    if (/\b\d{4}\s\d{4}\s\d{4}\b/.test(fullText) && !/vid/i.test(fullText.split(/\d{4}\s\d{4}\s\d{4}/)[0].slice(-20))) {
      docType = 'aadhaar';
    } else if (/haemoglobin|w\.b\.c|cbc|cbp|platelets/i.test(fullText)) {
      docType = 'blood_report';
    }
  }

  if (!silent) console.log(`  Document type: ${docType}`);

  if (docType === 'birth_certificate') {
    parseBirthCertificate(cleanText, lines, result);
  } else if (docType === 'blood_report') {
    parseBloodReport(cleanText, lines, result);
  } else {
    parseAadhaarCard(cleanText, lines, result);
  }

  // ── Common fields ──
  parseCommonFields(cleanText, lines, result);

  // Clean all values
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') result[key] = cleanValue(result[key]);
  }

  return result;
}


/* ───────────────────────────────────────────────────────
   AADHAAR CARD PARSER
   ─────────────────────────────────────────────────────── */

function parseAadhaarCard(cleanText, lines, result) {
  // ── DOB ──
  // Handles: "Date of Birth/DOB: 26/01/1979", "DOB : 26/01/1979", "26/01/1979"
  const dobPatterns = [
    /(?:date\s*of\s*birth|d\.?o\.?b)\s*[:/.\-]?\s*(\d{1,2}[/\-.]?\s?\d{1,2}[/\-.]?\s?\d{4})/i,
    /(?:birth|year\s*of\s*birth|yob)\s*[:/.\-]?\s*(\d{1,2}[/\-.]?\s?\d{1,2}[/\-.]?\s?\d{4})/i,
    /\b(\d{2}\/\d{2}\/\d{4})\b/,
    /\b(\d{2}-\d{2}-\d{4})\b/,
    /\b(\d{2}\.\d{2}\.\d{4})\b/,
  ];
  for (const pat of dobPatterns) {
    const m = cleanText.match(pat);
    if (m) { result.dob = m[1].replace(/\s/g, '').trim(); break; }
  }

  // ── Gender ──
  if (/\bfemale\b/i.test(cleanText))           result.gender = 'Female';
  else if (/\bmale\b/i.test(cleanText))        result.gender = 'Male';
  else if (/\btransgender\b/i.test(cleanText)) result.gender = 'Transgender';

  // ── Aadhaar Number (12 digits) — skip VID (16 digits) ──
  for (const line of lines) {
    if (/vid|virtual/i.test(line)) continue;
    // Exactly 3 groups of 4 digits, NOT followed by more digits
    const m = line.match(/\b(\d{4}\s\d{4}\s\d{4})(?!\s*\d)/);
    if (m) { result.idNumber = m[1]; break; }
  }
  // Also try 12 consecutive digits (no spaces)
  if (!result.idNumber) {
    for (const line of lines) {
      if (/vid|virtual/i.test(line)) continue;
      const m = line.match(/(?<!\d)(\d{12})(?!\d)/);
      if (m) {
        const n = m[1];
        result.idNumber = `${n.slice(0,4)} ${n.slice(4,8)} ${n.slice(8)}`;
        break;
      }
    }
  }

  // ── Name ──
  const NON_NAME = /^(government|india|unique|identification|authority|aadhaar|aadhar|adhaar|sarkar|issue|date|enrol|download|help|your|to\s|the\s|www|http|vid|dob|female|male|birth|mera|meri|address|भारत|सरकार|आधार|मेरा|मेरी|पहचान)/i;

  const isNameCandidate = (s) => {
    s = s.replace(/^[^a-zA-Z]+/, '').trim();
    if (s.length < 4) return false;
    if (!/[a-zA-Z]/.test(s)) return false;
    // Must be mostly English letters, spaces, dots, and apostrophes
    const clean = s.replace(/[^a-zA-Z\s.']/g, '').trim();
    if (clean.length < s.length * 0.6) return false;       // too many non-letter chars
    // Remove leading noise words (1-2 char OCR artifacts like "ar", "S", etc.)
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    const meaningfulWords = words.filter(w => w.length >= 2);
    if (meaningfulWords.length < 2 || meaningfulWords.length > 6) return false;
    if (NON_NAME.test(clean)) return false;
    return true;
  };

  /** Strip leading short noise words from an OCR name line */
  const cleanNameLine = (s) => {
    s = s.replace(/^[^a-zA-Z]+/, '').trim();
    // Remove leading 1-2 char fragments (common OCR noise)
    const parts = s.split(/\s+/);
    while (parts.length > 2 && parts[0].length <= 2 && /^[^A-Z]/.test(parts[0])) {
      parts.shift();
    }
    // Also remove trailing 1 char fragments
    while (parts.length > 2 && parts[parts.length - 1].length <= 1) {
      parts.pop();
    }
    return parts.join(' ');
  };

  // Strategy 1: Line(s) immediately above the DOB line
  const dobLineIdx = lines.findIndex(l =>
    /dob|date\s*of\s*birth|birth|yob/i.test(l) || /\b\d{2}[/\-.]\d{2}[/\-.]\d{4}\b/.test(l)
  );
  if (dobLineIdx > 0) {
    for (let i = dobLineIdx - 1; i >= Math.max(0, dobLineIdx - 4); i--) {
      if (isNameCandidate(lines[i])) {
        setNameFields(cleanNameLine(lines[i]), result);
        break;
      }
    }
  }

  // Strategy 2: Explicit "Name:" label
  if (!result.firstName) {
    for (const line of lines) {
      const m = line.match(/(?:name|नाम)\s*[:\-]\s*(.+)/i);
      if (m && isNameCandidate(m[1])) {
        setNameFields(cleanNameLine(m[1]), result);
        break;
      }
    }
  }

  // Strategy 3: First name-like line after the header (skip first 2 lines)
  if (!result.firstName) {
    for (let i = 2; i < Math.min(lines.length, 12); i++) {
      if (isNameCandidate(lines[i])) {
        setNameFields(cleanNameLine(lines[i]), result);
        break;
      }
    }
  }

  // ── Father / Guardian (S/O, D/O, C/O, W/O) ──
  if (!result.father) {
    for (const line of lines) {
      const m = line.match(/(?:s\s*\/\s*o|d\s*\/\s*o|c\s*\/\s*o|w\s*\/\s*o|son\s*of|daughter\s*of|care\s*of|wife\s*of)\s*[:\-.]?\s*(.+)/i);
      if (m && m[1]) {
        const name = m[1].replace(/^[:\-.\s]+/, '').trim();
        if (name.length > 2 && /[a-zA-Z]/.test(name)) {
          result.father = name.replace(/[^a-zA-Z\s.']/g, '').trim();
          break;
        }
      }
    }
  }
  // Also try explicit "Father" / "Guardian" label
  if (!result.father) {
    for (const line of lines) {
      const m = line.match(/(?:father|guardian|parent)(?:'s)?(?:\s*name)?\s*[:\-.]?\s*(.+)/i);
      if (m && m[1]) {
        const name = m[1].trim();
        if (name.length > 2 && /[a-zA-Z]{2}/.test(name)) {
          result.father = name.replace(/[^a-zA-Z\s.']/g, '').trim();
          break;
        }
      }
    }
  }
}


/* ───────────────────────────────────────────────────────
   BLOOD REPORT PARSER
   ─────────────────────────────────────────────────────── */

function parseBloodReport(cleanText, lines, result) {
  result.isBloodReport = true;

  // ── Patient Name ──
  const nameLine = lines.find(l => /\bname\b/i.test(l));
  if (nameLine) {
    const m = nameLine.match(/\bname\s*[:\-]\s*(?:mr\.|mrs\.|ms\.)?\s*([a-zA-Z\s.]+)/i);
    if (m) {
      setNameFields(m[1].trim(), result);
    }
  }

  // ── Age / Gender ──
  const ageSexLine = lines.find(l => /\bage\s*&\s*sex\b/i.test(l) || /\bage\s*\/s*sex\b/i.test(l) || /\bage\s*sex\b/i.test(l));
  if (ageSexLine) {
    const m = ageSexLine.match(/age\s*(?:&|\/)?\s*sex\s*[:\-]\s*(\d+)\s*(?:years?|yr|mo)?\s*\|\s*(male|female|transgender)/i);
    if (m) {
      result.gender = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
      const age = parseInt(m[1], 10);
      const birthYear = new Date().getFullYear() - age;
      result.dob = `${birthYear}-01-01`; // Estimate DOB
    }
  }

  // ── Guardian / Father's name (mapped from referred by if matches) ──
  const refLine = lines.find(l => /\breferred\b/i.test(l));
  if (refLine) {
    const m = refLine.match(/referred\s*(?:by)?\s*[:\-]\s*(?:dr\.)?\s*([a-zA-Z\s.]+)/i);
    if (m) {
      result.father = m[1].replace(/[^a-zA-Z\s.']/g, '').trim();
    }
  }

  // ── Hemoglobin ──
  const hbLine = lines.find(l => /\bhaemoglobin\b/i.test(l) || /\bhemoglobin\b/i.test(l) || /\bhb\b/i.test(l));
  if (hbLine) {
    const m = hbLine.match(/(?:haemoglobin|hemoglobin|hb)\s*(\d+\.?\d*)/i);
    if (m) result.hemoglobin = m[1];
  }

  // ── WBC Count ──
  const wbcLine = lines.find(l => /\bw\.b\.c\b/i.test(l) || /\bwbc\b/i.test(l));
  if (wbcLine) {
    const m = wbcLine.match(/(?:total\s*)?(?:w\.b\.c|wbc)(?:\s*count)?\s*(\d+)/i);
    if (m) result.wbc = m[1];
  }

  // ── RBC Count ──
  const rbcLine = lines.find(l => /\br\.b\.c\b/i.test(l) || /\brbc\b/i.test(l));
  if (rbcLine) {
    const m = rbcLine.match(/(?:total\s*)?(?:r\.b\.c|rbc)(?:\s*count)?\s*(\d+\.?\d*)/i);
    if (m) result.rbc = m[1];
  }

  // ── Platelets Count ──
  const platLine = lines.find(l => /\bplatelet\b/i.test(l));
  if (platLine) {
    const m = platLine.match(/platelets?(?:\s*count)?\s*(\d+\.?\d*)/i);
    if (m) result.platelets = m[1];
  }

  // ── PCV ──
  const pcvLine = lines.find(l => /\bpcv\b/i.test(l));
  if (pcvLine) {
    const m = pcvLine.match(/pcv\s*(\d+\.?\d*)/i);
    if (m) result.pcv = m[1];
  }
}


/* ───────────────────────────────────────────────────────
   BIRTH CERTIFICATE PARSER
   ─────────────────────────────────────────────────────── */

function parseBirthCertificate(cleanText, lines, result) {
  // ── Registration Number ──
  const regPatterns = [
    /(?:registration\s*(?:no|number|#)|reg\.?\s*(?:no|number|#)|पंजीकरण\s*(?:संख्या|नं))\s*[:\-.]?\s*([\w\d\/-]+)/i,
    /(?:certificate\s*(?:no|number|#)|cert\.?\s*(?:no|number|#))\s*[:\-.]?\s*([\w\d\/-]+)/i,
    /(?:sl\.?\s*no|serial\s*(?:no|number))\s*[:\-.]?\s*([\w\d\/-]+)/i,
  ];
  for (const pat of regPatterns) {
    const m = cleanText.match(pat);
    if (m) { result.idNumber = m[1].trim(); break; }
  }

  // ── DOB ──
  const dobPatterns = [
    /(?:date\s*of\s*birth|dob|d\.?o\.?b|जन्म\s*(?:तिथि|दिनांक))\s*[:\-.]?\s*(\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{4})/i,
    /(?:date\s*of\s*birth|dob)\s*[:\-.]?\s*(\d{1,2}\s+[a-zA-Z]+\s+\d{4})/i,
    /(?:born\s*on)\s*[:\-.]?\s*(\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{4})/i,
    /\b(\d{2}\/\d{2}\/\d{4})\b/
  ];
  for (const pat of dobPatterns) {
    const m = cleanText.match(pat);
    if (m) { result.dob = m[1].trim(); break; }
  }

  // ── Gender ──
  const genderMatch = cleanText.match(/\b(?:sex|gender|लिंग)\s*[:\-.]?\s*(female|male|f|m|transgender|boy|girl)\b/i);
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    result.gender = (g.startsWith('f') || g === 'girl') ? 'Female'
                  : (g.startsWith('m') || g === 'boy')  ? 'Male'
                  : 'Transgender';
  }

  // ── Name of Child ──
  const childNamePatterns = [
    /(?:name\s*of\s*(?:the\s*)?child|child(?:'?s)?\s*name|बच्चे\s*का\s*नाम)\s*[:\-.]?\s*([a-zA-Z\s.]+)/i,
    /(?:student\s*name|name\s*of\s*(?:the\s*)?(?:baby|infant|new\s*born))\s*[:\-.]?\s*([a-zA-Z\s.]+)/i,
    /(?:^|\n)\s*name\s*[:\-.]?\s*([a-zA-Z\s.]+)/im,
  ];
  for (const pat of childNamePatterns) {
    const m = cleanText.match(pat);
    if (m) {
      let candidate = m[1].trim().split('\n')[0].trim();
      // Remove trailing noise
      candidate = candidate.replace(/\s*(date|dob|sex|gender|male|female|father|mother|birth).*/i, '').trim();
      if (candidate.length > 2 && !/^(male|female|date|sex)$/i.test(candidate)) {
        setNameFields(candidate, result);
        break;
      }
    }
  }

  // ── Father's Name ──
  const fatherPatterns = [
    /(?:(?:name\s*of\s*(?:the\s*)?)?father(?:'?s)?(?:\s*name)?|पिता\s*का\s*नाम)\s*[:\-.]?\s*([a-zA-Z\s.]+)/i,
  ];
  for (const pat of fatherPatterns) {
    const m = cleanText.match(pat);
    if (m) {
      let name = m[1].trim().split('\n')[0].trim();
      name = name.replace(/\s*(mother|address|place|occupation|date).*/i, '').trim();
      if (name.length > 2) { result.father = name; break; }
    }
  }

  // ── Mother's Name ──
  const motherPatterns = [
    /(?:(?:name\s*of\s*(?:the\s*)?)?mother(?:'?s)?(?:\s*name)?|माता\s*का\s*नाम)\s*[:\-.]?\s*([a-zA-Z\s.]+)/i,
  ];
  for (const pat of motherPatterns) {
    const m = cleanText.match(pat);
    if (m) {
      let name = m[1].trim().split('\n')[0].trim();
      name = name.replace(/\s*(father|address|place|occupation|date).*/i, '').trim();
      if (name.length > 2) { result.mother = name; break; }
    }
  }
}


/* ───────────────────────────────────────────────────────
   COMMON FIELD PARSERS
   ─────────────────────────────────────────────────────── */

function parseCommonFields(cleanText, lines, result) {
  // ── Phone Number ──
  if (!result.phone) {
    // Indian mobile: +91 XXXXX XXXXX or 10 digits starting with 6-9
    const phonePatterns = [
      /(?:phone|mobile|contact|tel|ph)\s*[:\-.]?\s*(\+?91[\s\-.]?\d{5}[\s\-.]?\d{5})/i,
      /(?:phone|mobile|contact|tel|ph)\s*[:\-.]?\s*(\d{10})/i,
      /\b(\+?91[\s\-.]?\d{5}[\s\-.]?\d{5})\b/,
      /\b([6-9]\d{9})\b/,
    ];
    for (const pat of phonePatterns) {
      const m = cleanText.match(pat);
      if (m) { result.phone = m[1].trim(); break; }
    }
  }

  // ── Blood Group ──
  if (!result.blood) {
    const bloodPatterns = [
      /(?:blood\s*(?:group|type|gr))\s*[:\-.]?\s*([AaBbOo][Bb]?\s?[+\-])/i,
      /\b([AaBbOo][Bb]?\s?(?:positive|negative|\+|\-))\b/i,
    ];
    for (const pat of bloodPatterns) {
      const m = cleanText.match(pat);
      if (m) {
        let blood = m[1].replace(/\s+/g, '').toUpperCase();
        blood = blood.replace('POSITIVE', '+').replace('NEGATIVE', '-');
        result.blood = blood;
        break;
      }
    }
  }
}


/* ───────────────────────────────────────────────────────
   HELPERS
   ─────────────────────────────────────────────────────── */

function setNameFields(fullName, result) {
  // Clean the name: keep only letters, spaces, dots, apostrophes
  fullName = fullName.replace(/[^a-zA-Z\s.']/g, '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    result.firstName = parts[0];
    result.lastName = parts.slice(1).join(' ');
  } else if (parts.length === 1) {
    result.firstName = parts[0];
    result.lastName = '';
  }
}

/* ───────────────────────────────────────────────────────
   DATABASE SYNC API
   ─────────────────────────────────────────────────────── */
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// GET /api/sync - Returns the entire database
app.get('/api/sync', (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return res.json(JSON.parse(data || '{}'));
    }
    return res.json({});
  } catch (err) {
    console.error('Failed to read db file:', err);
    return res.status(500).json({ error: 'Failed to read database' });
  }
});

// POST /api/sync - Merges and saves the database
app.post('/api/sync', (req, res) => {
  try {
    let serverData = {};
    if (fs.existsSync(DB_FILE)) {
      serverData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
    }

    const clientData = req.body || {};
    const mergedData = {};
    const keys = [
      'chm-children', 'chm-activity', 'chm-pending-docs', 'chm-documents', 'chm-growth',
      'chm-nutrition', 'chm-medicines', 'chm-appointments', 'chm-emergency',
      'chm-expenses', 'chm-alerts', 'chm-health-records'
    ];

    keys.forEach(k => {
      let hasServerVal = false;
      if (serverData[k]) {
        try {
          const parsed = JSON.parse(serverData[k]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            hasServerVal = true;
          } else if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            hasServerVal = true;
          } else if (typeof parsed === 'boolean' || typeof parsed === 'number') {
            hasServerVal = true;
          }
        } catch (e) {
          if (serverData[k].trim().length > 0) {
            hasServerVal = true;
          }
        }
      }

      if (hasServerVal) {
        mergedData[k] = serverData[k];
      } else {
        mergedData[k] = clientData[k] || null;
      }
    });

    fs.writeFileSync(DB_FILE, JSON.stringify(mergedData, null, 2), 'utf8');
    return res.json(mergedData);
  } catch (err) {
    console.error('Failed to write db file:', err);
    return res.status(500).json({ error: 'Failed to sync database' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Tesseract OCR server running on http://localhost:${PORT}`);
  console.log(`Preprocessing: sharp image enhancement enabled`);
  console.log(`Multi-pass: standard → low-light → aggressive → raw fallback`);
});
