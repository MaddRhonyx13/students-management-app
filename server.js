const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Basic route that should always work
app.get("/", (req, res) => {
  res.json({ 
    message: "🎓 Student Management API is running!",
    status: "OK",
    database: "Not connected yet"
  });
});

// Test route without database
app.get("/api/students", (req, res) => {
  res.json([
    { id: 1, name: "Test Student", email: "test@example.com", course: "Testing" }
  ]);
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Basic server is working!`);
});