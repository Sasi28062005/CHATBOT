import { useState } from "react";
import axios from "axios";
import { Container, TextField, Button, Typography, Paper, Box } from "@mui/material";

function Chatbot() {
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);

    const sendMessage = async () => {
        if (!message.trim()) return;

        const response = await axios.post("http://localhost:5001/chatbot", { message });

        setChat([...chat, { user: message, bot: response.data.reply }]);
        setMessage("");
    };

    return (
        <Container maxWidth="sm">
            <Paper elevation={3} sx={{ padding: 3, marginTop: 5, textAlign: "center" }}>
                <Typography variant="h4" gutterBottom>
                😌Motivational Chatbot 🤖
                </Typography>

                <Box sx={{ maxHeight: 300, overflowY: "auto", padding: 2, backgroundColor: "#f0f0f0", borderRadius: 2 }}>
                    {chat.map((msg, index) => (
                        <Box key={index} sx={{ textAlign: msg.user ? "right" : "left", marginBottom: 1 }}>
                            <Typography variant="body1" sx={{ color: "blue" }}>
                                <b></b> {msg.user}
                            </Typography>
                            <Typography variant="body1" sx={{ color: "green" }}>
                                <b>Therapist:</b> {msg.bot}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{ marginTop: 2 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={sendMessage}
                    sx={{ marginTop: 2 }}
                >
                    Send
                </Button>
            </Paper>
        </Container>
    );
}

export default Chatbot;
