const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Accept student email addresses from the NITW student domain.
const emailPattern = /^[a-z0-9]{11}@student\.nitw\.ac\.in$/i;

// Return only the user information needed by the frontend.
function publicUser(user) {
    return {
        id: user._id,
        name: user.name,
        rollNumber: user.rollNumber,
        department: user.department,
        year: user.year,
        email: user.email,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        role: user.role || "student",
        isActive: user.isActive !== false,
        isEmailVerified: true
    };
}

// REGISTER USER
const registerUser = async (req, res) => {
    try {
        const {
            name,
            rollNumber,
            department,
            year,
            email,
            password
        } = req.body;

        // Check required fields.
        if (
            !name ||
            !rollNumber ||
            !department ||
            !year ||
            !email ||
            !password
        ) {
            return res.status(400).json({
                message: "Please fill all fields."
            });
        }

        // Check NITW student email.
        if (!emailPattern.test(String(email).trim())) {
            return res.status(400).json({
                message:
                    "Please enter an 11-character NITW student ID followed by @student.nitw.ac.in, such as bk24csb0a12@student.nitw.ac.in"
            });
        }

        // Check password length.
        if (String(password).length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters."
            });
        }

        // Check academic year.
        const numericYear = Number(year);

        if (![1, 2, 3, 4].includes(numericYear)) {
            return res.status(400).json({
                message: "Please select a valid academic year."
            });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanRoll = String(rollNumber).trim().toUpperCase();

        // Check whether email or roll number already exists.
        const existingUser = await User.findOne({
            $or: [
                { email: cleanEmail },
                { rollNumber: cleanRoll }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Email or roll number already registered."
            });
        }

        // Encrypt the password before saving it.
        const hashedPassword = await bcrypt.hash(
            String(password),
            10
        );

        // Create the new student account.
        const user = await User.create({
            name: String(name).trim(),
            rollNumber: cleanRoll,
            department: String(department).trim(),
            year: numericYear,
            email: cleanEmail,
            password: hashedPassword,
            role: "student",
            isActive: true,
            isEmailVerified: true
        });

        return res.status(201).json({
            message: "Registration successful! You can now log in.",
            user: publicUser(user),
            requiresEmailVerification: false
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email or roll number already registered."
            });
        }

        return res.status(500).json({
            message: "Registration failed due to a server error."
        });
    }
};

// LOGIN USER
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter email and password."
            });
        }

        // Find user using email.
        const user = await User.findOne({
            email: String(email).trim().toLowerCase()
        });

        // Check password.
        if (
            !user ||
            !(await bcrypt.compare(String(password), user.password))
        ) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Check whether account is active.
        if (user.isActive === false) {
            return res.status(403).json({
                message:
                    "This account has been deactivated. Contact the administrator."
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        // Generate login token.
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            message: "Login successful!",
            token,
            user: publicUser(user)
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "Login failed due to a server error."
        });
    }
};

// Compatibility handlers for any old frontend calls.
// Email verification is disabled.
const verifyEmail = async (req, res) => {
    return res.status(410).json({
        message: "Email verification is disabled."
    });
};

const resendVerificationOtp = async (req, res) => {
    return res.status(410).json({
        message: "Email verification is disabled."
    });
};

module.exports = {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerificationOtp
};