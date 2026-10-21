// More report formats for js/bloodReportParser.js: SI units, manual hospital
// reports, two tests per line, compact differential counts.
// Run: node scripts/test-blood-parser-more.mjs
import { parseBloodReport } from '../js/bloodReportParser.js';

let failures = 0;
function check(name, text, expected, expectedDate) {
  const { values, date } = parseBloodReport(text);
  const problems = [];
  for (const [key, want] of Object.entries(expected)) {
    if (want === undefined) {
      if (key in values) problems.push(`${key}: expected nothing, got ${values[key]}`);
    } else if (String(values[key]) !== String(want)) {
      problems.push(`${key}: expected ${want}, got ${values[key]}`);
    }
  }
  if (expectedDate !== undefined && date !== expectedDate) problems.push(`date: expected ${expectedDate}, got ${date}`);
  if (problems.length) { failures++; console.log(`FAIL ${name}\n  ${problems.join('\n  ')}`); }
  else console.log(`PASS ${name}`);
}

check('SI units (x10^12/L, x10^9/L, L/L, g/L)', `
Date of Collection: 2026-02-03
Haemoglobin            128 g/L          (115-165)
White cell count       6.9 x10^9/L      (4.0-11.0)
Red cell count         4.38 x10^12/L    (3.8-5.8)
Haematocrit            0.41 L/L         (0.37-0.47)
Platelets              262 x10^9/L      (150-400)
`, { hemoglobin: 12.8, wbc: 6900, rbc: 4.38, pcv: 41, platelets: 2.62 }, '2026-02-03');

check('manual hospital report with compact DLC', `
Date: 15/06/2026
Hb : 10.2 gm%
TC : 11,400 cells/cumm
DC : P 72   L 22   E 04   M 02   B 00
Platelet count : 1.9 lakhs/cumm
`, { hemoglobin: 10.2, wbc: 11400, neutrophil: 72, lymphocytes: 22, eosinophils: 4, monocytes: 2, basophils: 0, platelets: 1.9 }, '2026-06-15');

check('compact DLC without spaces (N60 L30 E5 M5 B0)', `
DLC: N60 L30 E5 M5 B0
`, { neutrophil: 60, lymphocytes: 30, eosinophils: 5, monocytes: 5, basophils: 0 });

check('Sahli haemoglobin in % is not g/dL', `
Haemoglobin (Sahli)   78 %
`, { hemoglobin: undefined });

check('total count is WBC, total cholesterol is not', `
Total Count        8200 /cumm
Total Cholesterol  182 mg/dL
`, { wbc: 8200 });

check('two tests on one line', `
Hemoglobin  13.1 g/dL        WBC  7,800 /µL
Platelets   265 x10³/µL      RBC  4.70 x10⁶/µL
`, { hemoglobin: 13.1, wbc: 7800, platelets: 2.65, rbc: 4.7 });

check('Apollo-style with method and flags after value', `
Investigation                Observed Value     Unit          Biological Reference Interval
HEMOGLOBIN, Photometry       11.2  L            g/dL          12-15
PCV, Calculated              35.1  L            %             36-46
RBC COUNT, Impedance         4.02               Million/cu.mm 3.8-4.8
TOTAL LEUCOCYTE COUNT        10.4               10^3/uL       4-10
PLATELET COUNT, Impedance    174                10^3/uL       150-410
NEUTROPHILS                  71.2               %             40-80
LYMPHOCYTES                  20.1               %             20-40
MONOCYTES                    6.0                %             2-10
EOSINOPHILS                  2.4                %             1-6
BASOPHILS                    0.3                %             <2
`, { hemoglobin: 11.2, pcv: 35.1, rbc: 4.02, wbc: 10400, platelets: 1.74, neutrophil: 71.2, lymphocytes: 20.1, monocytes: 6, eosinophils: 2.4, basophils: 0.3 });

check('previous-result column: the current value comes first', `
Test            Result   Previous(12/05/2026)   Unit
Haemoglobin     13.4     12.1                   g/dL
Platelet Count  3.10     2.40                   lakh/µL
`, { hemoglobin: 13.4, platelets: 3.1 });

check('serial numbers and pipes from table extraction', `
1 | Haemoglobin | 12.9 | g/dL | 12.0-15.0
2 | Total WBC Count | 5600 | /cmm | 4000-10000
3 | Platelet Count | 2,15,000 | /cmm | 1,50,000-4,10,000
`, { hemoglobin: 12.9, wbc: 5600, platelets: 2.15 });

check('dates in other formats', `
Sample collected on Aug 21, 2026 10:15 AM
Haemoglobin 13.0 g/dL
`, { hemoglobin: 13 }, '2026-08-21');

check('dd.mm.yy dates', `
Collected : 05.09.26
Haemoglobin 14.6 g/dL
`, { hemoglobin: 14.6 }, '2026-09-05');

check('report with only a few tests stays partial', `
Hemoglobin 9.8 g/dL (L)
ESR 42 mm/1st hr
`, { hemoglobin: 9.8, wbc: undefined, platelets: undefined, rbc: undefined });

check('WBC morphology and smear lines', `
PERIPHERAL BLOOD SMEAR
RBC: Microcytic hypochromic with anisopoikilocytosis
WBC: Normal in number, morphology and distribution
Platelets: Adequate in number
`, { rbcMorphology: 'Microcytic hypochromic with anisopoikilocytosis', wbcMorphology: 'Normal in number, morphology and distribution', plateletsAdequacy: 'Adequate in number', rbc: undefined, wbc: undefined, platelets: undefined });

check('lipid and liver panels give no blood counts', `
LIPID PROFILE
Total Cholesterol 190 mg/dL
HDL Cholesterol 45 mg/dL
LIVER FUNCTION
Total Bilirubin 0.8 mg/dL
Total Protein 7.1 g/dL
Albumin 4.2 g/dL
`, { hemoglobin: undefined, wbc: undefined, platelets: undefined, rbc: undefined, pcv: undefined });

check('date of birth and print date are not the report date', `
DOB: 12/03/1981      Printed on: 20/10/2026
Reported: 18/10/2026
Hb 13 g/dL
`, { hemoglobin: 13 }, '2026-10-18');

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);
