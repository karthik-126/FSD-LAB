
const express = require("express");
const verifyToken = require("../middleware/verifyToken");

const {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    submitPhoto,
    setWinners
} = require("../controllers/eventController");

const router = express.Router();

router.get("/", getEvents);
router.get("/:id", getEventById);

router.post("/", verifyToken, createEvent);
router.put("/:id", verifyToken, updateEvent);
router.delete("/:id", verifyToken, deleteEvent);

router.post("/:id/submit", verifyToken, submitPhoto);
router.put("/:id/winners", verifyToken, setWinners);

module.exports = router;
