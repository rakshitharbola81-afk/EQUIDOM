const express = require('express');
const router = express.Router();

// 1. Import the controller object
const scanController = require('../controllers/scanControllers');

// 2. THE TRIPWIRE: Check every function before giving it to Express
const requiredFunctions = [
    'runScan', 
    'getScanHistory', 
    'reverifyScan', 
    'downloadPdfReport', 
    'getScanById'
];

requiredFunctions.forEach(funcName => {
    if (typeof scanController[funcName] !== 'function') {
        console.error(`\n❌ FATAL EXPORT ERROR: '${funcName}' is missing or undefined!`);
        console.error(`Check the spelling in 'src/controllers/scanControllers.js' and ensure it is inside module.exports at the bottom.\n`);
        process.exit(1); // Safely stop the server so you can see this exact error
    }
});

// 3. Mount routes directly from the verified controller object
router.post('/', scanController.runScan);
router.get('/history', scanController.getScanHistory);
router.post('/reverify/:id', scanController.reverifyScan);       
router.get('/report/pdf/:id', scanController.downloadPdfReport); 
router.get('/:id', scanController.getScanById);

module.exports = router;