// server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const scanRoutes = require('./src/routes/scanRoutes');
const authRoutes = require('./src/routes/authRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const app = express();

// FIX 1: Hard-bypass the macOS AirPlay port conflict
const PORT = process.env.PORT || 5001; 

connectDB();

// FIX 2: Bulletproof CORS for local testing. 
// This forces Express to accept requests from Postman or Vite without throwing 403s.
app.use(cors({
    origin: function (origin, callback) {
        callback(null, true); 
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'active', message: 'EquiDOM API is running flawlessly' });
});

app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);

// Catch-all for unhandled routes
app.use((req, res, next) => {
    const AppError = require('./src/utils/AppError');
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`🚀 EquiDom Server locked in and running on port ${PORT}`);
});