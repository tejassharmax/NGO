const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const path = require('path');

const svgText = `
<svg width="200" height="50">
  <rect width="100%" height="100%" fill="white" />
  <text x="10" y="35" font-family="Arial" font-size="24" fill="black">HEADING</text>
</svg>
`;

console.log('Generating test image with sharp...');
sharp(Buffer.from(svgText))
  .png()
  .toBuffer()
  .then(buffer => {
    console.log('Running local Tesseract OCR...');
    return Tesseract.recognize(buffer, 'eng', { langPath: path.join(__dirname, '..') });
  })
  .then(({ data: { text } }) => {
    console.log('--- OCR Success ---');
    console.log(text.trim());
    console.log('-------------------');
    process.exit(0);
  })
  .catch(err => {
    console.error('OCR Error:', err);
    process.exit(1);
  });
