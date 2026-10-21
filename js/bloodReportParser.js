/**
 * bloodReportParser.js
 * Finds blood count values in the text of a lab report, whatever the lab's
 * layout. Pure functions only; reading the PDF or image is reportReader.js.
 *
 * Labs name, order and format the same test differently ("Haemoglobin",
 * "Hb", "HGB"; platelets in lakhs, x10³/µL or /cumm), so each test is found by
 * its names, and every number is checked against what is possible for that
 * test before it is used. A value that cannot be read with confidence is left
 * blank: the person checks the form before anything is saved.
 *
 * Output keys match the blood test form and the Blood Test Reports sheet
 * (js/server/bloodTestRegister.js), in the form's units.
 */

/**
 * A number as printed: 13.2, 7,500, 2,50,000 (Indian grouping) or .5, possibly
 * with a high/low flag stuck to it ("12.4L", "11.0H*").
 */
const NUMBER = /(?<![\w.])(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d*\.\d+|\d+)(?=[HL]?\*?(?!\w))/g;

/** Reference intervals and limits, which must never be read as the result. */
const RANGE = /(\d*\.?\d+)\s*(?:-|–|—|to)\s*(\d*\.?\d+)/gi;
const LIMIT = /(?:<|>|≤|≥|<=|>=|upto|up to|less than|more than)\s*\d*\.?\d+/gi;

