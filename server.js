const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

// Middleware - allow all origins for now
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

// Railway provides these environment variables automatically
const dbConfig = {
  host: process.env.MYSQLHOST || "localhost",
  user: process.env.MYSQLUSER || "root", 
  password: process.env.MYSQLPASSWORD || "",
  database: process.env.MYSQLDATABASE || "student_management",
  port: process.env.MYSQLPORT || 3306,
  reconnect: true,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
};

console.log("🔧 Database Config:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

const db = mysql.createConnection(dbConfig);

// Database connection with retry logic
function connectDatabase() {
  db.connect((err) => {
    if (err) {
      console.error("❌ Database connection failed:", err.message);
      console.log("🔄 Retrying in 5 seconds...");
      setTimeout(connectDatabase, 5000);
    } else {
      console.log("✅ Connected to MySQL database on Railway");
      initializeDatabase();
    }
  });
}

// Handle database disconnections
db.on('error', (err) => {
  console.error('❌ Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log("🔄 Reconnecting to database...");
    connectDatabase();
  }
});

// Initialize database table
function initializeDatabase() {
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
      
      // Add sample data if table is empty
      db.query("SELECT COUNT(*) as count FROM students", (err, results) => {
        if (!err && results[0].count === 0) {
          const sampleStudents = [
            ['John Doe', 'john@example.com', 'Computer Science'],
            ['Jane Smith', 'jane@example.com', 'Mathematics'],
            ['Mike Johnson', 'mike@example.com', 'Physics']
          ];
          
          sampleStudents.forEach((student) => {
            db.query(
              "INSERT IGNORE INTO students (name, email, course) VALUES (?, ?, ?)",
              student
            );
          });
          console.log("📝 Added sample students");
        }
      });
    }
  });
}

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "🎓 Student Management API is running!",
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: {
      connected: db.state === 'authenticated',
      host: process.env.MYSQLHOST || 'local'
    }
  });
});

// Get all students
app.get("/api/students", (req, res) => {
  db.query("SELECT * FROM students ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("❌ Error fetching students:", err);
      res.status(500).json({ error: "Database error", details: err.message });
    } else {
      res.json(results);
    }
  });
});

// Add new student
app.post("/api/students", (req, res) => {
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

// Update student
app.put("/api/students/:id", (req, res) => {
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
          res.status(500).json({ error: "Failed to update student" });
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

// Delete student
app.delete("/api/students/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM students WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("❌ Error deleting student:", err);
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

// Start server
const PORT = process.env.PORT || 1000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: https://your-app.railway.app/`);
  console.log(`📊 API: https://your-app.railway.app/api/students`);
  connectDatabase();
});