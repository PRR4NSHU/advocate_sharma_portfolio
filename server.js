// ---------------- CONFIGURATION ----------------
import dotenv from 'dotenv';
dotenv.config();

// ---------------- IMPORTS ----------------
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';

// 👇 1. YAHAN NEW IMPORT HAI (Browser kholne ke liye)
import open from 'open'; 
// 👆

// ---------------- APP INIT ----------------
const app = express();
const PORT = process.env.PORT || 5000;

// ---------------- MIDDLEWARE ----------------
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// 👇 2. YAHAN CHANGE HAI (Ye aapke HTML/CSS ko server par dikhayega)
// '.' ka matlab hai ki current folder ki files (index.html) ko serve karo
app.use(express.static('.'));
// 👆

// ---------------- DATABASE CONNECTION ----------------
const dbUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/advocateApp';

mongoose.connect(dbUri)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    });

// ---------------- SCHEMAS ----------------
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

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    securityAnswer: { type: String, required: true }
});
const Admin = mongoose.model('Admin', AdminSchema);

// ---------------- SEED DEFAULT ADMIN ----------------
async function seedAdmin() {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            const adminUser = process.env.ADMIN_USERNAME;
            const adminPass = process.env.ADMIN_PASSWORD;
            const adminEmail = process.env.ADMIN_EMAIL;
            const adminSecAnswer = process.env.ADMIN_SECURITY_ANSWER;

            if (!adminUser || !adminPass || !adminEmail || !adminSecAnswer) return;

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPass, salt);
            const hashedAnswer = await bcrypt.hash(adminSecAnswer, salt); 

            await Admin.create({
                username: adminUser,
                password: hashedPassword,
                email: adminEmail,
                securityAnswer: hashedAnswer
            });
            console.log("🛡️  Default Admin Created.");
        }
    } catch (error) {
        console.error("Seed Error:", error);
    }
}
seedAdmin();

// ---------------- API ROUTES ----------------

app.post('/api/bookings', async (req, res) => {
    try {
        const { refId, name, phone, service, date } = req.body;
        if (!refId || !name || !phone || !service || !date) return res.status(400).json({ error: "All fields required" });
        await Booking.create(req.body);
        res.status(201).json({ message: "Booking Saved Successfully" });
    } catch (err) { res.status(500).json({ error: "Failed to save booking" }); }
});

app.get('/api/status/:refId', async (req, res) => {
    try {
        const booking = await Booking.findOne({ refId: req.params.refId });
        booking ? res.json(booking) : res.status(404).json({ message: "Booking not found" });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(401).json({ success: false, message: "User not found" });
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Invalid password" });
        res.json({ success: true, message: "Login successful" });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.post('/api/admin/reset-password', async (req, res) => {
    try {
        const { username, email, securityAnswer, newPassword } = req.body;
        const admin = await Admin.findOne({ username, email });
        if (!admin) return res.status(400).json({ success: false, message: "Invalid Username or Email" });
        const isAnsMatch = await bcrypt.compare(securityAnswer, admin.securityAnswer);
        if (!isAnsMatch) return res.status(400).json({ success: false, message: "Incorrect Security Answer" });
        const salt = await bcrypt.genSalt(10);
        admin.password = await bcrypt.hash(newPassword, salt);
        await admin.save();
        res.json({ success: true, message: "Password Updated Successfully" });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json(bookings);
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

app.put('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Update Failed" }); }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Delete Failed" }); }
});

// ---------------- START SERVER ----------------
app.listen(PORT, '0.0.0.0', async () => {
    const url = `http://localhost:${PORT}`;
    console.log(`🚀 Server running on ${url}`);
    
    // 👇 3. YAHAN CHANGE HAI (Server start hote hi URL open karega)
    try {
        await open(url); 
        console.log(`🌐 Website opened automatically in browser.`);
    } catch (err) {
        console.log("Could not open browser automatically.");
    }
    // 👆
});
