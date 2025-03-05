const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const app = express(); 
 // ✅ Define Express App
app.use(cors());
const port = process.env.PORT || 5001; // Change to 5001 or another free port
      // ✅ Define the Port

app.use(express.json());  // ✅ Middleware to parse JSON

const openai = new OpenAI({
    
    baseURL : "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: process.env.OPENAI_API_KEY,
    
});

// Route for Chatbot
app.post("/chatbot", async (req, res) => {
    const userMessage = req.body.message;

    try {
        const response = await openai.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [{role : "system" , content: "Emotional Analysis through sentiment and tone detection in short note with enriched anwers "},
                { role: "user", content: userMessage }],
        });

        res.json({ reply: response.choices[0].message.content });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the Server
app.listen(port, () => {
    console.log(`Chatbot server running on port ${port}`);
});
