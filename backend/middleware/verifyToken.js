// backend/middleware/verifyToken.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");

            return res.status(500).json({
                message: "Server authentication is not configured"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.userId) {
            return res.status(401).json({
                message: "Invalid authentication token"
            });
        }

        const user = await User.findById(decoded.userId);

        if (!user || user.isActive === false) {
            return res.status(401).json({
                message: "Your account is unavailable. Please contact an administrator."
            });
        }

        req.userId = user._id.toString();
        req.currentUser = user;

        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                message: "Your session is invalid or expired. Please log in again."
            });
        }

        console.error("Authentication error:", error.message);

        return res.status(500).json({
            message: "Unable to verify authentication"
        });
    }
}

module.exports = verifyToken;