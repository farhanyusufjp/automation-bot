/**
 * excelReport.js
 * Module untuk generate Excel report hasil Explore Mode menggunakan exceljs.
 */

const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Generate Excel report dari hasil test.
 * @param {Array} results - Array of test result objects
 * @param {string} outputPath - Path file output .xlsx
 */
async function generateReport(results, outputPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Automation Bot';
  workbook.created = new Date();

  // ── Sheet: Test Results ────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet('Test Results');

  // Header
  sheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: 'URL', key: 'url', width: 30 },
    { header: 'Nama Halaman', key: 'pageName', width: 25 },
    { header: 'Elemen yang Ditest', key: 'element', width: 30 },
    { header: 'Aksi yang Dilakukan', key: 'action', width: 30 },
    { header: 'Expected Result', key: 'expected', width: 35 },
    { header: 'Actual Result', key: 'actualResult', width: 35 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Screenshot', key: 'screenshotPath', width: 40 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  headerRow.height = 20;

  // Status colors
  const statusStyles = {
    PASS: { bg: 'FFC6EFCE', fg: 'FF276221' },
    FAIL: { bg: 'FFFFC7CE', fg: 'FF9C0006' },
    SKIP: { bg: 'FFFFEB9C', fg: 'FF9C6500' },
    MANUAL: { bg: 'FFE2EFDA', fg: 'FF375623' },
  };

  // Data rows
  for (const result of results) {
    const row = sheet.addRow({
      no: result.no,
      url: result.url,
      pageName: result.pageName,
      element: result.element,
      action: result.action,
      expected: result.expected,
      actualResult: result.actualResult,
      status: result.status,
      screenshotPath: result.screenshotPath,
    });

    const style = statusStyles[result.status] || statusStyles.MANUAL;
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: style.bg },
      };
      cell.font = { color: { argb: style.fg } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Status cell bold
    const statusCell = row.getCell('status');
    statusCell.font = { bold: true, color: { argb: style.fg } };
    statusCell.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  // ── Sheet: Summary ─────────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet('Summary');

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const manual = results.filter((r) => r.status === 'MANUAL').length;

  const pct = (n) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '0%');

  // Pages summary
  const pageNames = [...new Set(results.map((r) => r.pageName))];
  const pageStats = pageNames.map((name) => {
    const pageResults = results.filter((r) => r.pageName === name);
    return {
      name,
      total: pageResults.length,
      pass: pageResults.filter((r) => r.status === 'PASS').length,
      fail: pageResults.filter((r) => r.status === 'FAIL').length,
      skip: pageResults.filter((r) => r.status === 'SKIP').length,
    };
  });

  const summaryData = [
    ['AUTOMATION TEST REPORT'],
    ['Generated:', new Date().toLocaleString('id-ID')],
    ['Base URL:', process.env.BASE_URL || '-'],
    [],
    ['Total Halaman Ditest :', pageNames.length],
    ['Total Elemen Ditest  :', total],
    ['PASS                 :', passed, pct(passed)],
    ['FAIL                 :', failed, pct(failed)],
    ['SKIP                 :', skipped, pct(skipped)],
    ['MANUAL               :', manual, pct(manual)],
    [],
    ['DETAIL PER HALAMAN:'],
    ['Halaman', 'Total', 'PASS', 'FAIL', 'SKIP'],
    ...pageStats.map((p) => [p.name, p.total, p.pass, p.fail, p.skip]),
  ];

  summaryData.forEach((rowData, idx) => {
    const row = summarySheet.addRow(rowData);

    // Title row
    if (idx === 0) {
      row.getCell(1).font = { bold: true, size: 14 };
    }

    // Detail per halaman header row
    if (idx === 12) {
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
        cell.alignment = { horizontal: 'center' };
      });
    }
  });

  summarySheet.getColumn(1).width = 28;
  summarySheet.getColumn(2).width = 15;
  summarySheet.getColumn(3).width = 10;
  summarySheet.getColumn(4).width = 10;
  summarySheet.getColumn(5).width = 10;

  await workbook.xlsx.writeFile(outputPath);
}

module.exports = { generateReport };
