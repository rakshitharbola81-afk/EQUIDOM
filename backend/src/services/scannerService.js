// src/services/scannerService.js
const dns = require('dns').promises;
const { enhanceAllViolations } = require('./aiService');
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const AppError = require('../utils/AppError');

/**
 * Validates the URL structure, protocol, and verifies domain exists via DNS.
 */
const validateUrlDomain = async (rawUrl) => {
    let parsedUrl;
    try {
        parsedUrl = new URL(rawUrl);
    } catch (_) {
        throw new AppError('Invalid URL format. Make sure to include http:// or https:// (e.g., https://example.com)', 400);
    }

    // Security check: Only http: and https: protocols
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new AppError(`Protocol '${parsedUrl.protocol}' is not supported. Only http:// and https:// URLs are allowed.`, 400);
    }

    const hostname = parsedUrl.hostname;

    // Security check: Block internal cloud metadata IPs
    if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
        throw new AppError('Requests to internal cloud metadata addresses are forbidden.', 403);
    }

    // Domain validation: Hostname must contain a dot unless localhost
    if (!hostname.includes('.') && hostname !== 'localhost') {
        throw new AppError(`The domain '${hostname}' is not a valid web address. Please provide a full domain name (e.g., https://example.com).`, 400);
    }

    // DNS check: Ensure the domain actually resolves to an IP address
    try {
        await dns.lookup(hostname);
    } catch (dnsErr) {
        throw new AppError(`The website domain '${hostname}' does not exist or could not be reached. Please check the URL and try again.`, 400);
    }

    return parsedUrl;
};

/**
 * Runs an accessibility audit against a live target URL.
 */
const runAccessibilityScan = async (url) => {
    // 1. Validate URL syntax and DNS resolution before launching browser
    await validateUrlDomain(url);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-background-networking'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        const response = await page.goto(url, { waitUntil: ['domcontentloaded', 'networkidle2'], timeout: 30000 });

        // 2. Validate HTTP response
        if (!response) {
            throw new AppError(`Could not reach '${url}'. No HTTP response was received.`, 400);
        }

        const statusCode = response.status();
        if (statusCode === 404) {
            throw new AppError(`The URL '${url}' does not exist (HTTP 404 Not Found). Please check the URL and try again.`, 404);
        }
        if (statusCode === 410) {
            throw new AppError(`The page at '${url}' does not exist (HTTP 410 Gone).`, 400);
        }
        if (statusCode === 403) {
            throw new AppError(`Access to '${url}' is forbidden (HTTP 403 Forbidden).`, 403);
        }
        if (statusCode === 401) {
            throw new AppError(`Access to '${url}' requires authentication (HTTP 401 Unauthorized).`, 401);
        }
        if (statusCode >= 400 && statusCode < 500) {
            throw new AppError(`Failed to load '${url}' (HTTP ${statusCode} client error). The page does not exist or is unavailable.`, 400);
        }
        if (statusCode >= 500) {
            throw new AppError(`The website at '${url}' returned a server error (HTTP ${statusCode}). The target server is currently unavailable.`, 502);
        }

        // 3. Detect browser internal error pages
        const loadedUrl = page.url();
        if (loadedUrl.startsWith('chrome-error://') || loadedUrl === 'about:blank') {
            throw new AppError(`Failed to reach '${url}'. The browser could not load the webpage.`, 400);
        }

        // 4. Detect soft-404 error pages by title
        const pageTitle = (await page.title() || '').trim().toLowerCase();
        const is404Title = 
            pageTitle === '404 not found' || 
            pageTitle === '404 - page not found' || 
            pageTitle === 'page not found - 404' || 
            pageTitle === '404: this page could not be found' ||
            pageTitle === 'page not found' ||
            pageTitle === 'error 404' ||
            pageTitle === '404 error';

        if (is404Title) {
            throw new AppError(`The URL '${url}' returned a 404 Not Found page. Please check the URL and try again.`, 404);
        }

        // 5. Verify valid DOM content exists
        await page.waitForSelector('body', { timeout: 10000 });
        
        // 6. Execute axe-core accessibility analysis
        const results = await new AxePuppeteer(page).analyze();

        const summary = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        const flattenedViolations = [];

        results.violations.forEach(violation => {
            const impact = violation.impact || 'minor';
            const tags = violation.tags || [];
            
            violation.nodes.forEach(node => {
                if (summary[impact] !== undefined) summary[impact]++;

                flattenedViolations.push({
                    id: violation.id,
                    impact: impact,
                    tags: tags,
                    description: violation.description,
                    help: violation.help,
                    helpUrl: violation.helpUrl,
                    target: node.target || [],
                    originalSnippet: node.html || '' 
                });
            });
        });

        const totalViolations = flattenedViolations.length;
        
        const complianceBreakdown = {
            wcag2a: flattenedViolations.filter(v => v.tags?.some(t => t.includes('wcag2a') || t.includes('wcag21a') || t.includes('wcag22a'))).length,
            wcag2aa: flattenedViolations.filter(v => v.tags?.some(t => t.includes('wcag2aa') || t.includes('wcag21aa') || t.includes('wcag22aa'))).length,
            section508: flattenedViolations.filter(v => v.tags?.some(t => t.includes('section508'))).length,
        };

        console.log("Generating AI code fixes and insights using Groq...");
        const rawEnhancedViolations = await enhanceAllViolations(flattenedViolations);

        const mappedViolations = rawEnhancedViolations.map(v => ({
            ...v,
            aiExplanation: v.aiExplanation || v.explanation || v.whyItFails || 'AI explanation generation failed.',
            aiCodeFix: v.aiCodeFix || v.codeFix || v.fix || v.recommendedFix || null,
            preventionTip: v.preventionTip || v.tip || v.prevention || 'Ensure proper semantic HTML structure.'
        }));

        // Calculate realistic, standard accessibility score
        let totalDeduction = 0;
        results.violations.forEach(violation => {
            const impact = violation.impact || 'minor';
            const nodeCount = violation.nodes ? violation.nodes.length : 1;

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
        });

        const accessibilityScore = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));

        return {
            url: results.url,
            timestamp: new Date(),
            accessibilityScore,
            totalViolations,
            summary,
            complianceBreakdown,
            violations: mappedViolations
        };

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        const msg = error.message || '';
        if (msg.includes('net::ERR_NAME_NOT_RESOLVED') || msg.includes('ENOTFOUND')) {
            throw new AppError(`The website domain does not exist or could not be found. Please check the URL.`, 400);
        }
        if (msg.includes('net::ERR_CONNECTION_REFUSED')) {
            throw new AppError(`Connection refused. The website server is down or not accepting connections.`, 400);
        }
        if (msg.includes('net::ERR_CONNECTION_RESET')) {
            throw new AppError(`The connection was reset while loading the website.`, 400);
        }
        if (msg.includes('Timeout') || msg.includes('timeout') || msg.includes('net::ERR_TIMED_OUT')) {
            throw new AppError(`Connection timed out while loading '${url}'. The server took too long to respond.`, 408);
        }
        if (msg.includes('net::ERR_CERT_') || msg.includes('net::ERR_SSL_')) {
            throw new AppError(`SSL/TLS certificate validation failed for '${url}'.`, 400);
        }

        throw new AppError(`Failed to scan the target URL: ${msg}`, 400);
    } finally {
        if (browser) await browser.close();
    }
};