/** Multipliers printed in units, e.g. x10^3/µL, 10³/cumm, 10*9/L, which are not results. */
// OCR often reads the caret as 7, ' or ° ("x10^3" → "x1073"), so after an "x" those count too.
const EXPONENT = /(?:[x×*]\s*10\s*(?:\^|\*\*?|e|7|'|°|")?\s*[369³⁶⁹](?!\d)|[x×]\s*10\s*[%^*'°"](?:\s*[369](?!\d))?|\b10\s*(?:\^|\*\*?)\s*[369](?!\d)|\b10[³⁶⁹](?!\d))/gi;

const SUPERSCRIPT = { '³': '3', '⁶': '6', '⁹': '9' };

/**
 * Each test: the names labs print, names that look alike but are other tests,
 * and how to turn a printed number into the form's unit (null when impossible).
 */
/*
 * toUnit returns the value in the form's unit, or null when the printed number
 * cannot be that test in the printed unit. The limits are what a report can
 * really show (beyond them a misread is far likelier than the result), so a
 * number outside them is never filled in; the person types it.
 */
const TESTS = [
  {
    key: 'hemoglobin',
    names: /\b(?:ha?emoglobin|hgb|hb)\b/i,
    not: /mean\s+cell|mean\s+corpuscular|\bmch|glyc|a1c|electrophoresis|\bhb\s*[af]\d?\b|plasma/i,
    toUnit: (n, unit) => {
      // Sahli's method gives a percentage of normal, not g/dL ("gm%" is g/dL).
      if (/%/.test(unit) && !/g(?:m|ms)?\s*%/i.test(unit)) return null;
      const perLitre = /g\s*\/\s*l\b/i.test(unit) && !/d\s*l/i.test(unit);
      if (perLitre) return n >= 30 && n <= 220 ? round(n / 10, 1) : null;
      return n >= 3 && n <= 22 ? n : null;
    }
  },
  {
    key: 'wbc',
    names: /\b(?:total\s+)?(?:w\.?\s?b\.?\s?c\.?(?:\s*count)?|white\s+(?:blood\s+)?cells?(?:\s+count)?|total\s+leu[ck]ocytes?(?:\s+count)?|t\.?\s?l\.?\s?c\.?|leu[ck]ocytes?(?:\s+count)?|total\s+count|t\.?c\.?(?=\s*[:\-]))\b/i,
    not: /morpholog|differential|\bdlc\b|absolute|\bseries\b|urine|stool|esterase|pus\s+cells|cholesterol|hdl|ldl|mg\s*\/\s*dl/i,
    toUnit: (n, unit) => {
      if (/lakh/i.test(unit)) return null;
      // Thousands per µL (x10³/µL, thou/mm3, 10⁹/L): 0.5 to 50.
      if (thousandsUnit(unit)) return n >= 0.5 && n <= 50 ? Math.round(n * 1000) : null;
      if (perCummUnit(unit)) return n >= 500 && n <= 50000 ? Math.round(n) : null;
      // No readable unit: counts are printed in full (7800) or in thousands
      // (7.8); a three-digit number is a lost decimal point, not a count.
      if (n >= 2000 && n <= 50000) return Math.round(n);
      if (n >= 0.5 && n <= 50) return Math.round(n * 1000);
      return null;
    }
  },
  {
    key: 'platelets',
    names: /\b(?:platelets?(?:\s+count)?|plt(?:\s+count)?|thrombocytes?(?:\s+count)?)\b/i,
    not: /mean\s+platelet|\bmpv\b|\bpdw\b|plateletcrit|\bpct\b|large|adequa|morpholog|clump|distribution|ratio|p-?lcr|on\s+smear/i,
    toUnit: (n, unit) => {
      if (/lakh|lac\b/i.test(unit)) return n >= 0.1 && n <= 15 ? round(n, 2) : null;
      if (thousandsUnit(unit)) return n >= 10 && n <= 1500 ? round(n / 100, 2) : null;
      if (perCummUnit(unit)) return n >= 10000 && n <= 1500000 ? round(n / 100000, 2) : null;
      if (n >= 10000 && n <= 1500000) return round(n / 100000, 2);
      if (n >= 10 && n <= 1500) return round(n / 100, 2);
      if (n >= 0.1 && n <= 15) return round(n, 2);
      return null;
    }
  },
  {
    key: 'rbc',
    names: /\b(?:total\s+)?(?:r\.?\s?b\.?\s?c\.?(?:\s*count)?|red\s+(?:blood\s+)?cells?(?:\s+count)?|erythrocytes?(?:\s+count)?)\b/i,
    not: /morpholog|distribution|\brdw|nucleated|\bnrbc|indices|urine|stool|series|on\s+smear|sedimentation|\besr\b/i,
    toUnit: (n) => {
      if (n >= 1.5 && n <= 8) return round(n, 2);
      if (n >= 1500000 && n <= 8000000) return round(n / 1000000, 2); // /cumm
      return null;
    }
  },
  {
    key: 'pcv',
    names: /\b(?:p\.?\s?c\.?\s?v\.?|packed\s+cell\s+volume|ha?ematocrit|hct)\b/i,
    not: /mean/i,
    toUnit: (n) => {
      if (n >= 10 && n <= 65) return n;
      if (n >= 0.1 && n <= 0.65) return round(n * 100, 1); // L/L
      return null;
    }
  },
  percentTest('neutrophil', /\b(?:neutrophils?|polymorphs?|segmented(?:\s+neutrophils?)?|polys)\b/i, 98),
  percentTest('lymphocytes', /\blymphocytes?\b/i, 95, /atypical|reactive/i),
  percentTest('eosinophils', /\beosinophils?\b/i, 30),
  percentTest('monocytes', /\bmonocytes?\b/i, 25),
  percentTest('basophils', /\bbasophils?\b/i, 5)
];

const DIFFERENTIAL = ['neutrophil', 'lymphocytes', 'eosinophils', 'monocytes', 'basophils'];

/**
 * Red cell indices. They are not stored, but labs compute them from Hb, PCV
 * and RBC, so they show when one of those three was misread.
 */
const INDICES = [
  { key: 'mcv', names: /\b(?:mcv|mean\s+(?:corpuscular|cell)\s+volume)\b/i, not: /platelet/i, toUnit: n => (n >= 50 && n <= 130 ? n : null) },
  { key: 'mch', names: /\b(?:mch(?!c)|mean\s+(?:corpuscular|cell)\s+ha?emoglobin(?!\s+conc))\b/i, not: /conc/i, toUnit: n => (n >= 15 && n <= 45 ? n : null) },
  { key: 'mchc', names: /\b(?:mchc|mean\s+(?:corpuscular|cell)\s+(?:ha?emoglobin|hb)\s+conc\w*)\b/i, toUnit: n => (n >= 25 && n <= 40 ? n : null) }
];

/** Thousands per µL: x10³/µL, 10^3/uL, thou/mm3, K/µL, 10⁹/L (OCR often mangles the caret). */
function thousandsUnit(unit) {
  return /thou|\bk\s*\/|10\s*(?:\^|\*|7|'|°|%)?\s*[39]\b|x\s*10\s*\S?\s*[39]|[x×]\s*10\s*[%^*'°]|10[³⁹]|\/\s*n\s*l\b/i.test(unit);
}

/** Cells per µL counted one by one: /cumm, /cmm, /µL, cells/cu.mm, with no multiplier. */
function perCummUnit(unit) {
  return /cu\.?\s*mm|c\.?mm|\/\s*[µu]l|\/\s*mm3|cells/i.test(unit) && !thousandsUnit(unit) && !/lakh|lac\b|mill/i.test(unit);
}

/**
 * A differential count, which the form takes as a percentage, never an
 * absolute count. The upper limits are the most a report really shows.
 */
function percentTest(key, names, max, extraNot) {
  return {
    key,
    names,
    not: new RegExp(`absolute|\\babs\\b|\\ba[nlemb]c\\b|count\\s*\\(abs${extraNot ? `|${extraNot.source}` : ''}`, 'i'),
    toUnit: (n, unit) => {
      // An absolute count (x10⁹/L, /cumm) is not the percentage the form takes.
      if (!/%/.test(unit) && (thousandsUnit(unit) || perCummUnit(unit) || /\/\s*[li1]\b|x\s*10|\bcells\b/i.test(unit))) return null;
      return n >= 0 && n <= max ? n : null;
    }
  };
}

/** Text findings from the peripheral smear, copied as written. */
const SMEAR_FINDINGS = [
  { key: 'rbcMorphology', names: /\b(?:rbc|r\.b\.c\.?|red\s+(?:blood\s+)?cells?)\s*(?:morphology|:)/i },
  { key: 'wbcMorphology', names: /\b(?:wbc|w\.b\.c\.?|white\s+(?:blood\s+)?cells?|leu[ck]ocytes?)\s*(?:morphology|:)/i },
  { key: 'plateletsAdequacy', names: /\bplatelets?\s*(?:adequacy|on\s+smear|morphology|:)/i }
];

function round(n, places) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Repair common OCR slips inside numbers: O→0, l/I→1, and "13 .2" → "13.2". */
function repairNumbers(line) {
  return line
    .replace(/(\d)[.,]{2,}(\d)/g, '$1,$2') // "2.,80,000" → "2,80,000"
    .replace(/(?<=\d)[oO](?=[\d.\s]|$)|(?<=\d[.,])[oO]/g, '0')
    .replace(/(?<=\d)[lI](?=\d)|(?<=\s)[lI](?=\d)/g, '1')
    .replace(/(\d)\s+\.\s*(\d)/g, '$1.$2')
    .replace(/(\d)\.\s+(\d)/g, '$1.$2');
}

/** The part of a line after the test's name, with ranges, limits and unit exponents taken out. */
function valueText(rest) {
  // Blanked to the same length, so positions still match the printed line.
  const blank = s => ' '.repeat(s.length);
  return rest
    .replace(EXPONENT, blank)
    .replace(RANGE, blank)
    .replace(LIMIT, blank)
    .replace(/\(\s*[a-z]{1,8}\s*\)/gi, blank); // "(Hb)", "(PCV)" after the name
}

/**
 * The unit printed with a result: the text between the name and the number,
 * and after the number up to the next column holding a number or range, so a
 * unit named in the reference range column ("1.5-4.5 lakhs") is not taken.
 */
function unitAround(rest, cleaned, index, token) {
  const after = index + token.length;
  let end = rest.length;
  const nextDigit = cleaned.slice(after).search(/\d/);
  if (nextDigit >= 0) end = after + nextDigit;
  RANGE.lastIndex = 0;
  let r;
  while ((r = RANGE.exec(rest))) {
    if (r.index >= after) { end = Math.min(end, r.index); break; }
  }
  return rest.slice(0, index) + ' ' + rest.slice(after, end);
}

/** Method and flag columns some labs print between the name and the result. */
const METHOD_WORDS = /^(?:photometr\w*|calculat\w*|impedance|cytometr\w*|flow|microscop\w*|derived|sls|colorimetr\w*|spectrophotometr\w*|electrical|optical|hydrodynamic|focusing|coulter|fluorescen\w*|manual|smear|counter|analy[sz]er|vcs|high|low|normal|abnormal)$/i;

/** Words that may sit between a test's name and its result ("RBC Count 4.5"). */
const LABEL_WORDS = /^(?:count|level|result|value|total|conc|concentration|estimation|automated|whole|blood|cells?|by|method|tests?)$/i;

/**
 * The first number in the text as { n, token }, or null. Words other than
 * label words before it mean the name is part of a sentence, not a result.
 */
function firstNumber(text) {
  NUMBER.lastIndex = 0;
  const m = NUMBER.exec(text);
  if (!m) return null;
  const between = text.slice(0, m.index);
  // "?" is a number OCR could not read with confidence: the result is unknown,
  // and a later number on the line (a range, a previous result) must not stand in.
  if (/(?:^|\s)\?(?=\s|$)/.test(between)) return null;
  const words = between.split(/[\s:|=]+/).filter(w => /^[a-z]{2,}$/i.test(w));
  const unknown = words.filter(w => !LABEL_WORDS.test(w) && !METHOD_WORDS.test(w));
  // A short column (method, flag) set apart by a wide gap is still a table row.
  if (unknown.length && !(/\s{2,}/.test(between) && words.length <= 3)) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? { n, token: m[1], index: m.index } : null;
}

/**
 * The printed number cannot be the result. OCR often loses a decimal point
 * ("12.4" read as "124"), so when the token is plain digits and exactly one
 * place for the point gives a possible result, that is the reading; if none
 * or several do, there is no reading.
 */
function recoverDecimal(token, toUnit, unit) {
  if (!/^\d{2,4}$/.test(token)) return null;
  const options = [];
  for (let places = 1; places < token.length; places++) {
    const value = toUnit(Number(token) / 10 ** places, unit);
    if (value !== null && value !== undefined) options.push(value);
  }
  return options.length === 1 ? options[0] : null;
}

/** Unit words and exponents printed on the line, used to convert the result. */
function unitHint(rest) {
  return rest.replace(/[³⁶⁹]/g, s => SUPERSCRIPT[s]);
}

/** Lines of text, tidied: OCR number slips fixed and runs of spaces kept as a column gap. */
function toLines(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map(l => repairNumbers(l.replace(/\t/g, '   ')).trim())
    .filter(Boolean);
}

/**
 * Find one test in the report. The name must start the line or a column (labs
 * put the test name first), and the result is the first number after it that
 * is not part of a reference range and is possible for that test. When the
 * result sits on the next line (some table layouts), that line is used.
 */
function findTest(lines, test) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = test.names.exec(line);
    if (!m) continue;
    const before = line.slice(0, m.index);
    // Names inside sentences ("...low haemoglobin may indicate...") are not results.
    if (before.trim() && !/\s{2,}$|[|:]\s*$/.test(before) && before.trim().split(/\s+/).length > 2) continue;
    const label = line.slice(0, m.index + m[0].length);
    if (test.not && test.not.test(line)) continue;
    let rest = line.slice(m.index + m[0].length);
    let cleaned = valueText(rest);
    let num = firstNumber(cleaned);
    if (num === null && i + 1 < lines.length && /^\s*[<>]?\s*\d/.test(lines[i + 1]) && !TESTS.some(t => t.names.test(lines[i + 1]))) {
      rest = lines[i + 1];
      cleaned = valueText(rest);
      num = firstNumber(cleaned);
    }
    if (num === null) continue;
    const unit = unitHint(unitAround(rest, cleaned, num.index, num.token) + ' ' + label);
    let value = test.toUnit(num.n, unit);
    let recovered = false;
    if (value === null || value === undefined) {
      value = recoverDecimal(num.token, test.toUnit, unit);
      recovered = value !== null;
    }
    if (value !== null && value !== undefined) return { value, line, token: num.token, recovered };
  }
  return null;
}

