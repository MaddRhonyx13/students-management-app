const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.json({ 
    message: "🎓 Student Management API is running!",
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// Test students route
app.get("/api/students", (req, res) => {
  res.json([
    { 
      id: 1, 
      name: "John Doe", 
      email: "john@example.com", 
      course: "Computer Science" 
    },
    { 
      id: 2, 
      name: "Jane Smith", 
      email: "jane@example.com", 
      course: "Mathematics" 
    }
  ]);
});

// Add student route
app.post("/api/students", (req, res) => {
  const { name, email, course } = req.body;
  
  if (!name || !email || !course) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Simulate adding student
  const newStudent = {
    id: Math.floor(Math.random() * 1000),
    name,
    email,
    course,
    message: "Student added successfully"
  };

  res.status(201).json(newStudent);
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
});