const http = require('http');
require('dotenv').config();

async function testAutoSync() {
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

  console.log('Testing /api/sync endpoint with children payload...');
  const payload = JSON.stringify({
    'chm-children': JSON.stringify(sampleChildren)
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/sync',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('✓ /api/sync response received:', res.statusCode);
      try {
        const data = JSON.parse(body);
        console.log('Response keys synced:', Object.keys(data));
      } catch (e) {
        console.log('Raw response:', body);
      }
    });
  });

  req.on('error', err => console.error('✗ Request error:', err.message));
  req.write(payload);
  req.end();
}

testAutoSync();
