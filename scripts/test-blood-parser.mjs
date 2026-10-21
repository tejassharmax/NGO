// Checks js/bloodReportParser.js against report layouts from different labs.
// Run: node scripts/test-blood-parser.mjs
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

// 1. Typical Indian lab PDF: test, result, unit, reference range in columns.
check('columns with ranges (Lal Path style)', `
Patient Name : Mr. Anirudh Pandya        Age/Sex : 45 Y / M
Collected : 21/Aug/2026 08:15            Reported : 21/Aug/2026 14:02
Date of Birth: 12/03/1981
COMPLETE BLOOD COUNT (CBC)
Test Name                     Result     Unit           Bio. Ref. Interval
Hemoglobin (Hb)               13.2       g/dL           13.00 - 17.00
Packed Cell Volume (PCV)      41.5       %              40.00 - 50.00
RBC Count                     4.62       mill/mm3       4.50 - 5.50
MCV                           89.8       fL             83.00 - 101.00
MCH                           28.6       pg             27.00 - 32.00
MCHC                          31.8       g/dL           31.50 - 34.50
Red Cell Distribution Width   13.9       %              11.60 - 14.00
Total Leukocyte Count (TLC)   7.80       thou/mm3       4.00 - 10.00
Differential Leucocyte Count (DLC)
Segmented Neutrophils         62.0       %              40.00 - 80.00
Lymphocytes                   30.0       %              20.00 - 40.00
Monocytes                     5.0        %              2.00 - 10.00
Eosinophils                   2.5        %              1.00 - 6.00
Basophils                     0.5        %              <2.00
Absolute Leucocyte Count
Neutrophils                   4.84       thou/mm3       2.00 - 7.00
Lymphocytes                   2.34       thou/mm3       1.00 - 3.00
Platelet Count                250        thou/mm3       150.00 - 410.00
Mean Platelet Volume          10.2       fL             6.5 - 12.0
`, { hemoglobin: 13.2, pcv: 41.5, rbc: 4.62, wbc: 7800, neutrophil: 62, lymphocytes: 30, monocytes: 5, eosinophils: 2.5, basophils: 0.5, platelets: 2.5 }, '2026-08-21');

// 2. /cumm counts with Indian digit grouping, range before unit.
check('cumm counts, Indian grouping', `
SAMPLE COLLECTED ON 05-03-2024
HAEMOGLOBIN            11.8 gm/dl      (12.0 - 15.0)   L
TOTAL W.B.C. COUNT     9,600 /cumm     (4000 - 11000)
PLATELET COUNT         2,10,000 /cumm  (1,50,000 - 4,50,000)
R.B.C. COUNT           4.1 millions/cumm (3.8 - 4.8)
HAEMATOCRIT            36.2 %
NEUTROPHILS            58 %
LYMPHOCYTES            35 %
EOSINOPHILS            04 %
MONOCYTES              03 %
BASOPHILS              00 %
PERIPHERAL SMEAR
RBC Morphology: Normocytic normochromic
WBC Morphology: Within normal limits
Platelets on smear: Adequate
`, { hemoglobin: 11.8, wbc: 9600, platelets: 2.1, rbc: 4.1, pcv: 36.2, neutrophil: 58, lymphocytes: 35, eosinophils: 4, monocytes: 3, basophils: 0, rbcMorphology: 'Normocytic normochromic', wbcMorphology: 'Within normal limits', plateletsAdequacy: 'Adequate' }, '2024-03-05');

// 3. Phone photo through OCR: single spaces, O for 0, broken decimals, x10^3/uL.
check('OCR text with slips', `
Report Date: 12 Jan 2025
Hb 12.O g/dL 12-16
WBC 6.4 x10^3/uL 4.0-11.0
PLT 3l0 x10^3/uL 150-450
RBC 4 .35 x10^6/uL 4.2-5.4
HCT 38 % 36-46
Neutrophil 55 % 40-75
Lymphocyte 38 % 20-45
Monocyte 5 % 2-10
Eosinophil 2 % 1-6
Basophil 0 % 0-1
`, { hemoglobin: 12, wbc: 6400, platelets: 3.1, rbc: 4.35, pcv: 38, neutrophil: 55, lymphocytes: 38, monocytes: 5, eosinophils: 2, basophils: 0 }, '2025-01-12');

