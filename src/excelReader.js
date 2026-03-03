/**
 * excelReader.js
 * Modul untuk membaca dan memparsing test case dari file Excel
 */

const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Membaca file Excel dan mengkonversi isinya menjadi array test case
 * @param {string} filePath - Path ke file Excel
 * @returns {Promise<Array>} Array of test case objects
 */
async function readTestCases(filePath) {
  const absolutePath = path.resolve(filePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(absolutePath);

  // Coba ambil sheet bernama "TestCases", kalau tidak ada ambil sheet pertama
  const worksheet =
    workbook.getWorksheet('TestCases') || workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Worksheet tidak ditemukan di file Excel.');
  }

  const testCases = [];
  let headers = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values.slice(1); // index 0 selalu null di ExcelJS

    if (rowNumber === 1) {
      // Baris pertama adalah header
      headers = values.map((h) => (h ? h.toString().toLowerCase().trim() : ''));
    } else {
      // Lewati baris kosong
      if (values.every((v) => v === null || v === undefined || v === '')) return;

      const obj = {};
      headers.forEach((header, i) => {
        const cell = values[i];
        obj[header] = (cell !== undefined && cell !== null) ? cell.toString().trim() : '';
      });

      testCases.push({
        step: obj['step'] || '',
        action: (obj['action'] || '').toLowerCase().trim(),
        selector: obj['selector'] || '',
        value: obj['value'] || '',
        expected: obj['expected'] || '',
        description: obj['description'] || '',
      });
    }
  });

  return testCases;
}

module.exports = { readTestCases };
