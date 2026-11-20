// backend/routes/adminRoutes.js

const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const requireAdmin = require("../middleware/requireAdmin");

const {
    getDashboard,
    getUsers,
    setUserStatus,
    getPhotos,
    deletePhotoAsAdmin,
    getEvents,
    deleteEventAsAdmin
} = require("../controllers/adminController");

const router = express.Router();

router.use(verifyToken, requireAdmin);

router.get("/dashboard", getDashboard);

router.get("/users", getUsers);
router.patch("/users/:id/status", setUserStatus);

router.get("/photos", getPhotos);
router.delete("/photos/:id", deletePhotoAsAdmin);

router.get("/events", getEvents);
router.delete("/events/:id", deleteEventAsAdmin);

module.exports = router;