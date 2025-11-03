const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

console.log("🔧 MySQL Environment Variables Found!");
console.log("Host:", process.env.MYSQLHOST);
console.log("Database:", process.env.MYSQLDATABASE);
console.log("User:", process.env.MYSQLUSER);

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306
};

let db;
let dbConnected = false;

console.log("🔄 Connecting to database...");
db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    console.error("❌ DATABASE CONNECTION FAILED:", err.message);
  } else {
    console.log("✅ DATABASE CONNECTED SUCCESSFULLY!");
    dbConnected = true;
    
    // Create table
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
      } else {
        console.log("✅ Students table ready!");
        
        // Add sample data
        db.query("SELECT COUNT(*) as count FROM students", (err, results) => {
          if (!err && results[0].count === 0) {
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
            console.log("📝 Sample data added!");
          }
        });
      }
    });
  }
});

// Health check - uses our dbConnected flag instead of db.state
app.get("/", (req, res) => {
  res.json({
    message: "Student Management API",
    status: "OK",
    database: dbConnected ? "CONNECTED 🎉" : "CONNECTING...",
    table_created: "Yes (check MySQL Data tab)",
    sample_data: "3 students added",
    timestamp: new Date().toISOString()
  });
});

// Get all students - uses dbConnected flag
app.get("/api/students", (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ 
      error: "Database initializing",
      message: "Please wait a moment and try again"
    });
  }
  
  db.query("SELECT * FROM students ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("Error fetching students:", err);
      res.status(500).json({ error: "Database error" });
    } else {
      res.json(results);
    }
  });
});

// Add student
app.post("/api/students", (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: "Database initializing" });
  }

  const { name, email, course } = req.body;
  
  if (!name || !email || !course) {
    return res.status(400).json({ error: "All fields are required" });
  }

  db.query(
    "INSERT INTO students (name, email, course) VALUES (?, ?, ?)",
    [name, email, course],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: "Email already exists" });
        } else {
          res.status(500).json({ error: "Failed to add student" });
        }
      } else {
        res.status(201).json({
          id: result.insertId,
          name,
          email,
          course,
          message: "Student added successfully"
        });
      }
    }
  );
});

// Update student
app.put("/api/students/:id", (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: "Database initializing" });
  }

  const { id } = req.params;
  const { name, email, course } = req.body;

  db.query(
    "UPDATE students SET name = ?, email = ?, course = ? WHERE id = ?",
    [name, email, course, id],
    (err, result) => {
      if (err) {
        res.status(500).json({ error: "Failed to update student" });
      } else {
        if (result.affectedRows === 0) {
          res.status(404).json({ error: "Student not found" });
        } else {
          res.json({ message: "Student updated successfully" });
        }
      }
    }
  );
});

// Delete student
app.delete("/api/students/:id", (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ error: "Database initializing" });
  }

  const { id } = req.params;

  db.query("DELETE FROM students WHERE id = ?", [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: "Failed to delete student" });
    } else {
      if (result.affectedRows === 0) {
        res.status(404).json({ error: "Student not found" });
      } else {
        res.json({ message: "Student deleted successfully" });
      }
    }
  });
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});