// 4. Table where OCR puts the result on the line below the name.
check('result on the next line', `
Haemoglobin
14.1 g/dL 13-17
Platelets
1.8 lakhs/cumm 1.5-4.5
`, { hemoglobin: 14.1, platelets: 1.8 });

// 5. Other tests and prose must not be read as blood counts.
check('ignores lookalikes and prose', `
HbA1c (Glycated Haemoglobin)  6.1  %   4.0 - 5.6
Mean Corpuscular Hemoglobin   29   pg
Low haemoglobin levels of 9 may indicate anaemia.
Urine RBC     2-3 /hpf
ESR (Erythrocyte Sedimentation Rate)   18   mm/hr
Absolute Neutrophil Count   4200 /cumm
`, { hemoglobin: undefined, rbc: undefined, neutrophil: undefined });

// 6. Platelets in lakhs written as plain numbers; g/L haemoglobin.
check('lakhs and g/L', `
Hemoglobin  132  g/L  120 - 160
Platelets   2.75 Lakhs/cumm   1.5 - 4.5
`, { hemoglobin: 13.2, platelets: 2.75 });

// 7. A non-blood report gives nothing.
check('thyroid report finds nothing', `
THYROID PROFILE
T3   1.2  ng/mL
T4   8.1  ug/dL
TSH  2.4  uIU/mL
`, { hemoglobin: undefined, wbc: undefined, platelets: undefined, rbc: undefined });

// 8. Value of exactly 103 must not be mistaken for a 10^3 exponent.
check('three-digit platelet count', `
Platelet count   103   10^3/uL   150 - 410
`, { platelets: 1.03 });

// 9. Method column between name and value (Thyrocare style), flags beside results.
check('method column and flags', `
TEST NAME                    TECHNOLOGY          VALUE    UNITS
HEMOGLOBIN                   SLS-Hemoglobin Method  14.2   g/dL
TOTAL LEUCOCYTES COUNT       FLOW CYTOMETRY      6.21     X 10^3 / uL
PLATELET COUNT               ELECTRICAL IMPEDANCE  198    X 10^3 / uL
HEMATOCRIT(PCV)              CALCULATED          L 38.9   %
NEUTROPHILS                  FLOW CYTOMETRY      H 74.6   %
`, { hemoglobin: 14.2, wbc: 6210, platelets: 1.98, pcv: 38.9, neutrophil: undefined }); // a lone differential value cannot be checked, so it stays blank

// 10. Real Tesseract output from a photographed report: "x10^3" read as "x1073",
//     decimals dropped from the reference ranges, columns kept apart.
check('Tesseract output from a photo', `
SUNRISE PATHOLOGY CENTRE
Name: Kavya Menon     Age: 9 Yrs     Sex: F
Collected: 03/10/2026     Reported: 04/10/2026
Hemoglobin                                       11.4           g/dL                 11.5-15.5
Total Leucocyte Count                        9.2           x1073/uL          45-135
Platelet Count                                        312            x1073/uL             150 - 450
RBC Count                                        4.21           x1076/uL            40-52
Hematocrit                                            34.8            %                      35-45
Basophils                                         1              %                    0-1
`, { hemoglobin: 11.4, wbc: 9200, platelets: 3.12, rbc: 4.21, pcv: 34.8, basophils: undefined }, '2026-10-03'); // lone differential value

// 11. Unit before the result, as some reports print it.
check('unit column before result', `
Platelets   x10^3/uL   245   150-450
WBC   x1073/uL   5.6   4-11
`, { platelets: 2.45, wbc: 5600 });

// 12. OCR slips seen on a scanned report: doubled separators, a dropped decimal
//     point (restored: 49 million/cumm is impossible, 4.9 is the only reading), dotted test names.
check('scanned report slips', `
Sample Date: 11-Jul-2026
PLATELET COUNT                                  2.,80,000          /cumm               1.5-4.5 lakhs
R.B.C. COUNT                                      49                mill/cumm         4.0-5.5
P.C.V.                                                       41                   %                      36-46
POLYMORPHS   60   %
`, { platelets: 2.8, rbc: 4.9, pcv: 41, neutrophil: undefined }, '2026-07-11'); // lone differential value

console.log(failures ? `\n${failures} failing` : '\nAll passing');
process.exit(failures ? 1 : 0);
