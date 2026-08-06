/**
 * ocrParser.js
 * Image preprocessing and document parsing engine for OCR processing.
 */

const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const path = require('path');

/**
 * Preprocess a document image for OCR.
 */
async function preprocessImage(buffer, mode = 'standard') {
  const metadata = await sharp(buffer).metadata();
  let pipeline = sharp(buffer);

  pipeline = pipeline.rotate();
  pipeline = pipeline.grayscale();

  const targetWidth = mode === 'aggressive' ? 2500 : 1800;
  if (metadata.width && metadata.width < targetWidth) {
    const scale = Math.min(4, Math.ceil(targetWidth / metadata.width));
    pipeline = pipeline.resize({
      width: Math.round(metadata.width * scale),
      kernel: 'lanczos3'
    });
  }

  pipeline = pipeline.normalize();

  switch (mode) {
    case 'aggressive':
      pipeline = pipeline
        .sharpen(2.5)
        .linear(2.0, -128)
        .threshold(130);
      break;

    case 'brightened':
      pipeline = pipeline
        .modulate({ brightness: 1.6 })
        .sharpen(2.0)
        .linear(1.5, -64)
        .median(3);
      break;

    default: // 'standard'
      pipeline = pipeline
        .sharpen(1.5)
        .linear(1.4, -51)
        .median(3);
      break;
  }

  return pipeline.png().toBuffer();
}

