/**
 * explore.js
 * Entry point untuk Explore Mode — scan dan test otomatis semua elemen di setiap halaman.
 * Jalankan dengan: npm run explore
 */

require('dotenv').config();

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { login } = require('./login');
const { scanPage } = require('./explorer');
const { generateReport } = require('./excelReport');

/**
 * Parse file urls.txt dan return array [{url, pageName}]
 * @param {string} filePath
 * @returns {Array<{url: string, pageName: string}>}
 */
function parseUrlsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File tidak ditemukan: ${filePath}`);
  }

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const entries = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Lewati baris kosong dan komentar
    if (!line || line.startsWith('#')) continue;

    const parts = line.split('|');
    const url = (parts[0] || '').trim();
    const pageName = (parts[1] || url).trim();

    if (url) {
      entries.push({ url, pageName });
    }
  }

  return entries;
}

async function run() {
  console.log('====================================');
  console.log('🤖 AUTOMATION BOT - EXPLORE MODE');
  console.log('====================================');

  const urlsFile = process.env.URLS_FILE || 'urls.txt';
  const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');

  let urlEntries;
  try {
    urlEntries = parseUrlsFile(urlsFile);
  } catch (err) {
    console.error(`❌ Gagal membaca ${urlsFile}: ${err.message}`);
    process.exit(1);
  }

  if (urlEntries.length === 0) {
    console.error('❌ Tidak ada URL ditemukan di file urls.txt');
    process.exit(1);
  }

  console.log(`📋 Total URL: ${urlEntries.length}`);
  console.log('====================================');

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: Number(process.env.SLOW_MO || 300),
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  console.log('🔐 Login...');
  try {
    await login(page);
    console.log('✅ Login berhasil!\n');
  } catch (err) {
    console.error(`❌ Login gagal: ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  // Test setiap halaman
  const allResults = [];
  let globalNo = 1;

  for (const { url, pageName } of urlEntries) {
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
    console.log(`\n📄 Testing: ${pageName} (${fullUrl})`);
    console.log('------------------------------------');

    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      const results = await scanPage(page, url, pageName, globalNo);
      allResults.push(...results);
      globalNo += results.length;

      const pass = results.filter((r) => r.status === 'PASS').length;
      const fail = results.filter((r) => r.status === 'FAIL').length;
      const skip = results.filter((r) => r.status === 'SKIP').length;
      const manual = results.filter((r) => r.status === 'MANUAL').length;
      console.log(`  ✅ PASS: ${pass} | ❌ FAIL: ${fail} | ⏭️ SKIP: ${skip} | ⚠️ MANUAL: ${manual}`);
    } catch (err) {
      console.error(`  ❌ Error saat testing ${pageName}: ${err.message}`);
    }
  }

  await browser.close();

  if (allResults.length === 0) {
    console.log('\n⚠️ Tidak ada hasil test yang dihasilkan.');
    process.exit(0);
  }

  // Generate Excel report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputPath = path.join('results', `test-report-${timestamp}.xlsx`);

  if (!fs.existsSync('results')) fs.mkdirSync('results', { recursive: true });

  await generateReport(allResults, outputPath);

  // Summary
  const total = allResults.length;
  const passed = allResults.filter((r) => r.status === 'PASS').length;
  const failed = allResults.filter((r) => r.status === 'FAIL').length;
  const skipped = allResults.filter((r) => r.status === 'SKIP').length;
  const manualCount = allResults.filter((r) => r.status === 'MANUAL').length;

  console.log('\n====================================');
  console.log('📊 SUMMARY');
  console.log('====================================');
  console.log(`Total Halaman : ${urlEntries.length}`);
  console.log(`Total Elemen  : ${total}`);
  console.log(`Passed        : ${passed} (${total > 0 ? Math.round((passed / total) * 100) : 0}%)`);
  console.log(`Failed        : ${failed} (${total > 0 ? Math.round((failed / total) * 100) : 0}%)`);
  console.log(`Skipped       : ${skipped}`);
  console.log(`Manual        : ${manualCount}`);
  console.log('====================================');
  console.log(`📁 Report tersimpan di: ${outputPath}`);
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
