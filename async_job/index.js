import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import os from 'os';

// Add stealth and adblocker plugins to puppeteer
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
 
/**
 * Configuration constants
 */
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';


/**
 * Delay helper function
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 100) + ms));
}

/**
 * Setup browser and page with anti-detection measures and proper configuration
 * @param {boolean} debug - Enable debug mode
 * @param {boolean} useAdvanced - Use puppeteer-real-browser (advanced mode with built-in turnstile handling)
 * @returns {Promise<{browser: Browser, page: Page}>}
 */
async function setupBrowser(debug = false, useAdvanced = false) {
  let browser, page;

  // Default mode: Use puppeteer-extra with stealth plugin
  console.log('Using default mode (puppeteer-extra + stealth)');
  browser = await puppeteer.launch({
    headless: debug ? false : true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ],
  });

  page = await browser.newPage();

  // 1. Set a realistic User Agent (Critical)
  await page.setUserAgent(USER_AGENT);

  // 2. Extra Stealth: Fix WebDriver Overrides
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  return { browser, page };
}

/**
 * Automate booking process using Puppeteer
 * @param {Object} reservation - Reservation details from database
 * @param {Object} slot - Available time slot details
 * @param {boolean} debug - Enable debug mode (non-headless, slower)
 * @param {boolean} useAdvanced - Use puppeteer-real-browser (advanced mode)
 * @returns {Promise<boolean>} - True if booking successful, false otherwise
 */
async function automateBooking(r) {
  console.log(`Running on (${os.platform()}) platform`);
  await startPuppeteer();
}

async function startPuppeteer() {
  let browser = null;
    
    console.log(`Starting automated booking for reservation`);

    // Setup browser and page
    const setup = await setupBrowser();
    browser = setup.browser;
    const page = setup.page;

    // Navigate to reservation page
    console.log(`Navigating to https://kirbycafe-reserve.com/guest/hakata/reserve/`);
    await page.goto('https://kirbycafe-reserve.com/guest/hakata/reserve/', { waitUntil: 'networkidle2', timeout: 5000 });

    // Wait for the page to load and handle initial dialog
    await delay(500);

    // Close the initial dialog popup
    console.log('Closing initial dialog popup');
    await closeInitialDialog(page);

    // Wait for dialog to close
    await delay(500);
    process.exit(0);
}

/**
 * Close the initial dialog popup
 * @param {Page} page - Puppeteer page object
 */
async function closeInitialDialog(page) {
  try {
    // Wait for and click any button containing "OK" text
    const okButton = await page.waitForSelector('button', { timeout: 3000 });
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const okBtn = buttons.find(btn => 
        btn.textContent.trim().toUpperCase() === 'OK' ||
        btn.textContent.trim() === 'ОК' ||
        btn.value === 'OK'
      );
      if (okBtn) {
        okBtn.click();
        return true;
      }
      return false;
    });
    
    if (clicked) {
      console.log('Found and clicked OK button in dialog');
    } else {
      console.warn('No OK button found in dialog');
    }
  } catch (error) {
    console.warn('No initial dialog found or already closed:', error.message);
  }
}


await automateBooking();