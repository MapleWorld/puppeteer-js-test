import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import os from 'os';

// Add stealth and adblocker plugins to puppeteer
// puppeteer.use(StealthPlugin());
// puppeteer.use(AdblockerPlugin({ blockTrackers: true }));
 
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
    headless: false,
  });

  page = await browser.newPage();

  // 1. Set a realistic User Agent (Critical)
  //await page.setUserAgent(USER_AGENT);

  // 2. Extra Stealth: Fix WebDriver Overrides
  // await page.evaluateOnNewDocument(() => {
  //   Object.defineProperty(navigator, 'webdriver', { get: () => false });
  // });

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

    // Select party size
    console.log(`Selecting party size:2`);
    await selectPartySize(page, 2);

    // Wait for calendar to load
    await delay(5000);

    // Navigate to the correct month if needed
    console.log(`Navigating to month for date: 2026-02-15`);
    await navigateToMonth(page, '2026-02-15');

    // Wait for calendar to update
    await delay(10000);

    // Select the date and time from calendar
    console.log(`Selecting date: '2026-02-15' and time: 16:00`);
    await selectDateTimeFromCalendar(page, '2026-02-15', '16:00');

    // Wait for dialog to load
    await delay(1000);

    // Fill in the reservation form
    console.log('Opening up the reservation form');
    await fillReservationForm(page);
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


async function selectPartySize(page, partySize) {
  try {
    // Wait for the input field to appear
    const dropdownSelector = '#input-29';
    await page.waitForSelector(dropdownSelector, { timeout: 1000 });
    await page.click(dropdownSelector);

    // Wait for the dropdown list to become visible
    await page.waitForSelector('.v-list-item__title', { visible: true });

    // Click on the appropriate party size option
    const partySizeText = `${partySize}名様`;
    const clicked = await page.evaluate((text) => {
      const options = Array.from(document.querySelectorAll('.v-list-item__title'));
      const option = options.find(opt => opt.textContent.trim() === text);
      if (option) {
        option.click();
        return true;
      }
      return false;
    }, partySizeText);

    if (!clicked) {
      throw new Error(`Could not find party size option for ${partySize}`);
    }

    console.log(`Selected party size: ${partySizeText}`);
  } catch (error) {
    console.error('Error selecting party size:', error);
    throw error;
  }
}

async function navigateToMonth(page, targetDate) {
  try {
    const targetMonth = new Date(targetDate).getUTCMonth() + 1; // 1-12

    const currentMonthSelector = '.calendar-area .body-1';
    const prevButtonSelector = '.calendar-area button:first-of-type';
    const nextButtonSelector = '.calendar-area button:last-of-type';

    // 1. Get the current month (e.g., extracts 2 from "2026年2月")
    const currentMonthText = await page.$eval(currentMonthSelector, el => el.textContent);
    const currentMonthNum = parseInt(currentMonthText.match(/(\d+)月/)[1]);
    console.log(`Current month: ${currentMonthNum}月, Target month: ${targetMonth}月`);

    // 2. One-time check and click
    if (targetMonth > currentMonthNum) {
      console.log(`Navigating forward to ${currentMonthNum + 1}月`);
      await page.click(nextButtonSelector);
      await page.waitForSelector('.calendar-container', { visible: true }); // Wait for table refresh
    } 
    else if (targetMonth < currentMonthNum) {
      console.log(`Navigating backward to ${currentMonthNum - 1}月`);
      await page.click(prevButtonSelector);
      await page.waitForSelector('.calendar-container', { visible: true });
    } 
    else {
      console.log('Already on the target month.');
    }
  } catch (error) {
    console.error('Error navigating to month:', error);
    throw error;
  }
}

async function selectDateTimeFromCalendar(page, date, time) {
  try {
    const targetDay = new Date(date).getUTCDate(); // Day of month (1-31)

    // Wait for calendar table to be visible
    await page.waitForSelector('.calendar-container table', { timeout: 5000 });

    // Find and click the available slot matching the specific time
    const clicked = await page.evaluate((day, targetTime) => {
      const table = document.querySelector('.calendar-container table');
      if (!table) {
        console.log('No table found');
        return false;
      }

      // Find the column index for the target day
      const headers = Array.from(table.querySelectorAll('thead th'));
      let dayColumnIndex = -1;
      
      for (let i = 0; i < headers.length; i++) {
        const headerText = headers[i].textContent;
        // Extract just the number part before any whitespace or line break
        const dayMatch = headerText.match(/^(\d+)/);
        
        // Skip if no match (e.g., empty header cell)
        if (!dayMatch) continue;
        
        const headerDay = parseInt(dayMatch[1]);
        
        if (headerDay === day) {
          dayColumnIndex = i;
          console.log(`Found day ${day} at column index ${i}, header text: "${headerText.replace(/\n/g, '\\n')}"`);
          break;
        }
      }

      if (dayColumnIndex === -1) {
        console.log(`Could not find column for day ${day}`);
        return false;
      }

      // Find the row that matches the specific time
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      for (const row of rows) {
        const timeHeader = row.querySelector('th');
        if (timeHeader) {
          const timeStr = timeHeader.textContent.trim();
          
          // Check if this time matches the target time
          if (timeStr === targetTime) {
            console.log(`Found time row: ${timeStr}`);
            // Get all cells in this row
            const cells = Array.from(row.querySelectorAll('td'));
            
            // The dayColumnIndex includes the time header column (th), so we need to subtract 1 for td array
            const targetCell = cells[dayColumnIndex - 1];
            
            if (targetCell) {
              console.log(`Checking cell at index ${dayColumnIndex - 1}, content: "${targetCell.textContent}"`);
              // Look for the "○" symbol indicating availability
              const link = targetCell.querySelector('a');
              const hasAvailability = targetCell.textContent.includes('○');
              
              if (hasAvailability && link) {
                console.log(`Clicking available slot for day ${day} at ${targetTime}`);
                link.click();
                return true;
              } else {
                console.log(`Slot not available (hasAvailability: ${hasAvailability}, hasLink: ${!!link})`);
              }
            } else {
              console.log(`No cell found at index ${dayColumnIndex - 1}`);
            }
          }
        }
      }

      console.log(`Could not find matching time slot for ${targetTime}`);
      return false;
    }, targetDay, time);

    if (!clicked) {
      throw new Error(`Could not find available slot for day ${targetDay} at time ${time}`);
    }

    console.log(`Successfully clicked time slot for day ${targetDay} at ${time}`);
  } catch (error) {
    console.error('Error selecting date/time from calendar:', error);
    throw error;
  }
}

