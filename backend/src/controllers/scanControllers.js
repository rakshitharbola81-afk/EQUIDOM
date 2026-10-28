const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { runAccessibilityScan, runHtmlSnippetScan } = require('../services/scannerService');
const { enhanceAllViolations } = require('../services/aiService');
const ScanResult = require('../models/ScanResults');
const PDFDocument = require('pdfkit');

const runScan = async (req, res, next) => {
    try {
        const { url, html } = req.body;
        
        const hasUrl = typeof url === 'string' && url.trim().length > 0;
        const hasHtml = typeof html === 'string' && html.trim().length > 0;

        if (!hasUrl && !hasHtml) {
            return next(new AppError('Please provide a valid website URL or raw HTML markup to audit.', 400));
        }

        let scanData;
        if (hasHtml) {
            const trimmedHtml = html.trim();
            console.log(`Starting accessibility audit for raw HTML snippet (${trimmedHtml.length} chars)...`);
            scanData = await runHtmlSnippetScan(trimmedHtml);
        } else {
            const trimmedUrl = url.trim();
            let parsedUrl;
            try {
                parsedUrl = new URL(trimmedUrl);
            } catch (_) {
                return next(new AppError('Invalid URL format. Make sure to include http:// or https://', 400));
            }

            // Security Edge Case: Block file://, ftp://, javascript:, data: protocols
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                return next(new AppError(`Protocol '${parsedUrl.protocol}' is not supported. Only http:// and https:// URLs are allowed.`, 400));
            }

            // Security Edge Case: Block internal cloud metadata IP (AWS/GCP/Azure)
            if (parsedUrl.hostname === '169.254.169.254' || parsedUrl.hostname.startsWith('169.254.')) {
                return next(new AppError('Requests to internal cloud metadata addresses are forbidden.', 403));
            }

            console.log(`Starting accessibility scan for: ${trimmedUrl}...`);
            scanData = await runAccessibilityScan(trimmedUrl);
        }

        // 2. Enhance violations with AI analysis & code fixes
        console.log(`Enhancing ${scanData.violations.length} violations with AI recommendations...`);
        scanData.violations = await enhanceAllViolations(scanData.violations);

        // 3. Save enriched result into MongoDB
        const savedScan = await ScanResult.create(scanData);

        console.log(`Scan saved to DB successfully! ID: ${savedScan._id}`);

        res.status(200).json({
            success: true,
            message: 'Accessibility scan completed and saved successfully',
            data: savedScan
        });
    } catch (error) {
        next(error);
    }
};

const getScanHistory = async (req, res, next) => {
    try {
        const history = await ScanResult.find().sort({ createdAt: -1 }).limit(20);
        res.status(200).json({
            success: true,
            message: 'Scan history fetched successfully',
            count: history.length,
            data: history
        });
    } catch (error) {
        next(error);
    }
};

const getScanById = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError(`Invalid scan ID format: '${id}'. Expected a 24-character hex identifier.`, 400));
        }

        const scan = await ScanResult.findById(id);

        if (!scan) {
            return next(new AppError('Scan report not found with that ID', 404));
        }

        res.status(200).json({
            success: true,
            message: 'Scan report fetched successfully',
            data: scan
        });
    } catch (error) {
        next(error);
    }
};

const reverifyScan = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError(`Invalid scan ID format: '${id}'. Expected a 24-character hex identifier.`, 400));
        }

        const previousScan = await ScanResult.findById(id);
        if (!previousScan) {
            return next(new AppError('Previous scan report not found for re-verification', 404));
        }

        let freshScanData;

        // Edge case: Handling re-verification for HTML snippet scans
        const isHtmlAudit = previousScan.url === 'Raw HTML Audit' || !previousScan.url.startsWith('http');
        if (isHtmlAudit) {
            const updatedHtml = req.body.html;
            if (!updatedHtml || !updatedHtml.trim()) {
                return next(new AppError('To re-verify an HTML snippet, please provide your updated HTML in the request body (e.g. { html: "..." }).', 400));
            }
            console.log(`Re-verifying HTML snippet (${updatedHtml.length} chars)...`);
            freshScanData = await runHtmlSnippetScan(updatedHtml.trim());
        } else {
            const targetUrl = previousScan.url;
            console.log(`Re-verifying accessibility scan for: ${targetUrl}...`);
            freshScanData = await runAccessibilityScan(targetUrl);
        }

        freshScanData.violations = await enhanceAllViolations(freshScanData.violations);
        const newScan = await ScanResult.create(freshScanData);

        const scoreDiff = newScan.accessibilityScore - previousScan.accessibilityScore;
        const violationsDiff = previousScan.totalViolations - newScan.totalViolations;

        res.status(200).json({
            success: true,
            message: 'Re-verification scan completed successfully',
            comparison: {
                previousScore: previousScan.accessibilityScore,
                currentScore: newScan.accessibilityScore,
                scoreChange: scoreDiff >= 0 ? `+${scoreDiff}` : `${scoreDiff}`,
                issuesResolved: violationsDiff > 0 ? violationsDiff : 0,
                previousTotalViolations: previousScan.totalViolations,
                currentTotalViolations: newScan.totalViolations
            },
            data: newScan
        });
    } catch (error) {
        next(error);
    }
};

