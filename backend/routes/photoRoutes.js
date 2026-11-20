
const express = require("express");
const multer = require("multer");
const verifyToken = require("../middleware/verifyToken");

const {
    uploadPhoto,
    listPhotos,
    listMyPhotos,
    getPhoto,
    updatePhoto,
    deletePhoto,
    reclassifyPhoto
} = require("../controllers/photoController");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 8 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new Error("Only JPEG, PNG and WebP images are allowed")
            );
        }

        callback(null, true);
    }
});

// Get all photos
router.get("/", listPhotos);

// Get the logged-in student's uploaded photos. Keep this before /:id.
router.get("/mine", verifyToken, listMyPhotos);

// Get a single photo
router.get("/:id", getPhoto);

// Upload a photo
router.post(
    "/",
    verifyToken,
    upload.single("image"),
    uploadPhoto
);

// Update photo details
router.put("/:id", verifyToken, updatePhoto);

// Delete a photo
router.delete("/:id", verifyToken, deletePhoto);

// Retry AI classification
router.post(
    "/:id/classify",
    verifyToken,
    reclassifyPhoto
);

module.exports = router;
