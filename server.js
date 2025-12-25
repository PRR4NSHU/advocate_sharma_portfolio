// ---------------- CONFIGURATION ----------------
import dotenv from 'dotenv';
dotenv.config();

// ---------------- IMPORTS ----------------
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; // Import CORS
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';

// ---------------- APP INIT ----------------
const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- MIDDLEWARE (EDITED SECTION) ----------------

// 👇👇👇 YAHAN CHANGE KIYA HAI 👇👇👇
// "origin: '*'" ka matlab hai ki mobile ya kisi bhi IP se connection allow hai.
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// 👆👆👆 CHANGE END 👆👆👆

app.use(bodyParser.json());

// ---------------- DATABASE CONNECTION ----------------
const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/advocateApp';

mongoose.connect(dbUri)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    });

// ---------------- SCHEMAS ----------------

// Booking Schema
const BookingSchema = new mongoose.Schema({
    refId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    service: { type: String, required: true },
    date: { type: String, required: true },
    fee: String,
    txnId: String,
    status: { type: String, default: 'Pending Verification' },
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', BookingSchema);

// Admin Schema
const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    securityAnswer: { type: String, required: true }
});

const Admin = mongoose.model('Admin', AdminSchema);

// ---------------- SEED DEFAULT ADMIN (SECURE) ----------------
async function seedAdmin() {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            // Retrieve secrets from .env file
            const adminUser = process.env.ADMIN_USERNAME;
            const adminPass = process.env.ADMIN_PASSWORD;
            const adminEmail = process.env.ADMIN_EMAIL;
            const adminSecAnswer = process.env.ADMIN_SECURITY_ANSWER;

            // Check if .env variables exist
            if (!adminUser || !adminPass || !adminEmail || !adminSecAnswer) {
                console.error("❌ Error: Admin credentials missing in .env file.");
                return;
            }

            const salt = await bcrypt.genSalt(10);
            
            // Hash Password & Security Answer
            const hashedPassword = await bcrypt.hash(adminPass, salt);
            const hashedAnswer = await bcrypt.hash(adminSecAnswer, salt); 

            await Admin.create({
                username: adminUser,
                password: hashedPassword,
                email: adminEmail,
                securityAnswer: hashedAnswer
            });

            console.log("🛡️  Default Admin Created successfully using .env credentials.");
        }
    } catch (error) {
        console.error("Seed Error:", error);
    }
}
seedAdmin();

// ---------------- API ROUTES ----------------

// 1. Create Booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { refId, name, phone, service, date } = req.body;
        if (!refId || !name || !phone || !service || !date) {
            return res.status(400).json({ error: "All fields are required" });
        }

        await Booking.create(req.body);
        res.status(201).json({ message: "Booking Saved Successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to save booking" });
    }
});

// 2. Check Booking Status
app.get('/api/status/:refId', async (req, res) => {
    try {
        const booking = await Booking.findOne({ refId: req.params.refId });
        booking
            ? res.json(booking)
            : res.status(404).json({ message: "Booking not found" });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 3. Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        res.json({ success: true, message: "Login successful" });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 4. Admin Password Recovery
app.post('/api/admin/reset-password', async (req, res) => {
    try {
        const { username, email, securityAnswer, newPassword } = req.body;

        // Step A: Find Admin by Username & Email
        const admin = await Admin.findOne({ username, email });
        if (!admin) {
            return res.status(400).json({ success: false, message: "Invalid Username or Email" });
        }

        // Step B: Verify Security Answer
        const isAnsMatch = await bcrypt.compare(securityAnswer, admin.securityAnswer);
        if (!isAnsMatch) {
            return res.status(400).json({ success: false, message: "Incorrect Security Answer" });
        }

        // Step C: Update Password
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        await admin.save();

        res.json({ success: true, message: "Password Updated Successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 5. Get All Bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 6. Update Booking Status
app.put('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndUpdate(req.params.id, {
            status: req.body.status
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Update Failed" });
    }
});

// 7. Delete Booking
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Delete Failed" });
    }
});

// ---------------- START SERVER ----------------
app.listen(PORT, '0.0.0.0', () => { // '0.0.0.0' allows access from network
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Network access available on your IP:${PORT}`);
});