function cleanValue(val) {
  return (val || '')
    .replace(/[|`¢~©®™•°§¶{}\[\]<>_]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:\-./]+|[\s:\-./]+$/g, '')
    .trim();
}

function setNameFields(fullName, result) {
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

function parseAadhaarCard(cleanText, lines, result) {
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

  if (/\bfemale\b/i.test(cleanText))           result.gender = 'Female';
  else if (/\bmale\b/i.test(cleanText))        result.gender = 'Male';
  else if (/\btransgender\b/i.test(cleanText)) result.gender = 'Transgender';

  for (const line of lines) {
    if (/vid|virtual/i.test(line)) continue;
    const m = line.match(/\b(\d{4}\s\d{4}\s\d{4})(?!\s*\d)/);
    if (m) { result.idNumber = m[1]; break; }
  }
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

  const NON_NAME = /^(government|india|unique|identification|authority|aadhaar|aadhar|adhaar|sarkar|issue|date|enrol|download|help|your|to\s|the\s|www|http|vid|dob|female|male|birth|mera|meri|address|भारत|सरकार|आधार|मेरा|मेरी|पहचान)/i;

  const isNameCandidate = (s) => {
    s = s.replace(/^[^a-zA-Z]+/, '').trim();
    if (s.length < 4) return false;
    if (!/[a-zA-Z]/.test(s)) return false;
    const clean = s.replace(/[^a-zA-Z\s.']/g, '').trim();
    if (clean.length < s.length * 0.6) return false;
    const words = clean.split(/\s+/).filter(w => w.length > 0);
    const meaningfulWords = words.filter(w => w.length >= 2);
    if (meaningfulWords.length < 2 || meaningfulWords.length > 6) return false;
    if (NON_NAME.test(clean)) return false;
    return true;
  };

  const cleanNameLine = (s) => {
    s = s.replace(/^[^a-zA-Z]+/, '').trim();
    const parts = s.split(/\s+/);
    while (parts.length > 2 && parts[0].length <= 2 && /^[^A-Z]/.test(parts[0])) {
      parts.shift();
    }
    while (parts.length > 2 && parts[parts.length - 1].length <= 1) {
      parts.pop();
    }
    return parts.join(' ');
  };

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

  if (!result.firstName) {
    for (const line of lines) {
      const m = line.match(/(?:name|नाम)\s*[:\-]\s*(.+)/i);
      if (m && isNameCandidate(m[1])) {
        setNameFields(cleanNameLine(m[1]), result);
        break;
      }
    }
  }

  if (!result.firstName) {
    for (let i = 2; i < Math.min(lines.length, 12); i++) {
      if (isNameCandidate(lines[i])) {
        setNameFields(cleanNameLine(lines[i]), result);
        break;
      }
    }
  }

  if (!result.father) {
    for (const line of lines) {
      const m = line.match(/(?:s\s*\/\s*o|d\s*\/\s*o|c\s*\/\s*o|w\s*\/\s*o|son\s*of|daughter\s*of|care\s*of|wife\s*of)\s*[:\-.]?\s*([^,\n\r]+)/i);
      if (m && m[1]) {
        const name = m[1].replace(/^[:\-.\s]+/, '').trim();
        if (name.length > 2 && /[a-zA-Z]/.test(name)) {
          result.father = name.replace(/[^a-zA-Z\s.']/g, '').trim();
          break;
        }
      }
    }
  }
}

function parseBloodReport(cleanText, lines, result) {
  result.isBloodReport = true;

  const nameLine = lines.find(l => /\bname\b/i.test(l));
  if (nameLine) {
    const m = nameLine.match(/\bname\s*[:\-]\s*(?:mr\.|mrs\.|ms\.)?\s*([a-zA-Z\s.]+)/i);
    if (m) setNameFields(m[1].trim(), result);
  }

  const hbLine = lines.find(l => /\bhaemoglobin\b/i.test(l) || /\bhemoglobin\b/i.test(l) || /\bhb\b/i.test(l));
  if (hbLine) {
    const m = hbLine.match(/(?:haemoglobin|hemoglobin|hb)\s*(\d+\.?\d*)/i);
    if (m) result.hemoglobin = m[1];
  }

  const wbcLine = lines.find(l => /\bw\.b\.c\b/i.test(l) || /\bwbc\b/i.test(l));
  if (wbcLine) {
    const m = wbcLine.match(/(?:total\s*)?(?:w\.b\.c|wbc)(?:\s*count)?\s*(\d+)/i);
    if (m) result.wbc = m[1];
  }

  const rbcLine = lines.find(l => /\br\.b\.c\b/i.test(l) || /\brbc\b/i.test(l));
  if (rbcLine) {
    const m = rbcLine.match(/(?:total\s*)?(?:r\.b\.c|rbc)(?:\s*count)?\s*(\d+\.?\d*)/i);
    if (m) result.rbc = m[1];
  }

  const platLine = lines.find(l => /\bplatelet\b/i.test(l));
  if (platLine) {
    const m = platLine.match(/platelets?(?:\s*count)?\s*(\d+\.?\d*)/i);
    if (m) result.platelets = m[1];
  }

  const pcvLine = lines.find(l => /\bpcv\b/i.test(l));
  if (pcvLine) {
    const m = pcvLine.match(/pcv\s*(\d+\.?\d*)/i);
    if (m) result.pcv = m[1];
  }
}

function parseBirthCertificate(cleanText, lines, result) {
  const dobPatterns = [
    /(?:date\s*of\s*birth|dob|d\.?o\.?b|जन्म\s*(?:तिथि|दिनांक))\s*[:\-.]?\s*(\d{1,2}[/\-.\s]\d{1,2}[/\-.\s]\d{4})/i,
    /\b(\d{2}\/\d{2}\/\d{4})\b/
  ];
  for (const pat of dobPatterns) {
    const m = cleanText.match(pat);
    if (m) { result.dob = m[1].trim(); break; }
  }

  const genderMatch = cleanText.match(/\b(?:sex|gender|लिंग)\s*[:\-.]?\s*(female|male|f|m|transgender|boy|girl)\b/i);
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    result.gender = (g.startsWith('f') || g === 'girl') ? 'Female'
                  : (g.startsWith('m') || g === 'boy')  ? 'Male'
                  : 'Transgender';
  }

  const childNamePatterns = [
    /(?:name\s*of\s*(?:the\s*)?child|child(?:'?s)?\s*name|बच्चे\s*का\s*नाम)\s*[:\-.]?\s*([a-zA-Z\s.]+)/i,
    /(?:^|\n)\s*name\s*[:\-.]?\s*([a-zA-Z\s.]+)/im,
  ];
  for (const pat of childNamePatterns) {
    const m = cleanText.match(pat);
    if (m) {
      let candidate = m[1].trim().split('\n')[0].trim();
      candidate = candidate.replace(/\s*(date|dob|sex|gender|male|female|father|mother|birth).*/i, '').trim();
      if (candidate.length > 2 && !/^(male|female|date|sex)$/i.test(candidate)) {
        setNameFields(candidate, result);
        break;
      }
    }
  }
}

function parseCommonFields(cleanText, lines, result) {
  if (!result.phone) {
    const phonePatterns = [
      /(?:phone|mobile|contact|tel|ph)\s*[:\-.]?\s*(\+?91[\s\-.]?\d{5}[\s\-.]?\d{5})/i,
      /(?:phone|mobile|contact|tel|ph)\s*[:\-.]?\s*(\d{10})/i,
      /\b([6-9]\d{9})\b/,
    ];
    for (const pat of phonePatterns) {
      const m = cleanText.match(pat);
      if (m) { result.phone = m[1].trim(); break; }
    }
  }

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

function parseOCRText(text, silent = false) {
  const result = {
    firstName: '', lastName: '', dob: '', gender: '',
    blood: '', father: '', mother: '', phone: '', idNumber: '',
    isBloodReport: false, hemoglobin: '', wbc: '', rbc: '', platelets: '', pcv: ''
  };

  const cleanText = text.replace(/[|`¢~©®™•°§¶]/g, '').trim();
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  let docType = 'unknown';
  const headerText = lines.slice(0, 20).join(' ');

  if (/birth\s*certif|form\s*5|department\s*of\s*health|birth\s*(?:and|&)\s*death|registration\s*of\s*birth/i.test(headerText)) {
    docType = 'birth_certificate';
  } else if (/aadh[ae]+r|gov[eao]?r?n?ment\s*of\s*ind|unique\s*ident|uid|आधार|\d{4}\s\d{4}\s\d{4}/i.test(headerText)) {
    docType = 'aadhaar';
  } else if (/haemoglobin|w\.b\.c|rbc|platelets|cbc|cbp|blood\s*report/i.test(headerText)) {
    docType = 'blood_report';
  }

  if (!silent) console.log(`  Document type: ${docType}`);

  if (docType === 'birth_certificate') {
    parseBirthCertificate(cleanText, lines, result);
  } else if (docType === 'blood_report') {
    parseBloodReport(cleanText, lines, result);
  } else {
    parseAadhaarCard(cleanText, lines, result);
  }

  parseCommonFields(cleanText, lines, result);

  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') result[key] = cleanValue(result[key]);
  }

  return result;
}

