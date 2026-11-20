
const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },
        tags: [{
            type: String,
            trim: true,
            lowercase: true
        }],
        imageUrl: {
            type: String,
            required: true
        },
        publicId: {
            type: String,
            required: true
        },
        category: {
            type: String,
            enum: [
                "Unclassified",
                "Nature",
                "Campus",
                "Events",
                "Sports",
                "People",
                "Other"
            ],
            default: "Unclassified",
            index: true
        },
        aiLabel: {
            type: String,
            default: ""
        },
        confidence: {
            type: Number,
            default: null
        },
        classificationStatus: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending"
        },
        likesCount: {
            type: Number,
            default: 0,
            min: 0
        },
        commentsCount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

photoSchema.index({
    title: "text",
    description: "text",
    tags: "text"
});

module.exports = mongoose.model("Photo", photoSchema);