/**
 * Runs an accessibility audit directly on a raw HTML snippet.
 */
const runHtmlSnippetScan = async (htmlContent) => {
    if (!htmlContent || !htmlContent.trim()) {
        throw new AppError('Please provide valid HTML markup to audit.', 400);
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-background-networking'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        const trimmed = htmlContent.trim();
        const fullHtml = trimmed.includes('<html') 
            ? trimmed 
            : `<!DOCTYPE html><html lang="en"><head><title>EquiDOM Snippet Audit</title></head><body>${trimmed}</body></html>`;

        await page.setContent(fullHtml, {
            waitUntil: ['domcontentloaded'],
            timeout: 15000
        });

        const results = await new AxePuppeteer(page).analyze();

        const summary = { critical: 0, serious: 0, moderate: 0, minor: 0 };
        const flattenedViolations = [];

        results.violations.forEach(violation => {
            const impact = violation.impact || 'minor';
            const tags = violation.tags || [];
            
            violation.nodes.forEach(node => {
                if (summary[impact] !== undefined) summary[impact]++;

                flattenedViolations.push({
                    id: violation.id,
                    impact: impact,
                    tags: tags,
                    description: violation.description,
                    help: violation.help,
                    helpUrl: violation.helpUrl,
                    target: node.target || [],
                    originalSnippet: node.html || '' 
                });
            });
        });

        const totalViolations = flattenedViolations.length;

        const complianceBreakdown = {
            wcag2a: flattenedViolations.filter(v => v.tags?.some(t => t.includes('wcag2a') || t.includes('wcag21a') || t.includes('wcag22a'))).length,
            wcag2aa: flattenedViolations.filter(v => v.tags?.some(t => t.includes('wcag2aa') || t.includes('wcag21aa') || t.includes('wcag22aa'))).length,
            section508: flattenedViolations.filter(v => v.tags?.some(t => t.includes('section508'))).length,
        };

        console.log("Generating AI code fixes and insights for HTML snippet using Groq...");
        const rawEnhancedViolations = await enhanceAllViolations(flattenedViolations);

        const mappedViolations = rawEnhancedViolations.map(v => ({
            ...v,
            aiExplanation: v.aiExplanation || v.explanation || v.whyItFails || 'AI explanation generation failed.',
            aiCodeFix: v.aiCodeFix || v.codeFix || v.fix || v.recommendedFix || null,
            preventionTip: v.preventionTip || v.tip || v.prevention || 'Ensure proper semantic HTML structure.'
        }));

        // Calculate realistic, standard accessibility score
        let totalDeduction = 0;
        results.violations.forEach(violation => {
            const impact = violation.impact || 'minor';
            const nodeCount = violation.nodes ? violation.nodes.length : 1;

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
        });

        const accessibilityScore = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));

        return {
            url: 'Raw HTML Audit',
            timestamp: new Date(),
            accessibilityScore,
            totalViolations,
            summary,
            complianceBreakdown,
            violations: mappedViolations
        };
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(`Failed to scan HTML snippet: ${error.message}`, 400);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { 
    validateUrlDomain,
    runAccessibilityScan,
    runHtmlSnippetScan
};