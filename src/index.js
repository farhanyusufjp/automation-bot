/**
 * index.js
 * Entry point utama Automation Bot
 * Membaca test case dari Excel dan menjalankannya menggunakan Playwright
 */

require('dotenv').config();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { readTestCases } = require('./excelReader');
const actions = require('./actions');

async function run() {
  console.log('====================================');
  console.log('🤖 AUTOMATION BOT STARTED');
  console.log('====================================');

  // Baca konfigurasi dari .env
  const excelFile = process.env.EXCEL_FILE || 'test_cases/test_cases.xlsx';
  const headless = process.env.HEADLESS !== 'false';

  // Baca test cases dari Excel
  let testCases;
  try {
    testCases = await readTestCases(excelFile);
  } catch (err) {
    console.error(`❌ Gagal membaca file Excel: ${err.message}`);
    console.error('Pastikan file Excel sudah ada. Jalankan: node generate-excel.js');
    process.exit(1);
  }

  if (!testCases || testCases.length === 0) {
    console.error('❌ Tidak ada test case ditemukan di file Excel.');
    process.exit(1);
  }

  console.log(`📋 Total Test Cases: ${testCases.length}`);
  console.log('====================================');

  // Launch browser
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  // Hasil test
  const results = [];

  // Loop setiap test case
  for (const tc of testCases) {
    const step = tc.step;
    const action = tc.action;
    const selector = tc.selector;
    const value = tc.value;
    const expected = tc.expected;

    // Pastikan action ada di daftar yang tersedia
    if (!actions[action]) {
      const msg = `Action "${action}" tidak dikenal`;
      console.log(`[STEP ${step}] ${action} → ❌ FAIL: ${msg}`);
      results.push({ step, action, selector, status: 'FAIL', message: msg });
      continue;
    }

    // Jalankan action sesuai tipe
    let result;
    switch (action) {
      case 'navigate':
        result = await actions.navigate(page, value || selector);
        break;
      case 'fill':
        result = await actions.fill(page, selector, value);
        break;
      case 'click':
        result = await actions.click(page, selector);
        break;
      case 'assert_text':
        result = await actions.assert_text(page, selector, expected);
        break;
      case 'assert_visible':
        result = await actions.assert_visible(page, selector);
        break;
      case 'assert_url':
        result = await actions.assert_url(page, expected || value);
        break;
      case 'wait':
        result = await actions.wait(page, value);
        break;
      case 'screenshot':
        result = await actions.screenshot(page, value || selector || `step-${step}`);
        break;
      case 'select':
        result = await actions.select(page, selector, value);
        break;
      case 'clear':
        result = await actions.clear(page, selector);
        break;
      case 'hover':
        result = await actions.hover(page, selector);
        break;
      case 'press_key':
        result = await actions.press_key(page, selector, value);
        break;
      default:
        result = { success: false, message: `Action "${action}" tidak dikenal` };
    }

    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const selectorInfo = selector ? ` ${selector}` : '';
    console.log(
      `[STEP ${step}] ${action}${selectorInfo} → ${status}${!result.success ? ': ' + result.message : ''}`
    );

    results.push({
      step,
      action,
      selector,
      status: result.success ? 'PASS' : 'FAIL',
      message: result.message,
    });
  }

  // Tutup browser
  await browser.close();

  // Hitung summary
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = total - passed;

  console.log('====================================');
  console.log('📊 SUMMARY');
  console.log('====================================');
  console.log(`Total  : ${total}`);
  console.log(`Passed : ${passed}`);
  console.log(`Failed : ${failed}`);
  console.log('====================================');

  // Simpan hasil ke test_results.log
  const logLines = [
    '====================================',
    `AUTOMATION BOT RESULT - ${new Date().toISOString()}`,
    '====================================',
    `Total  : ${total}`,
    `Passed : ${passed}`,
    `Failed : ${failed}`,
    '====================================',
    '',
    'DETAIL STEPS:',
    ...results.map(
      (r) =>
        `[STEP ${r.step}] ${r.action}${r.selector ? ' ' + r.selector : ''} → ${r.status}: ${r.message}`
    ),
  ];

  fs.writeFileSync('test_results.log', logLines.join('\n'), 'utf8');
  console.log('📁 Hasil tersimpan di test_results.log');
}

run().catch((err) => {
  console.error('❌ Error tidak terduga:', err.message);
  process.exit(1);
});
