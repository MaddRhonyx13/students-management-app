const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration - Railway automatically sets these
const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306
};

console.log("🔧 Database Configuration:");
console.log("Host:", dbConfig.host);
console.log("Database:", dbConfig.database);
console.log("User:", dbConfig.user);

let db;

// Initialize database
function initializeDatabase() {
  console.log("🔄 Connecting to database...");
  
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error("❌ DATABASE CONNECTION FAILED:", err.message);
      console.log("This means:");
      console.log("1. MySQL service is not connected to this app");
      console.log("2. Environment variables are missing");
      console.log("3. Database credentials are wrong");
      return;
    }

    console.log("✅ CONNECTED TO DATABASE!");
    setupTable();
  });
}

// Setup table and sample data
function setupTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      course VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createTableSQL, (err) => {
    if (err) {
      console.error("❌ Table creation error:", err.message);
      return;
    }
    
    console.log("✅ Students table ready!");
    addSampleData();
  });
}

// Add sample data
function addSampleData() {
  db.query("SELECT COUNT(*) as count FROM students", (err, results) => {
    if (err) return;
    
    if (results[0].count === 0) {
      console.log("📝 Adding sample data...");
      const samples = [
        ['John Doe', 'john@example.com', 'Computer Science'],
        ['Jane Smith', 'jane@example.com', 'Mathematics'],
        ['Mike Johnson', 'mike@example.com', 'Physics']
      ];
      
      samples.forEach(student => {
        db.query(
          "INSERT IGNORE INTO students (name, email, course) VALUES (?, ?, ?)",
          student
        );
      });
    }
  });
}

// Health check
app.get("/", (req, res) => {
  const dbConnected = db && db.state === 'authenticated';
  
  res.json({
    message: "Student Management API",
    status: "OK", 
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// Get all students
app.get("/api/students", (req, res) => {
  if (!db || db.state !== 'authenticated') {
    return res.status(503).json({
      error: "Database unavailable",
      message: "Database service is not connected to this app"
    });
  }
  
  db.query("SELECT * FROM students ORDER BY created_at DESC", (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(results);
    }
  });
});

// Add student
app.post("/api/students", (req, res) => {
  if (!db || db.state !== 'authenticated') {
    return res.status(503).json({ error: "Database unavailable" });
  }

  const { name, email, course } = req.body;
  
  if (!name || !email || !course) {
    return res.status(400).json({ error: "All fields required" });
  }

  db.query(
    "INSERT INTO students (name, email, course) VALUES (?, ?, ?)",
    [name, email, course],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: "Email exists" });
        } else {
          res.status(500).json({ error: err.message });
        }
      } else {
        res.status(201).json({
          id: result.insertId,
          name, email, course,
          message: "Student added"
        });
      }
    }
  );
});

// Update student
app.put("/api/students/:id", (req, res) => {
  if (!db || db.state !== 'authenticated') {
    return res.status(503).json({ error: "Database unavailable" });
  }

  const { id } = req.params;
  const { name, email, course } = req.body;

  db.query(
    "UPDATE students SET name=?, email=?, course=? WHERE id=?",
    [name, email, course, id],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (result.affectedRows === 0) {
        res.status(404).json({ error: "Student not found" });
      } else {
        res.json({ message: "Student updated" });
      }
    }
  );
});

// Delete student
app.delete("/api/students/:id", (req, res) => {
  if (!db || db.state !== 'authenticated') {
    return res.status(503).json({ error: "Database unavailable" });
  }

  const { id } = req.params;

  db.query("DELETE FROM students WHERE id=?", [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ error: "Student not found" });
    } else {
      res.json({ message: "Student deleted" });
    }
  });
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  initializeDatabase();
});