
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },
        description: {
            type: String,
            required: true,
            maxlength: 3000
        },
        category: {
            type: String,
            enum: ["Photography Contest", "Campus Event", "Workshop", "Other"],
            default: "Photography Contest"
        },
        startDate: {
            type: Date,
            required: true
        },
        deadline: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        imageUrl: {
            type: String,
            default: ""
        },
        organizer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        participants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        status: {
            type: String,
            enum: ["upcoming", "active", "completed"],
            default: "upcoming"
        },
        winners: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            photo: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Photo"
            },
            position: {
                type: Number,
                min: 1
            }
        }]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Event", eventSchema);
