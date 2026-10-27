require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const scanRoutes = require('./src/routes/scanRoutes');
const app = express();
const PORT = process.env.PORT || 5000;
connectDB();
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'active', message: 'EquiDOM API is running' });
});
app.use('/api/scan', scanRoutes);
app.all('*', (req, res, next) => {
    const AppError = require('./src/utils/AppError');
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(errorHandler);
app.listen(PORT, () => {
    console.log(`Server running in development mode on port ${PORT}`);
});