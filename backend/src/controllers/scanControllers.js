console.log("NEW CONTROLLER IS RUNNING RIGHT NOW");
const AppError = require('../utils/AppError');
const { runAccessibilityScan } = require('../services/scannerService');
const ScanResult = require('../models/ScanResults');
const PDFDocument=require('pdfkit');

const runScan = async (req, res, next) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return next(new AppError('Please provide a URL to scan.', 400));
        }

        try {
            new URL(url);
        } catch (_) {
            return next(new AppError('Invalid URL format. Make sure to include http:// or https://', 400));
        }

        console.log(`Starting accessibility scan for: ${url}...`);

        // 1. Run Puppeteer + axe-core scan
        const scanData = await runAccessibilityScan(url);

        // 2. Save result into MongoDB
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
        const previousScan = await ScanResult.findById(id);
        if (!previousScan) {
            return next(new AppError('Previous scan report not found for re-verification', 404));
        }
        const targetUrl = previousScan.url;
        console.log(`Re-verifying accessibility scan for: ${targetUrl}...`);
        const freshScanData = await runAccessibilityScan(targetUrl);
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
        const scan = await ScanResult.findById(id);

        if (!scan) {
            return next(new AppError('Scan report not found', 404));
        }

        // 1. Generate intelligent system file name (e.g., EquiDom_Report_example.com_2026-10-27.pdf)
        const domain = new URL(scan.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const dateStr = new Date(scan.timestamp).toISOString().split('T')[0];
        const fileName = `EquiDom_Audit_Report_${domain}_${dateStr}.pdf`;

        // 2. Set response headers for file download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // 3. Initialize PDFKit document
        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        // --- PDF STYLING & CONTENT ---
        doc.fontSize(22).fillColor('#1E293B').text('EquiDom Accessibility Report', { align: 'center' });
        doc.moveDown(0.5);

        doc.fontSize(12).fillColor('#64748B').text(`Target URL: ${scan.url}`, { align: 'center' });
        doc.text(`Scanned On: ${new Date(scan.timestamp).toLocaleString()}`, { align: 'center' });
        doc.moveDown(1.5);

        // Score Card Box
        doc.fontSize(16).fillColor('#0F172A').text(`Accessibility Score: ${scan.accessibilityScore} / 100`, { bold: true });
        doc.text(`Total Violations Found: ${scan.totalViolations}`);
        doc.moveDown(1);

        // Compliance Breakdown Section
        doc.fontSize(14).fillColor('#334155').text('WCAG Compliance Breakdown:');
        doc.fontSize(10).fillColor('#475569');
        doc.text(`• WCAG 2.0/2.1 Level A Issues: ${scan.complianceBreakdown?.wcag2a || 0}`);
        doc.text(`• WCAG 2.0/2.1 Level AA Issues: ${scan.complianceBreakdown?.wcag2aa || 0}`);
        doc.text(`• Section 508 Issues: ${scan.complianceBreakdown?.section508 || 0}`);
        doc.moveDown(1.5);

        // Violations & Fixes Section
        doc.fontSize(16).fillColor('#0F172A').text('Top Recommendations & Code Fixes');
        doc.moveDown(0.5);

        scan.violations.forEach((violation, index) => {
    doc.fontSize(12).fillColor('#000000').text(`${index + 1}. [${violation.impact.toUpperCase()}] ${violation.description}`);
    
    // 🔍 THESE MUST MATCH THE DATABASE KEYS EXACTLY:
    doc.fontSize(10).fillColor('#555555');
    doc.text(`Why it fails: ${violation.aiExplanation || 'No explanation provided.'}`);
    doc.text(`Prevention Tip: ${violation.preventionTip || 'No prevention tip provided.'}`);
    
    if (violation.aiCodeFix) {
        doc.text(`Recommended Fix: ${violation.aiCodeFix}`);
    }
    
    doc.moveDown();
});

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