/**
 * generate-excel.js
 * Script untuk membuat file Excel template test case
 * Jalankan: node generate-excel.js
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Data contoh test case login
const testCaseData = [
  { Step: 1, Action: 'navigate',       Selector: '',                Value: '',             Expected: '',          Description: 'Buka halaman login' },
  { Step: 2, Action: 'fill',           Selector: '#username',       Value: 'admin',        Expected: '',          Description: 'Isi username' },
  { Step: 3, Action: 'fill',           Selector: '#password',       Value: 'admin123',     Expected: '',          Description: 'Isi password' },
  { Step: 4, Action: 'click',          Selector: '#login-btn',      Value: '',             Expected: '',          Description: 'Klik tombol login' },
  { Step: 5, Action: 'assert_url',     Selector: '',                Value: '/dashboard',   Expected: '/dashboard', Description: 'Cek redirect ke dashboard' },
  { Step: 6, Action: 'assert_visible', Selector: '.welcome-message',Value: '',             Expected: '',          Description: 'Cek welcome message muncul' },
  { Step: 7, Action: 'screenshot',     Selector: '',                Value: 'login-success',Expected: '',          Description: 'Ambil screenshot' },
];

async function main() {
  // Buat direktori test_cases jika belum ada
  const outputDir = path.resolve('test_cases');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('TestCases');

  // Definisikan kolom
  worksheet.columns = [
    { header: 'Step',        key: 'Step',        width: 8 },
    { header: 'Action',      key: 'Action',      width: 18 },
    { header: 'Selector',    key: 'Selector',    width: 28 },
    { header: 'Value',       key: 'Value',       width: 22 },
    { header: 'Expected',    key: 'Expected',    width: 22 },
    { header: 'Description', key: 'Description', width: 35 },
  ];

  // Tambahkan data
  testCaseData.forEach((row) => worksheet.addRow(row));

  // Simpan file
  const outputPath = path.join(outputDir, 'test_cases.xlsx');
  await workbook.xlsx.writeFile(outputPath);

  console.log(`✅ File Excel berhasil dibuat: ${outputPath}`);
  console.log(`📋 Total ${testCaseData.length} test case telah ditulis.`);
}

main().catch((err) => {
  console.error('❌ Gagal membuat file Excel:', err.message);
  process.exit(1);
});
