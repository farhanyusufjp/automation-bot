/**
 * actions.js
 * Kumpulan semua fungsi aksi yang dapat dipanggil dari test case Excel
 * Setiap aksi dibungkus try/catch dan mengembalikan { success, message }
 */

const fs = require('fs');
const path = require('path');

/**
 * Navigasi ke URL tertentu
 * @param {object} page - Playwright page object
 * @param {string} url - URL tujuan (jika kosong gunakan BASE_URL dari .env)
 */
async function navigate(page, url) {
  const target = url || process.env.BASE_URL;
  try {
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    return { success: true, message: `Navigated to ${target}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Mengisi input field dengan value tertentu
 * @param {object} page - Playwright page object
 * @param {string} selector - CSS selector elemen input
 * @param {string} value - Nilai yang akan diisi
 */
async function fill(page, selector, value) {
  try {
    await page.fill(selector, value);
    return { success: true, message: `Filled "${value}" into ${selector}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Mengklik elemen
 * @param {object} page - Playwright page object
 * @param {string} selector - CSS selector elemen yang diklik
 */
async function click(page, selector) {
  try {
    await page.click(selector);
    return { success: true, message: `Clicked ${selector}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Memastikan teks elemen sesuai dengan expected
 * @param {object} page - Playwright page object
 * @param {string} selector - CSS selector elemen
 * @param {string} expected - Teks yang diharapkan
 */
async function assert_text(page, selector, expected) {
  try {
    const actual = await page.textContent(selector);
    const trimmed = (actual || '').trim();
    if (trimmed === expected) {
      return { success: true, message: `Text matched: "${expected}"` };
    }
    return {
      success: false,
      message: `Expected "${expected}" but got "${trimmed}"`,
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Memastikan elemen terlihat di halaman
 * @param {object} page - Playwright page object
 * @param {string} selector - CSS selector elemen
 */
async function assert_visible(page, selector) {
  try {
    const visible = await page.isVisible(selector);
    if (visible) {
      return { success: true, message: `Element ${selector} is visible` };
    }
    return { success: false, message: `Element ${selector} is not visible` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Memastikan URL halaman sekarang sesuai expected
 * @param {object} page - Playwright page object
 * @param {string} expected - URL atau bagian URL yang diharapkan
 */
async function assert_url(page, expected) {
  try {
    const currentUrl = page.url();
    if (currentUrl.includes(expected)) {
      return { success: true, message: `URL contains "${expected}"` };
    }
    return {
      success: false,
      message: `Expected URL to contain "${expected}" but got "${currentUrl}"`,
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Menunggu beberapa millisecond
 * @param {object} page - Playwright page object
 * @param {string|number} ms - Durasi tunggu dalam millisecond
 */
async function wait(page, ms) {
  try {
    await page.waitForTimeout(Number(ms));
    return { success: true, message: `Waited ${ms}ms` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Mengambil screenshot dan menyimpannya ke folder screenshots/
 * @param {object} page - Playwright page object
 * @param {string} name - Nama file screenshot (tanpa ekstensi)
 */
async function screenshot(page, name) {
  try {
    const screenshotsDir = path.resolve('screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    const filePath = path.join(screenshotsDir, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    return { success: true, message: `Screenshot saved to ${filePath}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Memilih option pada dropdown/select element
 * @param {object} page - Playwright page object
 * @param {string} selector - CSS selector elemen select
 * @param {string} value - Nilai option yang dipilih
 */
async function select(page, selector, value) {
  try {
    await page.selectOption(selector, value);
    return { success: true, message: `Selected "${value}" in ${selector}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Mengosongkan isi input field
 * @param {object} page - Playwright page object
 * @param {string} selector - CSS selector elemen input
 */
async function clear(page, selector) {
  try {
    await page.fill(selector, '');
    return { success: true, message: `Cleared ${selector}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Hover (mengarahkan kursor) ke elemen
 * @param {object} page - Playwright page object
 * @param {string} selector - CSS selector elemen
 */
async function hover(page, selector) {
  try {
    await page.hover(selector);
    return { success: true, message: `Hovered over ${selector}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Menekan tombol keyboard pada elemen
 * @param {object} page - Playwright page object
 * @param {string} selector - CSS selector elemen
 * @param {string} key - Nama tombol (misal: Enter, Tab, Escape)
 */
async function press_key(page, selector, key) {
  try {
    await page.press(selector, key);
    return { success: true, message: `Pressed "${key}" on ${selector}` };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

module.exports = {
  navigate,
  fill,
  click,
  assert_text,
  assert_visible,
  assert_url,
  wait,
  screenshot,
  select,
  clear,
  hover,
  press_key,
};
