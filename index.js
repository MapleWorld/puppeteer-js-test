const puppeteer = require('puppeteer-extra');
const StealthPlugin = require( 'puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require( 'puppeteer-extra-plugin-adblocker');

// Add stealth and adblocker plugins to puppeteer
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TURNSTILE_LOAD_DELAY = 3000;
const TURNSTILE_VALIDATION_DELAY = 2000;


async function scrapeWebsite() {
    let browser;

    try {
        console.log('Starting browser...');

        // Launch browser
        browser = await puppeteer.launch({
            headless: 'shell',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        // Create new page
        const page = await browser.newPage();

        // Set viewport size
        await page.setViewport({ width: 1280, height: 720 });
        
        await page.setUserAgent(USER_AGENT);
            // 2. Extra Stealth: Fix WebDriver Overrides
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // Navigate to website
        console.log('Navigating to website...');
        await page.goto('https://railway.com', {
            waitUntil: 'networkidle2'
        });

        // Get page title
        const title = await page.title();
        console.log('Page title:', title);

        // Get text content from h1
        const heading = await page.$eval('h1', el => el.textContent);
        console.log('Main heading:', heading);

        // TODO: Add your scraping logic here
        // Examples:

        // Get all links
        // const links = await page.$$eval('a', links =>
        //   links.map(link => ({
        //     text: link.textContent,
        //     href: link.href
        //   }))
        // );

        // Fill out a form
        // await page.type('#search-input', 'your search term');
        // await page.click('#search-button');
        // await page.waitForNavigation();

        // Wait for specific element
        // await page.waitForSelector('.results', { timeout: 5000 });

        console.log('Scraping completed successfully!');

    } catch (error) {
        console.error('Error occurred:', error);
    } finally {
        // Always close the browser
        if (browser) {
            await browser.close();
            console.log('Browser closed');
        }
    }
}

// Run the scraping function
scrapeWebsite();