/**
 * The five differential percentages add up to 100 (a report may leave out a
 * few percent of other cells). When they do not, one of them was misread: if a
 * single lost decimal point explains it, that is fixed; otherwise none of them
 * can be trusted and all are left blank.
 */
function checkDifferential(found, ocr) {
  const keys = DIFFERENTIAL.filter(k => found[k]);
  if (keys.length < 3) {
    // From OCR, one or two values alone means the rest could not be read, and
    // they cannot be checked. A PDF's own text is exact; it only must not exceed 100.
    const total = keys.reduce((s, k) => s + found[k].value, 0);
    if (ocr || total > 101) keys.forEach(k => { delete found[k]; });
    return;
  }
  const sum = list => list.reduce((s, k) => s + found[k].value, 0);
  const total = sum(keys);
  const fits = t => (keys.length === 5 ? t >= 97 && t <= 103 : t >= 85 && t <= 103);
  if (fits(total)) return;
  const fixes = [];
  keys.forEach(k => {
    const token = found[k].token || '';
    if (!/^\d{2,3}$/.test(token)) return;
    [10, 100].forEach(div => {
      const v = Number(token) / div;
      const t = total - found[k].value + v;
      if (keys.length === 5 ? t >= 99 && t <= 101 : t >= 90 && t <= 101) fixes.push({ k, v });
    });
  });
  if (fixes.length === 1) {
    found[fixes[0].k] = { ...found[fixes[0].k], value: fixes[0].v, recovered: true };
  } else {
    keys.forEach(k => { delete found[k]; });
  }
}

