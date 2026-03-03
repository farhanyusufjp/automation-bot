/**
 * scenarioParser.js
 * Menerjemahkan teks Scenario dari Excel menjadi list aksi Playwright
 * menggunakan keyword matching.
 */

/**
 * Daftar scenario yang harus ditandai MANUAL (tidak bisa diotomasi)
 */
const MANUAL_KEYWORDS = [
  /drag and drop/i,
  /klik ['"]drag['"]/i,
  /klik ['"]zoom slider['"]/i,
  /zoom slider/i,
  /klik ['"]flip['"]/i,
  /klik ['"]rotasi['"]/i,
];

/**
 * Menerjemahkan satu baris Scenario menjadi array of action steps.
 * @param {string} scenario - Teks scenario dari kolom Scenario Excel
 * @param {string} expectedResult - Teks expected result (opsional, untuk konteks)
 * @param {string} testNo - Nomor test case (untuk penamaan screenshot)
 * @returns {Array<{action: string, target: string, description: string}>}
 */
function parseScenario(scenario, expectedResult = '', testNo = '') {
  if (!scenario) return [];

  const steps = [];
  const s = scenario.trim();

  // ── MANUAL check ─────────────────────────────────────────────────────────
  for (const pattern of MANUAL_KEYWORDS) {
    if (pattern.test(s)) {
      steps.push({ action: 'manual', target: '', description: s });
      return steps;
    }
  }

  // ── NAVIGATE ─────────────────────────────────────────────────────────────
  const navigateMatch = s.match(/^buka halaman\s+(.+)/i);
  if (navigateMatch) {
    steps.push({
      action: 'navigate',
      target: navigateMatch[1].trim(),
      description: `Navigasi ke ${navigateMatch[1].trim()}`,
    });
    steps.push({
      action: 'wait_for_page_load',
      target: '',
      description: 'Tunggu halaman selesai load',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // ── CLICK (modal/popup context) ───────────────────────────────────────────
  // Deteksi "Klik '...' pada pop up ..."
  const clickModalMatch = s.match(/klik ['"](.+?)['"]\s+pada\s+pop\s*up/i);
  if (clickModalMatch) {
    const btnText = clickModalMatch[1].trim();
    steps.push({
      action: 'click_text',
      target: btnText,
      description: `Klik tombol "${btnText}" di dalam modal`,
    });
    steps.push({
      action: 'assert_element_visible',
      target: '.modal, [role="dialog"], .popup, .confirm',
      description: 'Cek modal/popup terlihat',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // ── CLICK (generic "Klik '...'") ─────────────────────────────────────────
  const clickMatch = s.match(/klik ['"](.+?)['"]/i);
  if (clickMatch) {
    const btnText = clickMatch[1].trim();
    steps.push({
      action: 'click_text',
      target: btnText,
      description: `Klik tombol "${btnText}"`,
    });

    // Jika klik "Create New" atau sejenisnya, cek popup/modal muncul
    if (/create new|tambah|add new/i.test(btnText)) {
      steps.push({
        action: 'assert_element_visible',
        target: '.modal, [role="dialog"], .popup',
        description: 'Cek popup/modal muncul setelah klik Create New',
      });
    }

    // Jika klik "Save Crop Image"
    if (/save crop image/i.test(btnText)) {
      steps.push({
        action: 'assert_element_visible',
        target: '.success, .alert-success, [class*="success"]',
        description: 'Cek notifikasi sukses setelah simpan crop',
      });
    }

    addScreenshot(steps, testNo, s);
    return steps;
  }

  // ── CHECK / ASSERT ────────────────────────────────────────────────────────

  // "Cek valid data yang ditampilkan" → assert table/list visible
  if (/cek valid data yang ditampilkan/i.test(s)) {
    steps.push({
      action: 'assert_table_has_data',
      target: 'table',
      description: 'Cek tabel/list berisi data',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek valid hasil search" → assert hasil search visible
  if (/cek valid hasil search/i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: 'table tbody tr, .search-results, .data-list',
      description: 'Cek hasil search terlihat',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek upload file tidak sesuai format" → assert error message
  if (/cek upload file tidak sesuai format/i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: '.error, .alert-danger, .validation-message, [class*="error"]',
      description: 'Cek pesan error format file tidak sesuai',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek upload file melebihi batas ukuran" → assert error message
  if (/cek upload file melebihi batas ukuran/i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: '.error, .alert-danger, .validation-message, [class*="error"]',
      description: 'Cek pesan error ukuran file melebihi batas',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek upload file yang sesuai" → assert success
  if (/cek upload file yang sesuai/i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: '.success, .alert-success, [class*="success"]',
      description: 'Cek upload file berhasil',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek validasi '...'" → assert validation message
  const cekValidasiMatch = s.match(/cek validasi ['"](.+?)['"]/i);
  if (cekValidasiMatch) {
    steps.push({
      action: 'assert_element_visible',
      target: '.validation-message, .error, .alert, [class*="invalid"]',
      description: `Cek pesan validasi: ${cekValidasiMatch[1]}`,
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek pengisian '...' melebihi batas input" → assert validation
  if (/cek pengisian .+ melebihi batas input/i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: '.validation-message, .error, .alert, [class*="invalid"]',
      description: 'Cek validasi input melebihi batas',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek pengisian '...' menggunakan karakter" → assert validation
  if (/cek pengisian .+ menggunakan karakter/i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: '.validation-message, .error, .alert, [class*="invalid"]',
      description: 'Cek validasi karakter tidak valid',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek pengisian '...' menggunakan angka" → assert validation/allowed
  if (/cek pengisian .+ menggunakan angka/i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: '.validation-message, .error, .alert, [class*="invalid"]',
      description: 'Cek validasi input angka',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek melakukan perubahan dengan data" → assert data changed
  if (/cek melakukan perubahan dengan data/i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: '.success, .alert-success, table, .data-list',
      description: 'Cek data berhasil diubah',
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // "Cek fungsi ..." yang tidak masuk MANUAL (generic cek)
  if (/^cek /i.test(s)) {
    steps.push({
      action: 'assert_element_visible',
      target: 'table, .content, .result, main',
      description: `Cek: ${s}`,
    });
    addScreenshot(steps, testNo, s);
    return steps;
  }

  // ── DEFAULT: tidak dikenali → MANUAL ─────────────────────────────────────
  steps.push({ action: 'manual', target: '', description: s });
  return steps;
}

/**
 * Tambah langkah screenshot di akhir group step
 * @param {Array} steps
 * @param {string} testNo
 * @param {string} scenario
 */
function addScreenshot(steps, testNo, scenario) {
  const safeNo = (testNo || 'step').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const safeScenario = scenario.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const safeName = (safeNo + '-' + safeScenario).slice(0, 80);
  steps.push({
    action: 'screenshot',
    target: safeName,
    description: `Screenshot: ${testNo}`,
  });
}

module.exports = { parseScenario };
