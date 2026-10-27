const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const AppError = require('../utils/AppError');

// Global browser instance (Singleton) so we don't relaunch Chrome on every request
let browserInstance = null;

async function getBrowser() {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
    }
    return browserInstance;
}

const runAccessibilityScan = async (url) => {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        // OPTIMIZATION: Block images, stylesheets, and fonts to save CPU and speed up crawling
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort(); // Skip loading heavy assets
            } else {
                req.continue();
            }
        });

        await page.setViewport({ width: 1280, height: 800 });

        // Navigate with a fast timeout
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

        // Run axe-core audit on the lightweight DOM
        const results = await new AxePuppeteer(page).analyze();

        return results;
    } catch (error) {
        throw new AppError(`Failed to scan the target URL: ${error.message}`, 400);
    } finally {
        // CRITICAL: Always close the tab/page after scanning to prevent memory leaks
        if (page) {
            await page.close();
        }
    }
};

module.exports = { runAccessibilityScan };