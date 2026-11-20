
const Event = require("../models/Event");
const EventSubmission = require("../models/EventSubmission");
const Photo = require("../models/Photo");

function getEventStatus(event) {
    const now = new Date();

    if (now < event.startDate) {
        return "upcoming";
    }

    if (now <= event.endDate) {
        return "active";
    }

    return "completed";
}

async function createEvent(req, res) {
    try {
        const {
            title,
            description,
            category,
            startDate,
            deadline,
            endDate,
            imageUrl
        } = req.body;

        if (
            !title ||
            !description ||
            !startDate ||
            !deadline ||
            !endDate
        ) {
            return res.status(400).json({
                message: "Please provide all required event details"
            });
        }

        const start = new Date(startDate);
        const due = new Date(deadline);
        const end = new Date(endDate);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(due.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            return res.status(400).json({
                message: "Please provide valid event dates"
            });
        }

        if (!(start <= due && due <= end)) {
            return res.status(400).json({
                message: "Dates must follow start date, deadline, end date order"
            });
        }

        const event = await Event.create({
            title: title.trim(),
            description: description.trim(),
            category,
            startDate: start,
            deadline: due,
            endDate: end,
            imageUrl: imageUrl || "",
            organizer: req.userId,
            status: getEventStatus({
                startDate: start,
                endDate: end
            })
        });

        return res.status(201).json({
            message: "Event created successfully",
            event
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to create event"
        });
    }
}

async function getEvents(req, res) {
    try {
        const events = await Event.find()
            .populate("organizer", "name department profilePhoto")
            .sort({ startDate: 1 });

        const updatedEvents = events.map((event) => {
            const item = event.toObject();
            item.status = getEventStatus(item);
            return item;
        });

        return res.json({ events: updatedEvents });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to load events"
        });
    }
}

async function getEventById(req, res) {
    try {
        const event = await Event.findById(req.params.id)
            .populate("organizer", "name department profilePhoto")
            .populate("winners.user", "name rollNumber profilePhoto")
            .populate("winners.photo", "title imageUrl category");

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const submissions = await EventSubmission.find({
            event: event._id
        })
            .populate("user", "name rollNumber profilePhoto")
            .populate("photo", "title imageUrl category likesCount")
            .sort({ createdAt: -1 });

        return res.json({
            event: {
                ...event.toObject(),
                status: getEventStatus(event)
            },
            submissions
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to retrieve event"
        });
    }
}

async function updateEvent(req, res) {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.organizer.toString() !== req.userId) {
            return res.status(403).json({
                message: "Only the event organizer can edit this event"
            });
        }

        const allowedFields = [
            "title",
            "description",
            "category",
            "startDate",
            "deadline",
            "endDate",
            "imageUrl"
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                event[field] = req.body[field];
            }
        }

        if (
            !event.title.trim() ||
            !event.description.trim() ||
            !Number.isFinite(event.startDate.getTime()) ||
            !Number.isFinite(event.deadline.getTime()) ||
            !Number.isFinite(event.endDate.getTime())
        ) {
            return res.status(400).json({
                message: "Please check the event details and dates"
            });
        }

        if (
            !(event.startDate <= event.deadline &&
            event.deadline <= event.endDate)
        ) {
            return res.status(400).json({
                message: "Dates must follow start date, deadline, end date order"
            });
        }

        event.status = getEventStatus(event);
        await event.save();

        return res.json({
            message: "Event updated successfully",
            event
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to update event"
        });
    }
}

async function deleteEvent(req, res) {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.organizer.toString() !== req.userId) {
            return res.status(403).json({
                message: "Only the event organizer can delete this event"
            });
        }

        await EventSubmission.deleteMany({
            event: event._id
        });

        await event.deleteOne();

        return res.json({
            message: "Event deleted successfully"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to delete event"
        });
    }
}

async function submitPhoto(req, res) {
    try {
        const { photoId } = req.body;

        if (!photoId) {
            return res.status(400).json({
                message: "Photo ID is required"
            });
        }

        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        const now = new Date();

        if (now < event.startDate || now > event.deadline) {
            return res.status(400).json({
                message: "Photo submission is not open for this event"
            });
        }

        const photo = await Photo.findOne({
            _id: photoId,
            owner: req.userId
        });

        if (!photo) {
            return res.status(404).json({
                message: "You can submit only your own uploaded photos"
            });
        }

        const submission = await EventSubmission.create({
            event: event._id,
            user: req.userId,
            photo: photo._id
        });

        await Event.updateOne(
            { _id: event._id },
            { $addToSet: { participants: req.userId } }
        );

        return res.status(201).json({
            message: "Photo submitted successfully",
            submission
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "You have already submitted this photo"
            });
        }

        return res.status(500).json({
            message: "Unable to submit photo"
        });
    }
}

async function setWinners(req, res) {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                message: "Event not found"
            });
        }

        if (event.organizer.toString() !== req.userId) {
            return res.status(403).json({
                message: "Only the event organizer can publish winners"
            });
        }

        if (new Date() <= event.deadline) {
            return res.status(400).json({
                message: "Winners can be published after the submission deadline"
            });
        }

        const { winners } = req.body;

        if (!Array.isArray(winners) || winners.length === 0) {
            return res.status(400).json({
                message: "Provide a winners array"
            });
        }

        const usedPositions = new Set();
        const validatedWinners = [];

        for (const winner of winners) {
            const position = Number(winner.position);

            if (
                !winner.photoId ||
                !Number.isInteger(position) ||
                position < 1 ||
                usedPositions.has(position)
            ) {
                return res.status(400).json({
                    message: "Each winner needs a photo ID and a unique positive position"
                });
            }

            const submission = await EventSubmission.findOne({
                event: event._id,
                photo: winner.photoId
            });

            if (!submission) {
                return res.status(400).json({
                    message: "Every winning photo must be submitted to this event"
                });
            }

            usedPositions.add(position);

            validatedWinners.push({
                user: submission.user,
                photo: submission.photo,
                position
            });
        }

        event.winners = validatedWinners;
        event.status = getEventStatus(event);

        await event.save();

        return res.json({
            message: "Competition results published",
            winners: event.winners
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to publish competition results"
        });
    }
}

module.exports = {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    submitPhoto,
    setWinners
};
