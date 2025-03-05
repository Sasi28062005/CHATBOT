const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const multer = require("multer"); // For handling file uploads
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose"); // For MongoDB
require("dotenv").config(); // Load environment variables from .env file

const app = express();
app.use(cors());
const port = process.env.PORT || 5001;

app.use(express.json());

// MongoDB Connection (using environment variable)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chatbot', { // Use MONGODB_URI from .env or local fallback
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Define schemas and models
const messageSchema = new mongoose.Schema({
    userId: String,
    messages: [{
        type: { type: String, enum: ['user', 'bot'] },
        content: String,
        image: String,
        timestamp: { type: Date, default: Date.now }
    }]
});

const Message = mongoose.model('Message', messageSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

const openai = new OpenAI({
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: process.env.OPENAI_API_KEY,
});

// Get chat history for a user
app.get("/chat-history/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const userChat = await Message.findOne({ userId });

        if (!userChat) {
            return res.json({ messages: [] });
        }

        res.json({ messages: userChat.messages });
    } catch (error) {
        console.error("Error fetching chat history:", error);
        res.status(500).json({ error: "Failed to fetch chat history" });
    }
});

// Text-only chatbot route
app.post("/chatbot", async (req, res) => {
    const userMessage = req.body.message;
    const userId = req.body.userId;

    try {
        const response = await openai.chat.completions.create({
            model: "learnlm-1.5-pro-experimental",
            messages: [{role: "system", content: "Emotional Analysis through sentiment and tone detection "},
                { role: "user", content: userMessage }],
        });

        const botReply = response.choices[0].message.content;

        if (userId) {
            await saveMessageToDb(userId, 'user', userMessage);
            await saveMessageToDb(userId, 'bot', botReply);
        }

        res.json({ reply: botReply });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Chatbot route with image upload
app.post("/chatbot-with-image", upload.single("image"), async (req, res) => {
    try {
        const userMessage = req.body.message || "";
        const userId = req.body.userId;
        let imageUrl = null;

        if (req.file) {
            imageUrl = `uploads/${req.file.filename}`; // In production, consider cloud storage
        }

        let promptText = userMessage;
        if (req.file) {
            promptText = `[User uploaded an image] ${userMessage}`;
        }

        const response = await openai.chat.completions.create({
            model: "learnlm-1.5-pro-experimental",
            messages: [
                {
                    role: "system",
                    content: "Emotional Analysis through sentiment and tone detection. If the user mentions uploading an image, acknowledge it in your response."
                },
                {
                    role: "user",
                    content: promptText
                }
            ],
        });

        const botReply = response.choices[0].message.content;

        if (userId) {
            await saveMessageToDb(userId, 'user', userMessage, imageUrl);
            await saveMessageToDb(userId, 'bot', botReply);
        }

        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }

        res.json({ reply: botReply });
    } catch (error) {
        console.error("Error:", error);
        if (req.file) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Helper function to save messages to MongoDB
async function saveMessageToDb(userId, type, content, image = null) {
    try {
        let userChat = await Message.findOne({ userId });

        if (!userChat) {
            userChat = new Message({
                userId,
                messages: []
            });
        }

        userChat.messages.push({
            type,
            content,
            image,
            timestamp: new Date()
        });

        await userChat.save();
    } catch (error) {
        console.error("Error saving message:", error);
    }
}

// Start the Server
app.listen(port, () => {
    console.log(`Chatbot server running on port ${port}`);
});