/**
 * Hb, PCV and RBC must agree with the indices printed beside them:
 * MCHC = Hb/PCV x 100, MCV = PCV/RBC x 10, MCH = Hb/RBC x 10. A value in
 * every relation that fails is the misread one and is left blank; when the
 * failures do not single one out, all three are. Without printed indices,
 * the two are still checked against the range MCHC always falls in.
 */
function checkRedCellValues(found, indices) {
  const hb = found.hemoglobin && found.hemoglobin.value;
  const pcv = found.pcv && found.pcv.value;
  const rbc = found.rbc && found.rbc.value;
  const relations = [];
  if (hb && pcv) relations.push({ uses: ['hemoglobin', 'pcv'], ok: indices.mchc ? Math.abs(hb / pcv * 100 - indices.mchc) <= 1.6 : hb / pcv * 100 >= 26 && hb / pcv * 100 <= 39 });
  if (pcv && rbc) relations.push({ uses: ['pcv', 'rbc'], ok: indices.mcv ? Math.abs(pcv / rbc * 10 - indices.mcv) <= 3 : pcv / rbc * 10 >= 55 && pcv / rbc * 10 <= 125 });
  if (hb && rbc) relations.push({ uses: ['hemoglobin', 'rbc'], ok: indices.mch ? Math.abs(hb / rbc * 10 - indices.mch) <= 1.6 : hb / rbc * 10 >= 16 && hb / rbc * 10 <= 42 });
  const failed = relations.filter(r => !r.ok);
  if (!failed.length) return;
  const suspects = ['hemoglobin', 'pcv', 'rbc'].filter(k => found[k]
    && failed.every(r => r.uses.includes(k))
    && relations.filter(r => r.ok).every(r => !r.uses.includes(k)));
  const drop = suspects.length === 1 ? suspects : [...new Set(failed.flatMap(r => r.uses))];
  drop.forEach(k => { delete found[k]; });
}

