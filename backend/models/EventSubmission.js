
const mongoose = require("mongoose");

const eventSubmissionSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        photo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Photo",
            required: true
        }
    },
    {
        timestamps: true
    }
);

eventSubmissionSchema.index(
    { event: 1, user: 1, photo: 1 },
    { unique: true }
);

module.exports = mongoose.model("EventSubmission", eventSubmissionSchema);
