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

/** A number as printed: 13.2, 7,500, 2,50,000 (Indian grouping) or .5 */
const NUMBER = /(?<![\w.])(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d*\.\d+|\d+)(?![\w])/g;

/** Reference intervals and limits, which must never be read as the result. */
const RANGE = /(\d*\.?\d+)\s*(?:-|–|—|to)\s*(\d*\.?\d+)/gi;
const LIMIT = /(?:<|>|≤|≥|<=|>=|upto|up to|less than|more than)\s*\d*\.?\d+/gi;

/** Multipliers printed in units, e.g. x10^3/µL, 10³/cumm, 10*9/L, which are not results. */
// OCR often reads the caret as 7, ' or ° ("x10^3" → "x1073"), so after an "x" those count too.
const EXPONENT = /(?:[x×*]\s*10\s*(?:\^|\*\*?|e|7|'|°|")?\s*[369³⁶⁹]|\b10\s*(?:\^|\*\*?)\s*[369]|\b10[³⁶⁹])(?!\d)/gi;

const SUPERSCRIPT = { '³': '3', '⁶': '6', '⁹': '9' };

/**
 * Each test: the names labs print, names that look alike but are other tests,
 * and how to turn a printed number into the form's unit (null when impossible).
 */
const TESTS = [
  {
    key: 'hemoglobin',
    names: /\b(?:ha?emoglobin|hgb|hb)\b/i,
    not: /mean\s+cell|mean\s+corpuscular|\bmch|glyc|a1c|electrophoresis|\bhb\s*[af]\d?\b|plasma/i,
    toUnit: (n, unit) => {
      if (/g\s*\/\s*l\b/i.test(unit) && n >= 30) return n / 10;
      if (n >= 3 && n <= 25) return n;
      if (n >= 30 && n <= 250) return n / 10; // g/L
      return null;
    }
  },
  {
    key: 'wbc',
    names: /\b(?:total\s+)?(?:w\.?\s?b\.?\s?c\.?(?:\s*count)?|white\s+(?:blood\s+)?cells?(?:\s+count)?|total\s+leu[ck]ocytes?(?:\s+count)?|t\.?\s?l\.?\s?c\.?|leu[ck]ocytes?(?:\s+count)?)\b/i,
    not: /morpholog|differential|\bdlc\b|absolute|\bseries\b|urine|stool|esterase|pus\s+cells/i,
    toUnit: (n, unit) => {
      if (/lakh/i.test(unit)) return null;
      if (n >= 500 && n <= 100000) return Math.round(n);
      if (n >= 0.5 && n <= 100) return Math.round(n * 1000); // x10³/µL or 10⁹/L
      return null;
    }
  },
  {
    key: 'platelets',
    names: /\b(?:platelets?(?:\s+count)?|plt(?:\s+count)?|thrombocytes?(?:\s+count)?)\b/i,
    not: /mean\s+platelet|\bmpv\b|\bpdw\b|plateletcrit|\bpct\b|large|adequa|morpholog|clump|distribution|ratio|p-?lcr|on\s+smear/i,
    toUnit: (n, unit) => {
      const lakhs = /lakh|lac\b/i.test(unit);
      if (lakhs && n > 0 && n <= 15) return round(n, 2);
      if (n >= 10000 && n <= 1500000) return round(n / 100000, 2); // /cumm
      if (n >= 10 && n <= 1500) return round(n / 100, 2); // x10³/µL
      if (n > 0 && n <= 15) return round(n, 2); // already in lakhs
      return null;
    }
  },
  {
    key: 'rbc',
    names: /\b(?:total\s+)?(?:r\.?\s?b\.?\s?c\.?(?:\s*count)?|red\s+(?:blood\s+)?cells?(?:\s+count)?|erythrocytes?(?:\s+count)?)\b/i,
    not: /morpholog|distribution|\brdw|nucleated|\bnrbc|indices|urine|stool|series|on\s+smear|sedimentation|\besr\b/i,
    toUnit: (n) => {
      if (n >= 1 && n <= 9) return round(n, 2);
      if (n >= 1000000 && n <= 9000000) return round(n / 1000000, 2); // /cumm
      return null;
    }
  },
  {
    key: 'pcv',
    names: /\b(?:p\.?\s?c\.?\s?v\.?|packed\s+cell\s+volume|ha?ematocrit|hct)\b/i,
    not: /mean/i,
    toUnit: (n) => (n >= 10 && n <= 75 ? n : null)
  },
  percentTest('neutrophil', /\b(?:neutrophils?|polymorphs?|segmented(?:\s+neutrophils?)?|polys)\b/i),
  percentTest('lymphocytes', /\blymphocytes?\b/i, /atypical|reactive/i),
  percentTest('eosinophils', /\beosinophils?\b/i),
  percentTest('monocytes', /\bmonocytes?\b/i),
  percentTest('basophils', /\bbasophils?\b/i)
];

/** A differential count, which the form takes as a percentage, never an absolute count. */
function percentTest(key, names, extraNot) {
  return {
    key,
    names,
    not: new RegExp(`absolute|\\babs\\b|\\ba[nlemb]c\\b|count\\s*\\(abs${extraNot ? `|${extraNot.source}` : ''}`, 'i'),
    toUnit: (n, unit) => {
      if (/cumm|µl|ul\b|10\s*\^|\/l\b|cells/i.test(unit) && !/%/.test(unit)) return null;
      return n >= 0 && n <= 100 ? n : null;
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
  return rest
    .replace(EXPONENT, ' ')
    .replace(RANGE, ' ')
    .replace(LIMIT, ' ')
    .replace(/\(\s*[a-z]{1,8}\s*\)/gi, ' '); // "(Hb)", "(PCV)" after the name
}

/** Words that may sit between a test's name and its result ("RBC Count 4.5"). */
/** Method and flag columns some labs print between the name and the result. */
const METHOD_WORDS = /^(?:photometr\w*|calculat\w*|impedance|cytometr\w*|flow|microscop\w*|derived|sls|colorimetr\w*|spectrophotometr\w*|electrical|optical|hydrodynamic|focusing|coulter|fluorescen\w*|manual|smear|counter|analy[sz]er|vcs|high|low|normal|abnormal)$/i;

const LABEL_WORDS =/^(?:count|level|result|value|total|conc|concentration|estimation|automated|whole|blood|cells?|by|method|tests?)$/i;

/**
 * The first number in the text, or null. Words other than label words before
 * it mean the name is part of a sentence, not a result.
 */
function firstNumber(text) {
  NUMBER.lastIndex = 0;
  const m = NUMBER.exec(text);
  if (!m) return null;
  const between = text.slice(0, m.index);
  const words = between.split(/[\s:|=]+/).filter(w => /^[a-z]{2,}$/i.test(w));
  const unknown = words.filter(w => !LABEL_WORDS.test(w) && !METHOD_WORDS.test(w));
  // A short column (method, flag) set apart by a wide gap is still a table row.
  if (unknown.length && !(/\s{2,}/.test(between) && words.length <= 3)) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
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
    let n = firstNumber(valueText(rest));
    if (n === null && i + 1 < lines.length && /^\s*[<>]?\s*\d/.test(lines[i + 1]) && !TESTS.some(t => t.names.test(lines[i + 1]))) {
      rest = lines[i + 1];
      n = firstNumber(valueText(rest));
    }
    if (n === null) continue;
    const value = test.toUnit(n, unitHint(rest + ' ' + label));
    if (value !== null && value !== undefined) return { value, line };
  }
  return null;
}

function findSmear(lines, finding) {
  for (const line of lines) {
    const m = finding.names.exec(line);
    if (!m) continue;
    const text = line.slice(m.index + m[0].length).replace(/^[\s:\-–]+/, '').replace(/\s{2,}.*$/, '').trim();
    if (text && /[a-z]/i.test(text) && text.length <= 120 && !/^\d/.test(text)) return { value: text, line };
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
    /report(?:ed)?\s*(?:on|date|time)?|result\s*date|authori[sz]ed\s*on|approved\s*on|validated\s*on/i,
    /\bdate\b/i
  ];
  for (const label of labels) {
    for (const line of lines) {
      if (/birth|\bdob\b|d\.o\.b|print/i.test(line)) continue;
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
 * @returns {{ values: Record<string, string>, found: string[], date: string|null, lines: Record<string,string> }}
 *   values holds only what was found, as strings in the form's units; lines
 *   holds the report line each value was read from, for checking.
 */
export function parseBloodReport(text) {
  const lines = toLines(text);
  const values = {};
  const sources = {};
  TESTS.forEach(test => {
    const hit = findTest(lines, test);
    if (hit) { values[test.key] = String(hit.value); sources[test.key] = hit.line; }
  });
  SMEAR_FINDINGS.forEach(finding => {
    const hit = findSmear(lines, finding);
    if (hit) { values[finding.key] = hit.value; sources[finding.key] = hit.line; }
  });
  return { values, found: Object.keys(values), date: findReportDate(lines), lines: sources };
}

/** Every value the blood test form can take, in form order (for messages and tests). */
export const BLOOD_FIELDS = [
  'hemoglobin', 'wbc', 'platelets', 'rbc', 'pcv', 'neutrophil', 'lymphocytes',
  'eosinophils', 'monocytes', 'basophils', 'plateletsAdequacy', 'rbcMorphology', 'wbcMorphology'
];