/**
 * Handwritten and hospital reports often give the differential count on one
 * line: "DC: P 72 L 22 E 04 M 02 B 00" or "N60 L30 E5 M5 B0". Used only for
 * counts not found on lines of their own, and only when the line reads as a
 * differential: three or more counts, adding up to about 100 when all five are given.
 */
const COMPACT_KEYS = { P: 'neutrophil', N: 'neutrophil', L: 'lymphocytes', E: 'eosinophils', M: 'monocytes', B: 'basophils' };

function findCompactDifferential(lines) {
  for (const line of lines) {
    const pairs = {};
    const re = /(?:^|[\s:,;|(])([PNLEMB])\s*[-:.=]?\s*(\d{1,2}(?:\.\d)?)(?![\d.])(?!\s*(?:mg|g\/|gm|mm|cells|\/|x\s*10|lakh))/g;
    let m;
    while ((m = re.exec(line))) {
      const key = COMPACT_KEYS[m[1]];
      if (!(key in pairs)) pairs[key] = Number(m[2]);
    }
    const keys = Object.keys(pairs);
    if (keys.length < 3 || !('neutrophil' in pairs) || !('lymphocytes' in pairs)) continue;
    const total = keys.reduce((sum, k) => sum + pairs[k], 0);
    if (keys.length === 5 && (total < 90 || total > 110)) continue;
    if (total > 110) continue;
    return { pairs, line };
  }
  return null;
}

/** Words smear findings are written in, to undo OCR misspellings ("nhormochromic"). */
const SMEAR_WORDS = [
  'normocytic', 'normochromic', 'microcytic', 'macrocytic', 'hypochromic', 'hyperchromic', 'dimorphic',
  'anisocytosis', 'poikilocytosis', 'anisopoikilocytosis', 'polychromasia', 'spherocytes', 'target',
  'elliptocytes', 'schistocytes', 'adequate', 'inadequate', 'reduced', 'increased', 'decreased', 'normal',
  'within', 'limits', 'number', 'morphology', 'distribution', 'clumps', 'clumping', 'giant', 'platelets',
  'leucocytosis', 'leukocytosis', 'leucopenia', 'leukopenia', 'neutrophilia', 'lymphocytosis', 'eosinophilia',
  'thrombocytopenia', 'thrombocytosis', 'mature', 'immature', 'atypical', 'cells', 'seen', 'present', 'absent',
  'mild', 'moderate', 'severe', 'predominantly', 'smear', 'parasites', 'hemoparasites', 'haemoparasites'
];

function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

/** Replace a long word one or two letters away from exactly one known smear word with that word. */
function correctSmearText(text) {
  return text.replace(/[A-Za-z]{5,}/g, word => {
    const lower = word.toLowerCase();
    if (SMEAR_WORDS.includes(lower)) return word;
    const close = SMEAR_WORDS.filter(w => Math.abs(w.length - lower.length) <= 2 && editDistance(w, lower) <= (lower.length >= 10 ? 2 : 1));
    if (close.length !== 1) return word;
    const fixed = close[0];
    return word[0] === word[0].toUpperCase() ? fixed[0].toUpperCase() + fixed.slice(1) : fixed;
  });
}

function findSmear(lines, finding) {
  for (const line of lines) {
    const m = finding.names.exec(line);
    if (!m) continue;
    const text = line.slice(m.index + m[0].length).replace(/^[\s:\-–]+/, '').replace(/\s{2,}.*$/, '').trim().replace(/[.;,]+$/, '');
    if (text && /[a-z]/i.test(text) && text.length <= 120 && !/^\d/.test(text)) return { value: correctSmearText(text), line };
  }
  return null;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

function isoDate(y, mo, d) {
  y = Number(y); mo = Number(mo); d = Number(d);
  if (y < 100) y += 2000;
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 1990 && y <= 2100)) return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return new Date(iso + 'T00:00:00Z').getUTCDate() === d ? iso : null;
}

