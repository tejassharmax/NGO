const sharp = require('sharp');
const vision = require('@google-cloud/vision');
require('dotenv').config();

const svgText = `
<svg width="200" height="50">
  <rect width="100%" height="100%" fill="white" />
  <text x="10" y="35" font-family="Arial" font-size="24" fill="black">HEADING</text>
</svg>
`;

console.log('Credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

console.log('Generating test image with sharp...');
sharp(Buffer.from(svgText))
  .png()
  .toBuffer()
  .then(buffer => {
    console.log('Running Google Cloud Vision OCR...');
    return visionClient.documentTextDetection(buffer);
  })
  .then(([result]) => {
    console.log('--- Google Cloud Vision OCR Success ---');
    const text = result.fullTextAnnotation ? result.fullTextAnnotation.text : '';
    console.log('Text extracted:', text.trim());
    console.log('---------------------------------------');
    process.exit(0);
  })
  .catch(err => {
    console.error('OCR Error:', err);
    process.exit(1);
  });
