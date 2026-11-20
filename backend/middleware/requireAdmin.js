// backend/middleware/requireAdmin.js

const User = require("../models/User");

async function requireAdmin(req, res, next) {
    try {
        const user = await User.findById(req.userId);

        if (!user || user.isActive === false) {
            return res.status(403).json({
                message: "Active account required"
            });
        }

        if (user.role !== "admin") {
            return res.status(403).json({
                message: "Administrator access required"
            });
        }

        req.currentUser = user;
        next();
    } catch (error) {
        console.error("Admin authorization error:", error.message);

        return res.status(500).json({
            message: "Unable to verify administrator access"
        });
    }
}

module.exports = requireAdmin;