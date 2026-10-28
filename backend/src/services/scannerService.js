// src/services/scannerService.js
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const AppError = require('../utils/AppError');

const formatAxeResults = (results, targetIdentifier) => {
    const summary = {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
    };

    const complianceBreakdown = {
        wcag2a: 0,
        wcag2aa: 0,
        wcag21a: 0,
        wcag21aa: 0,
        section508: 0
    };

    const flattenedViolations = [];
    let totalDeduction = 0;

    results.violations.forEach(violation => {
        const impact = violation.impact || 'minor';
        const tags = violation.tags || [];
        const nodeCount = violation.nodes ? violation.nodes.length : 1;

        if (tags.includes('wcag2a')) complianceBreakdown.wcag2a += nodeCount;
        if (tags.includes('wcag2aa')) complianceBreakdown.wcag2aa += nodeCount;
        if (tags.includes('wcag21a')) complianceBreakdown.wcag21a += nodeCount;
        if (tags.includes('wcag21aa')) complianceBreakdown.wcag21aa += nodeCount;
        if (tags.includes('section508')) complianceBreakdown.section508 += nodeCount;

        // Realistic, standard accessibility scoring deduction per distinct rule
        // with diminishing scale for repetitive node occurrences of the same issue
        let ruleDeduction = 0;
        if (impact === 'critical') {
            ruleDeduction = 10 + Math.min(5, (nodeCount - 1) * 0.5);
        } else if (impact === 'serious') {
            ruleDeduction = 6 + Math.min(4, (nodeCount - 1) * 0.3);
        } else if (impact === 'moderate') {
            ruleDeduction = 3 + Math.min(3, (nodeCount - 1) * 0.2);
        } else {
            ruleDeduction = 1.5 + Math.min(2, (nodeCount - 1) * 0.1);
        }
        totalDeduction += ruleDeduction;

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
                tags: tags,
                target: node.target || [],
                html: node.html || '',
                failureSummary: node.failureSummary || ''
            });
        });
    });

    const totalViolations = flattenedViolations.length;
    // Bounded between 0 and 100
    const accessibilityScore = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));

    return {
        url: targetIdentifier || results.url || 'Raw HTML Snippet',
        timestamp: new Date(),
        accessibilityScore,
        totalViolations,
        summary,
        complianceBreakdown,
        violations: flattenedViolations
    };
};

const runAccessibilityScan = async (url) => {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--allow-running-insecure-content'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Navigate with full load & network idle, falling back gracefully if streaming/analytics keeps connection open
        try {
            await page.goto(url, {
                waitUntil: ['load', 'networkidle2'],
                timeout: 30000
            });
        } catch (navErr) {
            // If networkidle2 timed out but DOM content actually loaded, proceed with audit
            const hasBody = await page.evaluate(() => !!document.body).catch(() => false);
            if (!hasBody) {
                throw navErr;
            }
            console.warn(`Navigation warning for ${url}: Network did not fully idle, but DOM rendered. Proceeding with scan.`);
        }

        // 1. Ensure document readyState is complete
        await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 }).catch(() => {});

        // 2. Wait for any common splash/preloader screens to disappear
        const loaderSelectors = [
            '#preloader', '#loader', '#loading',
            '.preloader', '.loader', '.loading', '.loading-screen',
            '.splash', '.splash-screen', '.spinner-wrapper', '.page-loader',
            '[aria-busy="true"]', '.skeleton'
        ];

        for (const sel of loaderSelectors) {
            try {
                const el = await page.$(sel);
                if (el) {
                    await page.waitForSelector(sel, { hidden: true, timeout: 5000 });
                }
            } catch (e) {
                // Non-critical if preloader selector check times out
            }
        }

        // 3. Ensure the main DOM has meaningful rendered content (not an unhydrated shell)
        await page.waitForFunction(() => {
            const body = document.body;
            if (!body) return false;
            const text = body.innerText ? body.innerText.trim() : '';
            const meaningfulElements = document.querySelectorAll('h1, h2, h3, p, a, button, main, article, section, [role="main"]').length;
            return text.length > 40 || meaningfulElements >= 3;
        }, { timeout: 8000 }).catch(() => {});

        // 4. Short stabilization buffer for SPA hydration and animation settlement
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 5. Dismiss common cookie consent wall if present
        try {
            const consentSelectors = [
                'button#L2AGLb', // Google consent "Accept all"
                'button[id*="accept"]', 'button[class*="accept"]',
                'button[aria-label*="Accept" i]', 'button[aria-label*="Agree" i]'
            ];
            for (const cSel of consentSelectors) {
                const btn = await page.$(cSel);
                if (btn) {
                    await btn.click().catch(() => {});
                    await new Promise(r => setTimeout(r, 600));
                    break;
                }
            }
        } catch (e) {
            // Ignore if consent not present
        }

        const results = await new AxePuppeteer(page).analyze();
        return formatAxeResults(results, url);

    } catch (error) {
        throw new AppError(`Failed to scan the target URL: ${error.message}`, 400);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

const runHtmlSnippetScan = async (htmlContent) => {
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

        // Set raw HTML directly into page
        const fullHtml = htmlContent.includes('<html') 
            ? htmlContent 
            : `<!DOCTYPE html><html lang="en"><head><title>EquiDOM Snippet Audit</title></head><body>${htmlContent}</body></html>`;

        await page.setContent(fullHtml, {
            waitUntil: ['domcontentloaded'],
            timeout: 15000
        });

        const results = await new AxePuppeteer(page).analyze();
        return formatAxeResults(results, 'Raw HTML Audit');

    } catch (error) {
        throw new AppError(`Failed to scan HTML snippet: ${error.message}`, 400);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = {
    runAccessibilityScan,
    runHtmlSnippetScan
};