/** Every date in a piece of text, as YYYY-MM-DD. Numeric dates are read day first (Indian labs). */
function datesIn(text) {
  const out = [];
  const re = /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})|(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})|(\d{1,2})(?:st|nd|rd|th)?[\s\-\/]*([a-z]{3,9})[,\s\-\/]*(\d{2,4})|([a-z]{3,9})[\s\-]+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi;
  let m;
  while ((m = re.exec(text))) {
    let iso = null;
    if (m[1]) iso = isoDate(m[1], m[2], m[3]);
    else if (m[4]) iso = isoDate(m[6], m[5], m[4]);
    else if (m[7]) iso = MONTHS[m[8].slice(0, 4).toLowerCase()] || MONTHS[m[8].slice(0, 3).toLowerCase()] ? isoDate(m[9], MONTHS[m[8].slice(0, 4).toLowerCase()] || MONTHS[m[8].slice(0, 3).toLowerCase()], m[7]) : null;
    else if (m[10]) iso = MONTHS[m[10].slice(0, 3).toLowerCase()] ? isoDate(m[12], MONTHS[m[10].slice(0, 3).toLowerCase()], m[11]) : null;
    if (iso) out.push(iso);
  }
  return out;
}

/**
 * The date the sample was taken or the report issued. Labels are tried in that
 * order of preference; birth dates and printing dates are ignored.
 */
