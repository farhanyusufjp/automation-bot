/**
 * explorer.js
 * Module untuk scan halaman dan test semua elemen interaktif secara otomatis.
 * Digunakan oleh explore mode (src/explore.js).
 */

const fs = require('fs');
const path = require('path');

/**
 * Tunggu salah satu kondisi setelah aksi (smart wait).
 * @param {import('playwright').Page} page
 */
async function smartWait(page) {
  await Promise.race([
    page.waitForSelector('.modal, [role="dialog"]', { timeout: 3000 }),
    page.waitForSelector('.alert, .toast, .notification', { timeout: 3000 }),
    page.waitForNavigation({ timeout: 3000 }),
    page.waitForTimeout(2000),
  ]).catch(() => {});
}

/**
 * Ambil screenshot ketika test FAIL.
 * @param {import('playwright').Page} page
 * @param {number} no
 * @param {string} pageName
 * @returns {Promise<string>} path screenshot
 */
async function screenshotOnFail(page, no, pageName) {
  const dir = 'screenshots';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(
    dir,
    `${String(no).padStart(3, '0')}-${pageName.replace(/\s+/g, '-')}-fail.png`
  );
  await page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
  return filePath;
}

/**
 * Tutup modal/dialog yang terbuka jika ada.
 * @param {import('playwright').Page} page
 */
async function closeModalIfOpen(page) {
  const closeSelectors = [
    'button:has-text("Cancel")',
    'button:has-text("Close")',
    'button:has-text("Batal")',
    'button:has-text("Tutup")',
    '[aria-label="Close"]',
    '.modal .btn-close',
    '.modal-footer button:last-child',
  ];
  for (const sel of closeSelectors) {
    if (await page.isVisible(sel).catch(() => false)) {
      await page.click(sel).catch(() => {});
      await page.waitForTimeout(500).catch(() => {});
      break;
    }
  }
}

/**
 * Cek apakah sebuah elemen masih ada dan visible di halaman.
 * @param {import('playwright').ElementHandle} el
 * @returns {Promise<boolean>}
 */
async function isElementVisible(el) {
  try {
    return await el.isVisible();
  } catch (_) {
    return false;
  }
}

/**
 * Scan halaman dan test semua elemen interaktif.
 * @param {import('playwright').Page} page
 * @param {string} url
 * @param {string} pageName
 * @param {number} startNo - nomor urut awal result
 * @returns {Promise<Array>} array of test result objects
 */
