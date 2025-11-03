const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

const dbConfig = {
  host: process.env.MYSQLHOST || "localhost",
  user: process.env.MYSQLUSER || "root", 
  password: process.env.MYSQLPASSWORD || "",
  database: process.env.MYSQLDATABASE || "student_management",
  port: process.env.MYSQLPORT || 3306,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

console.log("Database Configuration:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

let db;

function initializeDatabase() {
  try {
    db = mysql.createConnection(dbConfig);
    
    db.connect((err) => {
      if (err) {
        console.error("❌ Database connection failed:", err.message);
        console.log("🔄 Retrying in 5 seconds...");
        setTimeout(initializeDatabase, 5000);
        return;
      }
      
      console.log("✅ Connected to MySQL database on Railway");
      createTable();
    });

    db.on('error', (err) => {
      console.error('❌ Database error:', err.message);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log("🔄 Reconnecting to database...");
        initializeDatabase();
      }
    });
    
  } catch (err) {
    console.error("❌ Failed to create database connection:", err.message);
    setTimeout(initializeDatabase, 5000);
  }
}

function createTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      course VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error("❌ Error creating table:", err);
    } else {
      console.log("✅ Students table is ready");
      
      db.query("SELECT COUNT(*) as count FROM students", (err, results) => {
        if (!err && results[0].count === 0) {
          addSampleData();
        }
      });
    }
  });
}

function addSampleData() {
  const sampleStudents = [
    ['MaddRhonyx', 'madd@example.com', 'Computer Science'],
    ['Lilly', 'lillian@example.com', 'Mathematics'],
    ['Mike', 'mike@example.com', 'Physics']
  ];
  
  sampleStudents.forEach((student, index) => {
    db.query(
      "INSERT IGNORE INTO students (name, email, course) VALUES (?, ?, ?)",
      student,
      (err) => {
        if (err) {
          console.error("❌ Error adding sample student:", err);
        } else if (index === sampleStudents.length - 1) {
          console.log("📝 Sample students added successfully");
        }
      }
    );
  });
}

app.get("/", (req, res) => {
  const dbStatus = db && db.state === 'authenticated' ? 'connected' : 'disconnected';
  
  res.json({ 
    message: "🎓 Student Management API is running!",
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    endpoints: {
      getStudents: "GET /api/students",
      addStudent: "POST /api/students",
      updateStudent: "PUT /api/students/:id",
      deleteStudent: "DELETE /api/students/:id"
    }
  });
});

app.get("/api/students", (req, res) => {
  if (!db || db.state !== 'authenticated') {
    return res.status(503).json({ 
      error: "Database temporarily unavailable",
      message: "Please try again in a few moments"
    });
  }
  
  db.query("SELECT * FROM students ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("❌ Error fetching students:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    } else {
      res.json(results);
    }
  });
});

app.post("/api/students", (req, res) => {
  if (!db || db.state !== 'authenticated') {
    return res.status(503).json({ 
      error: "Database temporarily unavailable",
      message: "Please try again in a few moments"
    });
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
        console.error("❌ Error adding student:", err);
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: "Email already exists" });
        } else {
          res.status(500).json({ error: "Failed to add student", details: err.message });
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

app.put("/api/students/:id", (req, res) => {
  if (!db || db.state !== 'authenticated') {
    return res.status(503).json({ 
      error: "Database temporarily unavailable",
      message: "Please try again in a few moments"
    });
  }

  const { id } = req.params;
  const { name, email, course } = req.body;

  if (!name || !email || !course) {
    return res.status(400).json({ error: "All fields are required" });
  }

  db.query(
    "UPDATE students SET name = ?, email = ?, course = ? WHERE id = ?",
    [name, email, course, id],
    (err, result) => {
      if (err) {
        console.error("❌ Error updating student:", err);
        if (err.code === 'ER_DUP_ENTRY') {
          res.status(400).json({ error: "Email already exists" });
        } else {
          res.status(500).json({ error: "Failed to update student", details: err.message });
        }
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

app.delete("/api/students/:id", (req, res) => {
  if (!db || db.state !== 'authenticated') {
    return res.status(503).json({ 
      error: "Database temporarily unavailable",
      message: "Please try again in a few moments"
    });
  }

  const { id } = req.params;

  db.query("DELETE FROM students WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("❌ Error deleting student:", err);
      res.status(500).json({ error: "Failed to delete student", details: err.message });
    } else {
      if (result.affectedRows === 0) {
        res.status(404).json({ error: "Student not found" });
      } else {
        res.json({ message: "Student deleted successfully" });
      }
    }
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 1000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  
  initializeDatabase();
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  if (db) {
    db.end();
  }
  process.exit(0);
});