function findReportDate(lines) {
  const today = new Date().toISOString().slice(0, 10);
  const labels = [
    /(?:sample|specimen)\s*(?:collect(?:ed|ion)|drawn|date|received)|collect(?:ed|ion)\s*(?:on|date|at)?|drawn\s*on/i,
    /report(?:ed)?\s*(?:on|date|time)?|result\s*date|authori[sz]ed\s*on|approved\s*on|validated\s*on|regist(?:ered|ration)\s*(?:on|date)?|received\s*(?:on|date)?/i,
    /\bdate\b/i
  ];
  // Birth and printing dates share lines with the report's dates; take them out first.
  const notReportDate = /(?:date\s*of\s*birth|birth\s*date|\bd\.?o\.?b\.?|print(?:ed|ing)?\s*(?:on|date)?)\s*[:\-]?\s*(?:\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[\s\-\/]*[a-z]{3,9}[,\s\-\/]*\d{2,4}|[a-z]{3,9}\s+\d{1,2},?\s+\d{4})/gi;
  const cleaned = lines.map(line => line.replace(notReportDate, ' '));
  for (const label of labels) {
    for (const line of cleaned) {
      const m = label.exec(line);
      if (!m) continue;
      const found = datesIn(line.slice(m.index)).filter(d => d <= today);
      if (found.length) return found[0];
    }
  }
  return null;
}

/**
 * Read a blood count report.
 * @param {string} text the report's text, one printed line per line
 * @param {{ocr?: boolean}} [options] ocr: false when the text is a PDF's own
 *   (exact) text; OCR text gets the stricter checks. Defaults to true.
 * @returns {{ values: Record<string, string>, found: string[], date: string|null, lines: Record<string,string> }}
 *   values holds only what was found, as strings in the form's units; lines
 *   holds the report line each value was read from, for checking.
 */
export function parseBloodReport(text, { ocr = true } = {}) {
  const lines = toLines(text);
  const found = {};
  TESTS.forEach(test => {
    const hit = findTest(lines, test);
    if (hit) found[test.key] = hit;
  });
  const compact = findCompactDifferential(lines);
  if (compact) {
    Object.entries(compact.pairs).forEach(([key, value]) => {
      if (!(key in found)) found[key] = { value, line: compact.line, token: String(value) };
    });
  }
  const indices = {};
  INDICES.forEach(index => {
    const hit = findTest(lines, index);
    if (hit && !hit.recovered) indices[index.key] = hit.value;
  });
  checkDifferential(found, ocr);
  checkRedCellValues(found, indices);

  const values = {};
  const sources = {};
  const recovered = [];
  Object.entries(found).forEach(([key, hit]) => {
    values[key] = String(hit.value);
    sources[key] = hit.line;
    if (hit.recovered) recovered.push(key);
  });
  SMEAR_FINDINGS.forEach(finding => {
    const hit = findSmear(lines, finding);
    if (hit) { values[finding.key] = hit.value; sources[finding.key] = hit.line; }
  });
  return { values, found: Object.keys(values), date: findReportDate(lines), lines: sources, recovered };
}

/** Every value the blood test form can take, in form order (for messages and tests). */
export const BLOOD_FIELDS = [
  'hemoglobin', 'wbc', 'platelets', 'rbc', 'pcv', 'neutrophil', 'lymphocytes',
  'eosinophils', 'monocytes', 'basophils', 'plateletsAdequacy', 'rbcMorphology', 'wbcMorphology'
];