const downloadPdfReport = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return next(new AppError(`Invalid scan ID format: '${id}'. Expected a 24-character hex identifier.`, 400));
        }

        const scan = await ScanResult.findById(id);

        if (!scan) {
            return next(new AppError('Scan report not found', 404));
        }

        // Generate clean file name safely
        let domain = 'html-snippet';
        try {
            domain = new URL(scan.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
        } catch {
            domain = (scan.url || 'snippet').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 30);
        }
        const dateStr = scan.timestamp ? new Date(scan.timestamp).toISOString().split('T')[0] : 'audit';
        const fileName = `EquiDom_Audit_Report_${domain}_${dateStr}.pdf`;

        // Set response headers for file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Initialize PDFKit document
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4',
            bufferPages: true 
        });
        doc.pipe(res);

        // Header
        doc.fontSize(22).fillColor('#1E293B').text('EquiDom Accessibility Report', { align: 'center' });
        doc.moveDown(0.4);

        doc.fontSize(11).fillColor('#64748B').text(`Target: ${scan.url}`, { align: 'center' });
        doc.text(`Scanned On: ${scan.timestamp ? new Date(scan.timestamp).toLocaleString() : 'Recent'}`, { align: 'center' });
        doc.moveDown(1.2);

        // Score Card & Summary
        doc.fontSize(16).fillColor('#0F172A').text(`Accessibility Score: ${scan.accessibilityScore} / 100`);
        doc.fontSize(11).fillColor('#475569');
        doc.text(`Total Violations Found: ${scan.totalViolations}`);
        doc.text(`Severity Breakdown: Critical: ${scan.summary?.critical || 0} | Serious: ${scan.summary?.serious || 0} | Moderate: ${scan.summary?.moderate || 0} | Minor: ${scan.summary?.minor || 0}`);
        doc.moveDown(0.8);

        // Compliance Breakdown Section
        doc.fontSize(13).fillColor('#334155').text('WCAG Compliance Breakdown:');
        doc.fontSize(10).fillColor('#475569');
        doc.text(`• WCAG 2.0 / 2.1 Level A Issues: ${scan.complianceBreakdown?.wcag2a || 0}`);
        doc.text(`• WCAG 2.0 / 2.1 Level AA Issues: ${scan.complianceBreakdown?.wcag2aa || 0}`);
        doc.text(`• Section 508 Issues: ${scan.complianceBreakdown?.section508 || 0}`);
        doc.moveDown(1.2);

        // Violations Section
        doc.fontSize(15).fillColor('#0F172A').text('Top Recommendations & Code Fixes:');
        doc.moveDown(0.5);

        if (!scan.violations || scan.violations.length === 0) {
            doc.fontSize(11).fillColor('#15803D').text('[PASS] Outstanding! Zero accessibility violations were detected on this page.');
        } else {
            // Show up to 30 top violations in PDF to prevent buffer overflow
            const reportViolations = scan.violations.slice(0, 30);
            
            reportViolations.forEach((violation, index) => {
                if (doc.y > 680) {
                    doc.addPage();
                }

                const impact = (violation.impact || 'minor').toUpperCase();
                const impactColor = impact === 'CRITICAL' ? '#DC2626' : impact === 'SERIOUS' ? '#D97706' : '#2563EB';

                doc.fontSize(12).fillColor(impactColor).text(`${index + 1}. [${impact}] ${violation.description || violation.id}`);

                doc.fontSize(10).fillColor('#475569');
                if (violation.target && violation.target.length > 0) {
                    doc.text(`Selector: ${violation.target.join(' > ')}`);
                }

                // AI Explanation
                const explanation = violation.aiExplanation && !violation.aiExplanation.startsWith('AI Error')
                    ? violation.aiExplanation
                    : (violation.help ? `${violation.help}. Elements of this type must meet accessibility standards.` : 'Fails WCAG guidelines.');
                doc.text(`Why it fails: ${explanation}`);

                // Prevention Tip
                const tip = violation.preventionTip && !violation.preventionTip.startsWith('Check WCAG')
                    ? violation.preventionTip
                    : (violation.help ? `Always test that '${violation.id}' rules are followed during development.` : 'Ensure semantic HTML attributes are set.');
                doc.text(`Prevention Tip: ${tip}`);

                // Recommended Fix
                const codeFix = violation.aiCodeFix && !violation.aiCodeFix.startsWith('See guidelines')
                    ? violation.aiCodeFix
                    : (violation.helpUrl ? `Review recommended patch: ${violation.helpUrl}` : 'Update HTML attributes according to WCAG 2.1 specifications.');
                doc.text(`Recommended Fix: ${codeFix}`);

                doc.moveDown(0.7);
            });

            if (scan.violations.length > 30) {
                doc.fontSize(10).fillColor('#64748B').text(`... and ${scan.violations.length - 30} additional violations documented in interactive dashboard.`);
            }
        }

        // Finalize PDF file stream
        doc.end();

    } catch (error) {
        next(error);
    }
};

module.exports = {
    runScan,
    getScanHistory,
    getScanById,
    reverifyScan,
    downloadPdfReport
};