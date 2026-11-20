
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const photoRoutes = require("./routes/photoRoutes");
const socialRoutes = require("./routes/socialRoutes");
const eventRoutes = require("./routes/eventRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173"
    })
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
    res.json({
        message: "Campus Photography Platform API is running"
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
    if (err) {
        console.error("Server error:", err.message);

        if (err.name === "MulterError") {
            return res.status(400).json({
                message: err.message
            });
        }

        return res.status(500).json({
            message: err.message || "Unexpected server error"
        });
    }

    next();
});

const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
    console.error("Please configure MONGO_URI in backend/.env");
    process.exit(1);
}

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(`Backend running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });
