const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.code = err.code;

    // Handle Mongoose Bad ObjectId (CastError)
    if (err.name === 'CastError') {
        error.message = `Resource not found. Invalid ID format: '${err.value}'`;
        error.statusCode = 404;
        error.status = 'fail';
        error.isOperational = true;
    }

    // Handle Mongoose Duplicate Key Error
    if (err.code === 11000) {
        error.message = 'Duplicate field value entered. Please use another value.';
        error.statusCode = 400;
        error.status = 'fail';
        error.isOperational = true;
    }

    // Handle Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors || {}).map(val => val.message).join(', ');
        error.message = message || 'Validation failed for one or more fields.';
        error.statusCode = 400;
        error.status = 'fail';
        error.isOperational = true;
    }

    const statusCode = error.statusCode || err.statusCode || 500;
    const status = error.status || err.status || 'error';
    const message = error.message || 'An unexpected error occurred.';

    if (process.env.NODE_ENV === 'development') {
        return res.status(statusCode).json({
            success: false,
            status,
            message,
            error: {
                ...err,
                statusCode,
                status
            },
            stack: err.stack
        });
    }

    if (error.isOperational || err.isOperational) {
        return res.status(statusCode).json({
            success: false,
            status,
            message
        });
    }

    console.error('UNHANDLED ERROR 💥:', err);
    return res.status(500).json({
        success: false,
        status: 'error',
        message: 'An unexpected internal server error occurred.'
    });
};

module.exports = errorHandler;