const express = require('express');
const router = express.Router();

// Temporary route to verify setup
router.get('/', (req, res) => {
    res.json({ message: 'Scan route is working!' });
});

module.exports = router; // <--- This prevents the TypeError