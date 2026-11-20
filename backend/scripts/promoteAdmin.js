// backend/scripts/promoteAdmin.js

require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/User");

async function promoteAdmin() {
    const email = process.argv[2]?.trim().toLowerCase();

    if (!email) {
        console.error(
            "Usage: node scripts/promoteAdmin.js your-student-email"
        );
        process.exitCode = 1;
        return;
    }

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing from your backend .env file");
    }

    await mongoose.connect(process.env.MONGO_URI);

    try {
        const user = await User.findOne({ email });

        if (!user) {
            console.error(
                "No account found. Register the account before promoting it."
            );
            process.exitCode = 1;
            return;
        }

        user.role = "admin";
        user.isActive = true;

        await user.save();

        console.log(`Administrator role assigned to ${user.email}`);
    } finally {
        await mongoose.disconnect();
    }
}

promoteAdmin().catch(async (error) => {
    console.error("Unable to promote administrator:", error.message);

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    process.exitCode = 1;
});