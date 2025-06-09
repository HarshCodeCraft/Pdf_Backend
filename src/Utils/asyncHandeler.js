const asyncHandeler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) { // Ensure we use `error`, not `err`
        console.error("Error caught in asyncHandler:", error); // Debugging log

        const statusCode = (typeof error.statusCode === "number" && error.statusCode >= 100 && error.statusCode < 600)
            ? error.statusCode 
            : 500; // Default to 500 if `statusCode` is missing or invalid

        res.status(statusCode).json({
            success: false,
            message: error.message || "Internal Server Error",
            errorCode: error.code || null // Log MongoDB or other error codes
        });
    }
};

export { asyncHandeler };
