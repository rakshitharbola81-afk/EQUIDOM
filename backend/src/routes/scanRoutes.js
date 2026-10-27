const express = require('express');
const router = express.Router();

// 1. Import the controller file first
const scanController = require('../controllers/scanControllers');

// 2. Print it to your terminal to check if it's loading properly
console.log("CONTROLLER OBJECT:", scanController);

// 3. Destructure the functions safely
const { runScan, getScanHistory } = scanController;

router.post('/', runScan);
router.get('/history', getScanHistory);

module.exports = router;