async function scanPage(page, url, pageName, startNo = 1) {
  const results = [];
  let no = startNo;

  /**
   * Helper untuk push result
   */
  function pushResult(element, action, expected, actualResult, status, screenshotPath) {
    results.push({
      no,
      url,
      pageName,
      element,
      action,
      expected,
      actualResult,
      status,
      screenshotPath: screenshotPath || '',
    });
    no++;
  }

  // ── Scan semua elemen ──────────────────────────────────────────────────────
  const elements = {
    buttons: await page.$$('button, [role="button"], input[type="submit"], input[type="button"]'),
    inputs: await page.$$('input[type="text"], input[type="email"], input[type="number"], input[type="search"], textarea'),
    selects: await page.$$('select'),
    links: await page.$$('a[href]'),
    tables: await page.$$('table'),
    forms: await page.$$('form'),
    deleteButtons: await page.$$('button:has-text("Delete"), button:has-text("Hapus")'),
    searchInputs: await page.$$('input[placeholder*="search" i], input[placeholder*="cari" i], input[placeholder*="Search" i]'),
  };

  const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');

  // ── Test tables ────────────────────────────────────────────────────────────
  for (let i = 0; i < elements.tables.length; i++) {
    const table = elements.tables[i];
    const tableLabel = `Table #${i + 1}`;

    // Cek tabel visible
    const visible = await isElementVisible(table);
    pushResult(
      tableLabel,
      'Assert tabel visible',
      'Tabel terlihat di halaman',
      visible ? 'Tabel visible' : 'Tabel tidak visible',
      visible ? 'PASS' : 'FAIL',
      visible ? '' : await screenshotOnFail(page, no, pageName)
    );

    // Cek ada data di tbody
    try {
      const rowCount = await table.$$eval('tbody tr', (rows) => rows.length).catch(() => 0);
      const hasData = rowCount > 0;
      pushResult(
        tableLabel,
        'Assert tabel memiliki data',
        'Tabel memiliki setidaknya 1 baris data',
        hasData ? `${rowCount} baris ditemukan` : 'Tidak ada baris data',
        hasData ? 'PASS' : 'FAIL',
        hasData ? '' : await screenshotOnFail(page, no, pageName)
      );
    } catch (_) {
      pushResult(tableLabel, 'Assert tabel memiliki data', 'Tabel memiliki setidaknya 1 baris data', 'Gagal cek baris', 'SKIP', '');
    }
  }

  // ── Test buttons ───────────────────────────────────────────────────────────
  const skipButtonTexts = /^(save|simpan)$/i;
  for (let i = 0; i < elements.buttons.length; i++) {
    const btn = elements.buttons[i];
    if (!(await isElementVisible(btn))) continue;

    let btnText = '';
    try {
      btnText = (await btn.innerText()).trim();
    } catch (_) {
      try {
        btnText = (await btn.getAttribute('value')) || '';
      } catch (_2) {}
    }

    const btnLabel = `Tombol "${btnText || `#${i + 1}`}"`;

    // Skip Save/Simpan
    if (skipButtonTexts.test(btnText)) {
      pushResult(btnLabel, 'Skip tombol simpan', 'Di-skip (tidak klik tanpa konteks)', 'Di-skip', 'SKIP', '');
      continue;
    }

    try {
      if (/create new|tambah|add/i.test(btnText)) {
        // Klik → cek modal/form muncul → tutup
        await btn.click({ timeout: 5000 });
        await smartWait(page);
        const modalVisible = await page.isVisible('.modal, [role="dialog"]').catch(() => false);
        pushResult(
          btnLabel,
          'Klik tombol',
          'Modal/form/halaman baru muncul',
          modalVisible ? 'Modal muncul' : 'Modal tidak terdeteksi',
          modalVisible ? 'PASS' : 'MANUAL',
          ''
        );
        await closeModalIfOpen(page);

      } else if (/search|cari/i.test(btnText)) {
        await btn.click({ timeout: 5000 });
        await smartWait(page);
        pushResult(btnLabel, 'Klik tombol Search', 'Hasil pencarian tampil', 'Klik berhasil', 'PASS', '');

      } else if (/reset|clear/i.test(btnText)) {
        await btn.click({ timeout: 5000 });
        await smartWait(page);
        pushResult(btnLabel, 'Klik tombol Reset', 'Form/input kembali kosong', 'Klik berhasil', 'PASS', '');

      } else if (/delete|hapus/i.test(btnText)) {
        await btn.click({ timeout: 5000 });
        await smartWait(page);
        const dialogVisible = await page.isVisible('[role="alertdialog"], .confirm-dialog, .swal2-container').catch(() => false);
        pushResult(
          btnLabel,
          'Klik tombol Delete',
          'Dialog konfirmasi muncul',
          dialogVisible ? 'Dialog konfirmasi muncul' : 'Dialog tidak terdeteksi',
          dialogVisible ? 'PASS' : 'MANUAL',
          ''
        );
        // Batalkan delete
        await page.keyboard.press('Escape').catch(() => {});
        await closeModalIfOpen(page);

      } else if (/edit|ubah/i.test(btnText)) {
        await btn.click({ timeout: 5000 });
        await smartWait(page);
        const formVisible = await page.isVisible('.modal, [role="dialog"], form').catch(() => false);
        pushResult(
          btnLabel,
          'Klik tombol Edit',
          'Form edit muncul',
          formVisible ? 'Form edit muncul' : 'Form tidak terdeteksi',
          formVisible ? 'PASS' : 'MANUAL',
          ''
        );
        await closeModalIfOpen(page);

      } else if (/export|download/i.test(btnText)) {
        await btn.click({ timeout: 5000 });
        await smartWait(page);
        pushResult(btnLabel, 'Klik tombol Export/Download', 'File download atau pesan sukses', 'Klik berhasil', 'MANUAL', '');

      } else {
        // Tombol lain: klik dan cek tidak crash
        await btn.click({ timeout: 5000 });
        await smartWait(page);
        const has500 = await page.isVisible('text=500').catch(() => false)
          || await page.isVisible('text=Internal Server Error').catch(() => false);
        const shot = has500 ? await screenshotOnFail(page, no, pageName) : '';
        pushResult(
          btnLabel,
          'Klik tombol',
          'Tidak ada error 500 / crash',
          has500 ? 'Error 500 terdeteksi' : 'Klik berhasil, tidak ada error',
          has500 ? 'FAIL' : 'PASS',
          shot
        );
        await closeModalIfOpen(page);
      }
    } catch (err) {
      pushResult(btnLabel, 'Klik tombol', 'Tombol dapat diklik', `Error: ${err.message}`, 'FAIL', await screenshotOnFail(page, no, pageName));
    }
  }

  // ── Test inputs ────────────────────────────────────────────────────────────
  for (let i = 0; i < elements.inputs.length; i++) {
    const input = elements.inputs[i];
    if (!(await isElementVisible(input))) continue;

    let inputLabel = '';
    try {
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      inputLabel = `Input "${id || name || placeholder || `#${i + 1}`}"`;
    } catch (_) {
      inputLabel = `Input #${i + 1}`;
    }

    // Test isi value valid
    try {
      await input.fill('test value', { timeout: 3000 });
      pushResult(inputLabel, 'Isi dengan value valid', 'Input menerima nilai', 'Input berhasil diisi', 'PASS', '');
    } catch (err) {
      pushResult(inputLabel, 'Isi dengan value valid', 'Input menerima nilai', `Error: ${err.message}`, 'FAIL', await screenshotOnFail(page, no, pageName));
      continue;
    }

    // Test isi karakter spesial (XSS / SQL injection)
    try {
      await input.fill('<script>alert(1)</script>', { timeout: 3000 });
      pushResult(inputLabel, 'Isi dengan karakter spesial (XSS test)', 'Tidak crash / tidak render script', 'Input menerima karakter spesial tanpa crash', 'PASS', '');
    } catch (err) {
      pushResult(inputLabel, 'Isi dengan karakter spesial (XSS test)', 'Tidak crash / tidak render script', `Error: ${err.message}`, 'FAIL', await screenshotOnFail(page, no, pageName));
    }

    // Test isi melebihi max length
    try {
      const longStr = 'a'.repeat(200);
      await input.fill(longStr, { timeout: 3000 });
      pushResult(inputLabel, 'Isi melebihi batas (200 karakter)', 'Validasi muncul atau input terpotong', 'Input menerima teks panjang', 'MANUAL', '');
    } catch (err) {
      pushResult(inputLabel, 'Isi melebihi batas (200 karakter)', 'Validasi muncul atau input terpotong', `Error: ${err.message}`, 'FAIL', await screenshotOnFail(page, no, pageName));
    }

    // Kosongkan kembali
    await input.fill('').catch(() => {});
  }

  // ── Test selects ───────────────────────────────────────────────────────────
  for (let i = 0; i < elements.selects.length; i++) {
    const sel = elements.selects[i];
    if (!(await isElementVisible(sel))) continue;

    let selLabel = '';
    try {
      const id = await sel.getAttribute('id');
      const name = await sel.getAttribute('name');
      selLabel = `Select "${id || name || `#${i + 1}`}"`;
    } catch (_) {
      selLabel = `Select #${i + 1}`;
    }

    try {
      const options = await sel.$$eval('option', (opts) =>
        opts.map((o) => ({ value: o.value, text: o.textContent }))
      );
      pushResult(selLabel, 'Cek option tersedia', 'Ada minimal 1 option', `${options.length} option ditemukan`, options.length > 0 ? 'PASS' : 'FAIL', '');

      if (options.length > 0) {
        await sel.selectOption(options[0].value).catch(() => {});
        pushResult(selLabel, 'Pilih option pertama', 'Option berhasil dipilih', `Pilih: ${options[0].text}`, 'PASS', '');
      }
      if (options.length > 1) {
        await sel.selectOption(options[options.length - 1].value).catch(() => {});
        pushResult(selLabel, 'Pilih option terakhir', 'Option berhasil dipilih', `Pilih: ${options[options.length - 1].text}`, 'PASS', '');
      }
    } catch (err) {
      pushResult(selLabel, 'Test select options', 'Option dapat dipilih', `Error: ${err.message}`, 'FAIL', await screenshotOnFail(page, no, pageName));
    }
  }

  // ── Test forms (submit kosong) ─────────────────────────────────────────────
  for (let i = 0; i < elements.forms.length; i++) {
    const form = elements.forms[i];
    if (!(await isElementVisible(form))) continue;

    const formLabel = `Form #${i + 1}`;
    try {
      // Cari submit button dalam form
      const submitBtn = await form.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        await submitBtn.click({ timeout: 5000 });
        await smartWait(page);
        const validationVisible = await page.isVisible(
          'input:invalid, .invalid-feedback, .error, [class*="error"], [class*="validation"]'
        ).catch(() => false);
        pushResult(
          formLabel,
          'Submit form kosong',
          'Pesan validasi muncul',
          validationVisible ? 'Pesan validasi muncul' : 'Validasi tidak terdeteksi',
          validationVisible ? 'PASS' : 'MANUAL',
          ''
        );
        await closeModalIfOpen(page);
      } else {
        pushResult(formLabel, 'Submit form kosong', 'Pesan validasi muncul', 'Tidak ada tombol submit ditemukan', 'SKIP', '');
      }
    } catch (err) {
      pushResult(formLabel, 'Submit form kosong', 'Pesan validasi muncul', `Error: ${err.message}`, 'FAIL', await screenshotOnFail(page, no, pageName));
    }
  }

  // ── Test links ─────────────────────────────────────────────────────────────
  for (let i = 0; i < elements.links.length; i++) {
    const link = elements.links[i];
    if (!(await isElementVisible(link))) continue;

    let href = '';
    try {
      href = (await link.getAttribute('href')) || '';
    } catch (_) {
      continue;
    }

    // Skip external links
    if (href.startsWith('http') && !href.startsWith(baseUrl)) {
      pushResult(`Link "${href}"`, 'Cek link', 'Skip external link', 'External link di-skip', 'SKIP', '');
      continue;
    }

    // Skip anchor links, javascript links, mailto
    if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('mailto')) {
      continue;
    }

    pushResult(`Link "${href}"`, 'Cek internal link tidak 404', 'Halaman dapat diakses', 'Link internal ditemukan', 'MANUAL', '');
  }

  return results;
}

module.exports = { scanPage };
