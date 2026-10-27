const AppError = require('../utils/AppError');
const ScanResult = require('../models/ScanResults');
const getScanById = async (req, res, next) => {
    try {
        const scan = await ScanResult.findById(req.params.id);

        if (!scan) {
            return next(new AppError('No scan report found with that ID', 404));
        }

        res.status(200).json({
            success: true,
            data: scan
        });
    } catch (error) {
        next(error); 
    }
};

module.exports = { getScanById };