function countExtractedFields(parsed) {
  return ['firstName', 'idNumber', 'dob', 'gender', 'father', 'mother', 'phone', 'hemoglobin', 'rbc', 'wbc', 'platelets']
    .filter(k => parsed[k] && String(parsed[k]).trim().length > 0).length;
}

async function performTesseractOCR(buffer, appRootDir) {
  const passes = [
    { mode: 'standard',   label: 'standard enhancement' },
    { mode: 'brightened', label: 'low-light brightening' },
    { mode: 'aggressive', label: 'aggressive binarisation' },
  ];

  let bestText = '';
  let bestConfidence = 0;
  let bestFields = 0;

  for (const pass of passes) {
    try {
      const processed = await preprocessImage(buffer, pass.mode);
      const result = await Tesseract.recognize(processed, 'eng', { langPath: appRootDir });
      const text = result.data.text || '';
      const confidence = result.data.confidence || 0;
      const parsed = parseOCRText(text, true);
      const fields = countExtractedFields(parsed);

      if (fields > bestFields || (fields === bestFields && confidence > bestConfidence)) {
        bestText = text;
        bestConfidence = confidence;
        bestFields = fields;
      }

      if (confidence > 75 && fields >= 3) break;
    } catch (err) {
      console.warn(`[OCR] ${pass.label} warning:`, err.message);
    }
  }

  if (bestFields < 2) {
    try {
      const result = await Tesseract.recognize(buffer, 'eng', { langPath: appRootDir });
      const text = result.data.text || '';
      const confidence = result.data.confidence || 0;
      const parsed = parseOCRText(text, true);
      const fields = countExtractedFields(parsed);

      if (fields > bestFields || (fields === bestFields && confidence > bestConfidence)) {
        bestText = text;
        bestConfidence = confidence;
        bestFields = fields;
      }
    } catch (err) {
      console.warn('[OCR] Raw pass warning:', err.message);
    }
  }

  return { text: bestText, confidence: bestConfidence, fields: bestFields };
}

async function performOCR(buffer, visionClient, appRootDir) {
  if (visionClient) {
    try {
      const [result] = await visionClient.documentTextDetection(buffer);
      const fullTextAnnotation = result.fullTextAnnotation;
      const text = fullTextAnnotation ? fullTextAnnotation.text : '';
      let confidence = 95;
      if (fullTextAnnotation?.pages?.[0]) {
        confidence = (fullTextAnnotation.pages[0].confidence || 0.95) * 100;
      }
      const parsed = parseOCRText(text, true);
      const fields = countExtractedFields(parsed);
      return { text, confidence, fields };
    } catch (err) {
      console.warn('[OCR] Vision API fallback to Tesseract:', err.message);
    }
  }
  return performTesseractOCR(buffer, appRootDir);
}

module.exports = {
  preprocessImage,
  parseOCRText,
  performTesseractOCR,
  performOCR,
  countExtractedFields
};
