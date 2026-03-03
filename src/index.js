/**
 * index.js
 * Entry point utama Automation Bot
 * Membaca test case dari Excel (format Prima Career) dan menjalankannya menggunakan Playwright
 * Flow: login → parse scenario → jalankan aksi → report HTML + log
 */

require('dotenv').config();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { readTestCases } = require('./excelReader');
const { parseScenario } = require('./scenarioParser');
const actions = require('./actions');

async function run() {
  console.log('====================================');
  console.log('🤖 AUTOMATION BOT - Prima Career');
  console.log('====================================');

  // Baca konfigurasi dari .env
  const excelFile =
    process.env.EXCEL_FILE ||
    'test_cases/TEST CASE - Prima Career (SAU).xlsx';
  const headless = process.env.HEADLESS !== 'false';
  const slowMo = parseInt(process.env.SLOW_MO || '0', 10);
  const baseUrl = process.env.BASE_URL || '';

  // Baca test cases dari Excel
  let testCases;
  try {
    testCases = await readTestCases(excelFile);
  } catch (err) {
    console.error(`❌ Gagal membaca file Excel: ${err.message}`);
    process.exit(1);
  }

  if (!testCases || testCases.length === 0) {
    console.error('❌ Tidak ada test case ditemukan di file Excel.');
    process.exit(1);
  }

  console.log(`📋 Total Test Cases: ${testCases.length}`);
  console.log('====================================');

  // Launch browser
  const browser = await chromium.launch({ headless, slowMo });
  const page = await browser.newPage();

  // ── Login flow ────────────────────────────────────────────────────────────
  if (baseUrl && process.env.USERNAME && process.env.PASSWORD) {
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      // Coba isi form login menggunakan selector umum
      const userSelectors = ['#username', 'input[name="username"]', 'input[type="email"]', 'input[name="email"]'];
      const passSelectors = ['#password', 'input[name="password"]', 'input[type="password"]'];
      const submitSelectors = ['button[type="submit"]', 'input[type="submit"]', 'text="Login"', 'text="Sign In"'];

      for (const sel of userSelectors) {
        try {
          if (await page.isVisible(sel, { timeout: 2000 })) {
            await page.fill(sel, process.env.USERNAME);
            break;
          }
        } catch (_) {}
      }
      for (const sel of passSelectors) {
        try {
          if (await page.isVisible(sel, { timeout: 2000 })) {
            await page.fill(sel, process.env.PASSWORD);
            break;
          }
        } catch (_) {}
      }
      for (const sel of submitSelectors) {
        try {
          if (await page.isVisible(sel, { timeout: 2000 })) {
            await page.click(sel);
            break;
          }
        } catch (_) {}
      }
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      console.log('🔐 Login attempted');
    } catch (err) {
      console.warn(`⚠️  Login gagal: ${err.message}`);
    }
  }

  // ── Jalankan test cases ───────────────────────────────────────────────────
  const results = [];
  let lastFunction = '';

  for (let tcIndex = 0; tcIndex < testCases.length; tcIndex++) {
    const tc = testCases[tcIndex];
    const tcLabel = tc.no || `TC${tcIndex + 1}`;

    // Print header grup jika function berubah
    if (tc.function && tc.function !== lastFunction) {
      lastFunction = tc.function;
      console.log('');
      console.log(`📁 ${lastFunction}`);
      console.log('------------------------------------');
    }

    const steps = parseScenario(tc.scenario, tc.expectedResult, tcLabel);

    console.log(`[${tcLabel}] ${tc.scenario}`);

    for (const step of steps) {
      let result;

      switch (step.action) {
        case 'navigate':
          result = await actions.navigate(page, step.target.startsWith('http') ? step.target : baseUrl.replace(/\/$/, '') + '/' + step.target.replace(/^\//, ''));
          break;
        case 'click_text':
          result = await actions.click_text(page, step.target);
          break;
        case 'assert_element_visible':
          result = await actions.assert_element_visible(page, step.target, step.description);
          break;
        case 'assert_table_has_data':
          result = await actions.assert_table_has_data(page);
          break;
        case 'wait_for_page_load':
          result = await actions.wait_for_page_load(page);
          break;
        case 'screenshot':
          result = await actions.screenshot(page, step.target);
          break;
        case 'manual':
          console.log(`  ⚠️  MANUAL: ${step.description}`);
          results.push({ no: tcLabel, scenario: tc.scenario, step: step.action, status: 'MANUAL', message: step.description });
          continue;
        default:
          result = { success: false, message: `Action "${step.action}" tidak dikenal` };
      }

      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`  → ${step.action}${step.target ? ' ' + step.target : ''} → ${status}${!result.success ? ': ' + result.message : ''}`);

      // Screenshot otomatis jika FAIL
      if (!result.success && step.action !== 'screenshot') {
        const failShot = await actions.take_screenshot_on_fail(page, tcLabel);
        if (failShot.success) console.log(`  ${failShot.message}`);
      }

      results.push({
        no: tcLabel,
        scenario: tc.scenario,
        step: step.action,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message,
      });
    }
  }

  // Tutup browser
  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = testCases.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const manual = results.filter((r) => r.status === 'MANUAL').length;

  console.log('');
  console.log('====================================');
  console.log('📊 SUMMARY');
  console.log('====================================');
  console.log(`Total Test Cases : ${total}`);
  console.log(`Passed           : ${passed}`);
  console.log(`Failed           : ${failed}`);
  console.log(`Manual/Skip      : ${manual}`);
  console.log('====================================');

  // ── Tulis test_results.log ────────────────────────────────────────────────
  const logLines = [
    '====================================',
    `AUTOMATION BOT RESULT - ${new Date().toISOString()}`,
    '====================================',
    `Total Test Cases : ${total}`,
    `Passed           : ${passed}`,
    `Failed           : ${failed}`,
    `Manual/Skip      : ${manual}`,
    '====================================',
    '',
    'DETAIL STEPS:',
    ...results.map(
      (r) => `[${r.no}] ${r.scenario} → ${r.step} → ${r.status}: ${r.message}`
    ),
  ];
  fs.writeFileSync('test_results.log', logLines.join('\n'), 'utf8');
  console.log('📁 Hasil tersimpan di test_results.log');

  // ── Tulis results/report.html ─────────────────────────────────────────────
  const resultsDir = path.resolve('results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const htmlReport = buildHtmlReport(results, { total, passed, failed, manual });
  fs.writeFileSync(path.join(resultsDir, 'report.html'), htmlReport, 'utf8');
  console.log('📊 HTML report tersimpan di results/report.html');
}

/**
 * Membuat HTML report dari hasil test
 */
function buildHtmlReport(results, summary) {
  const rows = results.map((r) => {
    const color = r.status === 'PASS' ? '#d4edda' : r.status === 'MANUAL' ? '#fff3cd' : '#f8d7da';
    return `<tr style="background:${color}">
      <td>${escHtml(r.no)}</td>
      <td>${escHtml(r.scenario)}</td>
      <td>${escHtml(r.step)}</td>
      <td><strong>${escHtml(r.status)}</strong></td>
      <td>${escHtml(r.message || '')}</td>
    </tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Automation Bot Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .card { padding: 15px 25px; border-radius: 8px; font-size: 1.2em; }
    .total  { background: #cce5ff; }
    .pass   { background: #d4edda; }
    .fail   { background: #f8d7da; }
    .manual { background: #fff3cd; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #343a40; color: #fff; }
  </style>
</head>
<body>
  <h1>🤖 Automation Bot Report - Prima Career</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <div class="summary">
    <div class="card total">📋 Total: ${summary.total}</div>
    <div class="card pass">✅ Passed: ${summary.passed}</div>
    <div class="card fail">❌ Failed: ${summary.failed}</div>
    <div class="card manual">⚠️ Manual: ${summary.manual}</div>
  </div>
  <table>
    <thead>
      <tr><th>No</th><th>Scenario</th><th>Step</th><th>Status</th><th>Message</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

run().catch((err) => {
  console.error('❌ Error tidak terduga:', err.message);
  process.exit(1);
});