async function fillReservationForm(page) {
    // 1. Wait for the form card to be visible
    await page.waitForSelector('.dialogCard', { visible: true, timeout: 5000 });
    console.log('Reservation form is now visible');
}


async function submitForm(page) {
  try {
    // Look for the confirmation button in the dialog card
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.dialogCard button'));
      const submitBtn = buttons.find(btn => 
        btn.textContent.includes('入力内容を確認') || 
        btn.textContent.includes('予約確定') ||
        btn.textContent.includes('Submit') || 
        btn.textContent.includes('確認') ||
        btn.type === 'submit'
      );
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      throw new Error('Could not find submit button');
    }

    console.log('Clicked confirmation button');
  } catch (error) {
    console.error('Error submitting form:', error);
    throw error;
  }
}

/**
 * Click the final confirmation button (予約確定)
 * @param {Page} page - Puppeteer page object
 */
async function clickFinalConfirmation(page) {
  try {
    console.log('Clicking final confirmation button...');
    const confirmClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.dialogCard button'));
      const confirmBtn = buttons.find(btn => 
        btn.textContent.includes('予約確定') || 
        btn.textContent.includes('予約内容を確定')
      );
      
      if (confirmBtn && !confirmBtn.disabled) {
        confirmBtn.click();
        console.log('Clicked final confirmation button');
        return true;
      }
      console.log(`Confirm button state - exists: ${!!confirmBtn}, disabled: ${confirmBtn?.disabled}`);
      return false;
    });

    if (!confirmClicked) {
      throw new Error('Could not click final confirmation button');
    }
  } catch (error) {
    console.error('Error clicking final confirmation button:', error);
    throw error;
  }
}

/**
 * Accept privacy statement and confirm the reservation
 * @param {Page} page - Puppeteer page object
 */
async function acceptPrivacy(page) {
  try {
    // Wait for the confirmation dialog with privacy statement to appear
    await page.waitForSelector('.dialogCard .modal', { visible: true, timeout: 5000 });
    console.log('Confirmation dialog with privacy statement loaded');

    // Scroll the privacy statement container to the bottom
    console.log('Scrolling privacy statement to bottom...');
    await page.evaluate(() => {
      const container = document.querySelector('.container.overflow-y-auto.rounded');
      if (container) {
        container.scrollTop = container.scrollHeight;
        console.log(`Scrolled privacy statement (scrollHeight: ${container.scrollHeight})`);
        return true;
      }
      console.log('Privacy statement container not found');
      return false;
    });

    // Wait a bit for the scroll to enable the checkbox
    await delay(1000);

    // Click the privacy policy checkbox (input-96)
    console.log('Clicking privacy policy checkbox...');
    const privacyChecked = await page.evaluate(() => {
      const checkbox = document.getElementById('input-96');
      if (checkbox && !checkbox.disabled) {
        checkbox.click();
        console.log('Clicked privacy policy checkbox');
        return true;
      }
      console.log(`Privacy checkbox state - exists: ${!!checkbox}, disabled: ${checkbox?.disabled}`);
      return false;
    });

    if (!privacyChecked) {
      throw new Error('Could not click privacy policy checkbox');
    }

    await delay(500);

    // Click the newsletter checkbox (input-100) - this is optional but we'll click it
    console.log('Clicking newsletter checkbox...');
    await page.evaluate(() => {
      const checkbox = document.getElementById('input-100');
      if (checkbox) {
        checkbox.click();
        console.log('Clicked newsletter checkbox');
      }
    });

    await delay(500);
    console.log('Privacy scrolled and buttons clicked successfully');
  } catch (error) {
    console.error('Error accepting privacy and clicking on buttons:', error);
    throw error;
  }
}

/**
 * Check if booking was successful
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if success indicators found
 */
async function checkBookingSuccess(page) {
  try {
    // Look for success indicators in the page
    const successClasses = [
      '.success',
      '.confirmation',
      '[class*="success"]',
      '[class*="complete"]'
    ];

    // Check for success class elements
    for (const selector of successClasses) {
      const element = await page.$(selector);
      if (element) {
        return true;
      }
    }

    // Check for success text content
    const hasSuccessText = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      return bodyText.includes('予約完了') || 
             bodyText.includes('Reservation Confirmed') || 
             bodyText.includes('完了');
    });

    if (hasSuccessText) {
      return true;
    }

    // Check URL for confirmation patterns
    const url = page.url();
    if (url.includes('confirm') || url.includes('success') || url.includes('complete')) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking booking success:', error);
    return false;
  }
}


await automateBooking();