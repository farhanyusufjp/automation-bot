/**
 * login.js
 * Module untuk handle login otomatis ke website target.
 * Mencoba berbagai selector umum untuk form login.
 */

async function login(page) {
  const baseUrl = process.env.BASE_URL;
  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;
  const loginUrl = process.env.LOGIN_URL || `${baseUrl}/login`;

  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

  const usernameSelectors = [
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    'input[placeholder*="username" i]',
    'input[placeholder*="email" i]',
    'input[id*="username" i]',
    'input[id*="email" i]',
    '#username',
    '#email',
  ];

  const passwordSelectors = [
    'input[name="password"]',
    'input[type="password"]',
    'input[placeholder*="password" i]',
    '#password',
  ];

  const submitSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign In")',
    'button:has-text("Masuk")',
  ];

  for (const sel of usernameSelectors) {
    if (await page.isVisible(sel).catch(() => false)) {
      await page.fill(sel, username);
      break;
    }
  }

  for (const sel of passwordSelectors) {
    if (await page.isVisible(sel).catch(() => false)) {
      await page.fill(sel, password);
      break;
    }
  }

  for (const sel of submitSelectors) {
    if (await page.isVisible(sel).catch(() => false)) {
      await page.click(sel);
      break;
    }
  }

  await page.waitForLoadState('networkidle').catch(() => {});

  const currentUrl = page.url();
  const loginUrlNormalized = loginUrl.replace(/\/$/, '');
  if (currentUrl.replace(/\/$/, '') === loginUrlNormalized || currentUrl.replace(/\?.*$/, '').endsWith('/login')) {
    throw new Error('Login gagal! Cek USERNAME dan PASSWORD di file .env');
  }

  return { success: true, message: `Login berhasil. Redirect ke: ${currentUrl}` };
}

module.exports = { login };
