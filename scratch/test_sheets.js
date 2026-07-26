const { google } = require('googleapis');
require('dotenv').config();

console.log('Testing Google Sheets API with credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
});

async function testSheets() {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('Creating a test spreadsheet...');
    const res = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'NGO Child Health Records Test',
        },
      },
    });
    console.log('✓ Spreadsheet created successfully!');
    console.log('Spreadsheet ID:', res.data.spreadsheetId);
    console.log('Spreadsheet URL:', res.data.spreadsheetUrl);
  } catch (err) {
    console.error('✗ Google Sheets API Error:', err.message);
  }
}

testSheets();
