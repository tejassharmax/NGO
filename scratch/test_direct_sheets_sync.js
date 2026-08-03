const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const DB_DIR = path.join(__dirname, '..', 'data');
const SHEETS_CONFIG_FILE = path.join(DB_DIR, 'sheets_config.json');

const sampleChildren = [
  {
    id: 'CH-1001',
    name: 'Aarav Sharma',
    gender: 'Male',
    dob: '2018-05-12',
    blood: 'O+',
    father: 'Rajesh Sharma',
    mother: 'Priya Sharma',
    phone: '+91 9876543210',
    address: 'Mumbai, Maharashtra',
    idNumber: '1234 5678 9012',
    height: '115',
    weight: '21',
    medicalConditions: 'None',
    allergies: 'Peanuts',
    emergencyContact: 'Rajesh Sharma',
    emergencyPhone: '+91 9876543210',
    registeredDate: '2024-01-15',
    status: 'Active'
  },
  {
    id: 'CH-1002',
    name: 'Ananya Patel',
    gender: 'Female',
    dob: '2019-09-20',
    blood: 'A+',
    father: 'Suresh Patel',
    mother: 'Meena Patel',
    phone: '+91 9812345678',
    address: 'Ahmedabad, Gujarat',
    idNumber: '9876 5432 1098',
    height: '108',
    weight: '18',
    medicalConditions: 'Mild Asthma',
    allergies: 'Dust',
    emergencyContact: 'Meena Patel',
    emergencyPhone: '+91 9812345678',
    registeredDate: '2024-02-01',
    status: 'Active'
  }
];

function formatChildrenForSheet(children) {
  const headers = [
    'Child ID', 'Full Name', 'Gender', 'Date of Birth', 'Blood Group',
    'Father Name', 'Mother Name', 'Phone Number', 'Address', 'ID / Aadhaar Number',
    'Height (cm)', 'Weight (kg)', 'Medical Conditions', 'Allergies',
    'Current Medications', 'Dental Remarks', 'Oral Hygiene Index',
    'Emergency Contact', 'Emergency Phone', 'Registered Date', 'Status'
  ];

  const rows = children.map(c => [
    c.id || '',
    c.name || '',
    c.gender || '',
    c.dob || '',
    c.blood || '',
    c.father || '',
    c.mother || '',
    c.phone || '',
    c.address || '',
    c.idNumber || '',
    c.height || '',
    c.weight || '',
    c.medicalConditions || '',
    c.allergies || '',
    c.medications || 'None',
    c.dentalRemarks || 'None',
    c.hygieneIndex || 'Not Assessed',
    c.emergencyContact || '',
    c.emergencyPhone || '',
    c.registeredDate || '',
    c.status || 'Active'
  ]);

  return [headers, ...rows];
}

function updateLocalCSVExport(children) {
  const tableData = formatChildrenForSheet(children);
  const csvContent = tableData.map(row => 
    row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  const csvPath = path.join(DB_DIR, 'google_sheets_live_sync.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`✓ Synchronized local Google Sheets CSV backup (${children.length} records) at ${csvPath}`);
}

updateLocalCSVExport(sampleChildren);
