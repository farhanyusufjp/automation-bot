/**
 * excelReader.js
 * Modul untuk membaca dan memparsing test case dari file Excel
 * Format kolom: No | Function | Scenario | Expected Result | Actual Result | Status | Notes
 */

const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Membaca file Excel format Prima Career dan mengkonversi isinya menjadi array test case
 * Kolom A: No  | B: Function | C: Scenario | D: Expected Result | E: Actual Result | F: Status | G: Notes
 *
 * Aturan parsing:
 * - Cari header row secara dinamis (baris yang kolom A-nya "No")
 * - Skip baris yang kolom No-nya diawali 'BRD' (baris header grup)
 * - Skip baris kosong
 * - Hanya proses baris yang No-nya diawali 'TCE' atau berupa angka
 * - Handle merged cells pada kolom Function (simpan nilai terakhir yang tidak kosong)
 *
 * @param {string} filePath - Path ke file Excel
 * @returns {Promise<Array>} Array of test case objects
 */
async function readTestCases(filePath) {
  const absolutePath = path.resolve(filePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(absolutePath);

  // Ambil sheet berdasarkan SHEET_NAME env, atau sheet pertama
  const sheetName = process.env.SHEET_NAME;
  const worksheet =
    (sheetName ? workbook.getWorksheet(sheetName) : null) ||
    workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Worksheet tidak ditemukan di file Excel.');
  }

  const testCases = [];
  let lastFunction = '';
  let headerRowNumber = -1;

  // Temukan baris header secara dinamis (baris yang kolom A berisi teks "No")
  worksheet.eachRow((row, rowNumber) => {
    if (headerRowNumber !== -1) return;
    const cellA = getCellText(row.values[1]);
    if (cellA.toLowerCase() === 'no') {
      headerRowNumber = rowNumber;
    }
  });

  if (headerRowNumber === -1) {
    throw new Error('Header row tidak ditemukan. Pastikan ada baris dengan kolom pertama berisi "No".');
  }

  worksheet.eachRow((row, rowNumber) => {
    // Skip baris header dan sebelumnya
    if (rowNumber <= headerRowNumber) return;

    const values = row.values; // index 0 selalu null di ExcelJS, kolom mulai dari index 1

    const no = getCellText(values[1]);
    const fn = getCellText(values[2]);
    const scenario = getCellText(values[3]);
    const expectedResult = getCellText(values[4]);
    const actualResult = getCellText(values[5]);
    const status = getCellText(values[6]);
    const notes = getCellText(values[7]);

    // Skip baris kosong (No kosong DAN Scenario kosong)
    if (!no && !scenario) return;

    // Update lastFunction jika kolom Function tidak kosong (handle merged cells)
    if (fn) lastFunction = fn;

    // Skip baris BRD (header grup)
    if (/^BRD\s/i.test(no)) return;

    // Hanya proses baris TCExxx, angka, atau yang No-nya kosong tapi punya Scenario
    if (no && !/^TCE/i.test(no) && !/^\d+$/.test(no)) return;

    testCases.push({
      no,
      function: lastFunction,
      scenario,
      expectedResult,
      actualResult,
      status,
      notes,
    });
  });

  return testCases;
}

/**
 * Mengambil teks dari cell ExcelJS (bisa berupa string, number, RichText, dll)
 * @param {*} cell - Nilai cell dari row.values
 * @returns {string}
 */
function getCellText(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'object' && cell.richText) {
    // RichText: gabungkan semua segment
    return cell.richText.map((r) => r.text).join('').trim();
  }
  return cell.toString().trim();
}

module.exports = { readTestCases };
