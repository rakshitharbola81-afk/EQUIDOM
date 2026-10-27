// src/services/scannerService.js
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const AppError = require('../utils/AppError');

const runAccessibilityScan = async (url) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate and wait until network is stable
        await page.goto(url, {
            waitUntil: ['domcontentloaded', 'networkidle2'],
            timeout: 30000
        });

        // Ensure the body element is fully loaded before running axe
        await page.waitForSelector('body', { timeout: 10000 });

        // Run axe-core accessibility analysis
        const results = await new AxePuppeteer(page).analyze();

        const summary = {
            critical: 0,
            serious: 0,
            moderate: 0,
            minor: 0
        };

        const flattenedViolations = [];

        results.violations.forEach(violation => {
            const impact = violation.impact || 'minor';
            
            violation.nodes.forEach(node => {
                if (summary[impact] !== undefined) {
                    summary[impact]++;
                }

                flattenedViolations.push({
                    id: violation.id,
                    impact: impact,
                    description: violation.description,
                    help: violation.help,
                    helpUrl: violation.helpUrl,
                    target: node.target || [],
                });
            });
        });

        const totalViolations = flattenedViolations.length;

        const penalty = (summary.critical * 15) + 
                        (summary.serious * 10) + 
                        (summary.moderate * 5) + 
                        (summary.minor * 2);
        const accessibilityScore = Math.max(0, 100 - penalty);

        return {
            url: results.url,
            timestamp: new Date(),
            accessibilityScore,
            totalViolations,
            summary,
            violations: flattenedViolations
        };

    } catch (error) {
        throw new AppError(`Failed to scan the target URL: ${error.message}`, 400);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = {
    runAccessibilityScan
};