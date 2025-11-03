const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// Debug: Log all MySQL-related environment variables
console.log("=== DATABASE ENVIRONMENT VARIABLES ===");
const mysqlVars = Object.keys(process.env).filter(key => 
  key.includes('MYSQL') || key.includes('DATABASE') || key.includes('DB_')
);
mysqlVars.forEach(key => {
  // Don't log full passwords, just indicate they exist
  if (key.includes('PASSWORD')) {
    console.log(`${key}: [SET]`);
  } else {
    console.log(`${key}: ${process.env[key]}`);
  }
});
console.log("======================================");

// Try different possible connection configurations
let connectionConfigs = [
  // Try MYSQL_URL first (most common in Railway)
  { name: "MYSQL_URL", config: process.env.MYSQL_URL },
  // Try individual Railway MySQL variables
  { 
    name: "Railway MySQL Vars", 
    config: {
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      password: process.env.MYSQLPASSWORD,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT || 3306
    }
  },
  // Try DATABASE_URL (common alternative)
  { name: "DATABASE_URL", config: process.env.DATABASE_URL }
];

let db;
let currentConfig;

// Try each connection method
function tryConnections(index = 0) {
  if (index >= connectionConfigs.length) {
    console.error("❌ All connection attempts failed!");
    console.log("🔄 Retrying in 10 seconds...");
    setTimeout(() => tryConnections(0), 10000);
    return;
  }

  const config = connectionConfigs[index];
  console.log(`🔄 Attempting connection with: ${config.name}`);
  
  try {
    if (typeof config.config === 'string') {
      // It's a connection string
      db = mysql.createConnection(config.config);
      currentConfig = config.name;
    } else if (config.config.host) {
      // It's a config object
      db = mysql.createConnection(config.config);
      currentConfig = config.name;
    } else {
      // Invalid config, try next
      tryConnections(index + 1);
      return;
    }

    db.connect((err) => {
      if (err) {
        console.error(`❌ Failed with ${config.name}:`, err.message);
        tryConnections(index + 1);
      } else {
        console.log(`✅ SUCCESS! Connected using: ${config.name}`);
        initializeDatabase();
      }
    });

    db.on('error', (err) => {
      console.error('❌ Database connection lost:', err.message);
      setTimeout(() => tryConnections(0), 5000);
    });

  } catch (error) {
    console.error(`❌ Error with ${config.name}:`, error.message);
    tryConnections(index + 1);
  }
}

function initializeDatabase() {
  console.log("📋 Initializing database...");
  
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
      console.error("❌ Error creating table:", err.message);
    } else {
      console.log("✅ Students table ready!");
      
      // Add sample data if empty
      db.query("SELECT COUNT(*) as count FROM students", (err, results) => {
        if (!err && results[0].count === 0) {
          const sampleData = [
            ['John Doe', 'john@example.com', 'Computer Science'],
            ['Jane Smith', 'jane@example.com', 'Mathematics']
          ];
          
          sampleData.forEach(student => {
            db.query(
              "INSERT IGNORE INTO students (name, email, course) VALUES (?, ?, ?)",
              student
            );
          });
          console.log("📝 Added sample data");
        }
      });
    }
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