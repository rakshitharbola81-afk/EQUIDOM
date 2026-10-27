const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
            error: err,
            stack: err.stack
        });
    }
    let error = { ...err };
    error.message = err.message;
    if (err.name === 'CastError') {
        error.message = `Resource not found. Invalid ${err.path}: ${err.value}`;
        error.statusCode = 404;
    }
    if (err.code === 11000) {
        error.message = 'Duplicate field value entered. Please use another value.';
        error.statusCode = 400;
    }
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error.message = message;
        error.statusCode = 400;
    }
    if (error.isOperational) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }
    console.error('UNHANDLED ERROR 💥:', err);
    return res.status(500).json({
        success: false,
        message: 'An unexpected internal server error occurred.'
    });
};

module.exports = errorHandler;