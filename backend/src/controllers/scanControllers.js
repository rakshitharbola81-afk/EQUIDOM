// src/controllers/scanControllers.js
console.log("🔥 NEW CONTROLLER IS RUNNING RIGHT NOW 🔥");
const AppError = require('../utils/AppError');
const { runAccessibilityScan } = require('../services/scannerService');
const ScanResult = require('../models/ScanResults');

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

module.exports = {
    runScan,
    getScanHistory,
    getScanById
};