
const mongoose = require("mongoose");
const Photo = require("../models/Photo");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const { uploadImage, deleteImage } = require("../services/cloudinaryService");
const { classifyImage } = require("../services/classificationService");

const parseTags = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((tag) => String(tag).trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 15);
    }

    if (typeof value === "string") {
        return value
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 15);
    }

    return [];
};

exports.uploadPhoto = async (req, res) => {
    let uploaded;
    let stage = "Cloudinary image upload";

    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Choose an image to upload."
            });
        }

        const title = String(req.body.title || "").trim();

        if (!title) {
            return res.status(400).json({
                message: "Photo title is required."
            });
        }

        uploaded = await uploadImage(req.file.buffer);

        stage = "saving photo details in MongoDB";

        const photo = await Photo.create({
            owner: req.userId,
            title,
            description: String(req.body.description || "").trim(),
            tags: parseTags(req.body.tags),
            imageUrl: uploaded.secure_url,
            publicId: uploaded.public_id
        });

        // Classification failure should not prevent the photo from being uploaded.
        try {
            const result = await classifyImage(photo.imageUrl);

            photo.classificationStatus = result.status;

            if (result.status === "completed") {
                photo.category = result.category;
                photo.aiLabel = result.aiLabel;
                photo.confidence = result.confidence;
            }

            await photo.save();
        } catch (aiError) {
            photo.classificationStatus = "failed";
            await photo.save();

            console.error(
                "AI classification failed:",
                aiError.message
            );
        }

        await photo.populate(
            "owner",
            "name rollNumber profilePhoto"
        );

        return res.status(201).json({
            message: "Photo uploaded successfully.",
            photo
        });
    } catch (error) {
        if (uploaded?.public_id) {
            await deleteImage(uploaded.public_id).catch(() => {});
        }

        console.error(`Photo upload error during ${stage}:`, {
            name: error.name,
            message: error.message,
            http_code: error.http_code,
            code: error.code
        });

        if (stage === "Cloudinary image upload") {
            const details = process.env.NODE_ENV === "production"
                ? undefined
                : error.message;

            return res.status(502).json({
                message: "Cloudinary could not upload this image.",
                ...(details ? { details } : {})
            });
        }

        return res.status(500).json({
            message:
                "The photo could not be saved. Check MongoDB and the backend terminal."
        });
    }
};

exports.listPhotos = async (req, res) => {
    try {
        const page = Math.max(
            parseInt(req.query.page || "1", 10),
            1
        );

        const limit = Math.min(
            Math.max(parseInt(req.query.limit || "12", 10), 1),
            50
        );

        const filter = {};
        const category = String(req.query.category || "").trim();
        const search = String(req.query.search || "").trim();
        const owner = String(req.query.owner || "").trim();

        if (category && category !== "All") {
            filter.category = category;
        }

        if (owner && mongoose.isValidObjectId(owner)) {
            filter.owner = owner;
        }

        if (search) {
            filter.$text = { $search: search };
        }

        const sort =
            req.query.sort === "oldest"
                ? { createdAt: 1 }
                : req.query.sort === "popular"
                    ? { likesCount: -1, createdAt: -1 }
                    : { createdAt: -1 };

        const [photos, total] = await Promise.all([
            Photo.find(filter)
                .populate("owner", "name rollNumber profilePhoto")
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit),

            Photo.countDocuments(filter)
        ]);

        return res.json({
            photos,
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error("List photos error:", error.message);

        return res.status(500).json({
            message: "Could not load photos."
        });
    }
};

exports.listMyPhotos = async (req, res) => {
    try {
        const photos = await Photo.find({ owner: req.userId })
            .populate("owner", "name rollNumber profilePhoto")
            .sort({ createdAt: -1 });

        return res.json({ photos, total: photos.length });
    } catch (error) {
        console.error("List my photos error:", error.message);
        return res.status(500).json({
            message: "Could not load your photos."
        });
    }
};

exports.getPhoto = async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id)
            .populate("owner", "name rollNumber profilePhoto");

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found."
            });
        }

        return res.json({ photo });
    } catch (error) {
        return res.status(400).json({
            message: "Invalid photo ID."
        });
    }
};

exports.updatePhoto = async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found."
            });
        }

        if (String(photo.owner) !== String(req.userId)) {
            return res.status(403).json({
                message: "You can edit only your own photos."
            });
        }

        if (req.body.title !== undefined) {
            photo.title = String(req.body.title).trim();
        }

        if (req.body.description !== undefined) {
            photo.description = String(req.body.description).trim();
        }

        if (req.body.tags !== undefined) {
            photo.tags = parseTags(req.body.tags);
        }

        if (!photo.title) {
            return res.status(400).json({
                message: "Photo title cannot be empty."
            });
        }

        await photo.save();

        await photo.populate(
            "owner",
            "name rollNumber profilePhoto"
        );

        return res.json({
            message: "Photo updated.",
            photo
        });
    } catch (error) {
        console.error("Update photo error:", error.message);

        return res.status(400).json({
            message: "Could not update photo."
        });
    }
};

exports.deletePhoto = async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found."
            });
        }

        if (String(photo.owner) !== String(req.userId)) {
            return res.status(403).json({
                message: "You can delete only your own photos."
            });
        }

        await Promise.all([
            Like.deleteMany({ photo: photo._id }),
            Comment.deleteMany({ photo: photo._id })
        ]);

        await require("../models/EventSubmission").deleteMany({
            photo: photo._id
        });

        if (photo.publicId) {
            await deleteImage(photo.publicId);
        }

        await photo.deleteOne();

        return res.json({
            message: "Photo and related interactions deleted."
        });
    } catch (error) {
        console.error("Delete photo error:", error.message);

        return res.status(500).json({
            message: "Could not delete photo."
        });
    }
};

exports.reclassifyPhoto = async (req, res) => {
    try {
        const photo = await Photo.findById(req.params.id);

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found."
            });
        }

        if (String(photo.owner) !== String(req.userId)) {
            return res.status(403).json({
                message: "Only the owner can retry classification."
            });
        }

        const result = await classifyImage(photo.imageUrl);

        photo.classificationStatus = result.status;

        if (result.status === "completed") {
            photo.category = result.category;
            photo.aiLabel = result.aiLabel;
            photo.confidence = result.confidence;
        }

        await photo.save();

        return res.json({
            message: result.message,
            photo
        });
    } catch (error) {
        console.error("Reclassification error:", error.message);

        return res.status(502).json({
            message: "AI classification failed. Try again later."
        });
    }
};

exports.correctCategory = async (req, res) => {
    const allowed = [
        "Nature",
        "Campus",
        "Events",
        "Sports",
        "People",
        "Other"
    ];

    try {
        if (!allowed.includes(req.body.category)) {
            return res.status(400).json({
                message: "Invalid category."
            });
        }

        const photo = await Photo.findById(req.params.id);

        if (!photo) {
            return res.status(404).json({
                message: "Photo not found."
            });
        }

        if (String(photo.owner) !== String(req.userId)) {
            return res.status(403).json({
                message: "Only the owner can correct the category."
            });
        }

        photo.category = req.body.category;

        await photo.save();

        return res.json({
            message: "Category updated.",
            photo
        });
    } catch (error) {
        console.error("Correct category error:", error.message);

        return res.status(400).json({
            message: "Could not update category."
        });
    }
};
