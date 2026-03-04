import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import bcrypt from "bcryptjs";
import fs from "fs";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists for persistence
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, "expenses.db"));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    icon TEXT,
    color TEXT,
    budget REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    category_id INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT,
    category_id INTEGER,
    frequency TEXT NOT NULL, -- 'monthly', 'weekly'
    next_date TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

// Seed categories if empty
const categoryCount = db.prepare("SELECT count(*) as count FROM categories").get() as { count: number };
if (categoryCount.count === 0) {
  const insert = db.prepare("INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)");
  insert.run("Comida", "Utensils", "#ef4444");
  insert.run("Transporte", "Car", "#3b82f6");
  insert.run("Vivienda", "Home", "#10b981");
  insert.run("Entretenimiento", "Gamepad2", "#f59e0b");
  insert.run("Salud", "HeartPulse", "#ec4899");
  insert.run("Otros", "MoreHorizontal", "#6b7280");
}

// Seed default user if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync("superman94", 10);
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("gugliama", hashedPassword);
  console.log("Default user created: gugliama / superman94");
} else {
  // Ensure the requested user exists and has the correct password
  const hashedPassword = bcrypt.hashSync("superman94", 10);
  const existingUser = db.prepare("SELECT * FROM users WHERE username = ?").get("gugliama");
  if (!existingUser) {
    db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("gugliama", hashedPassword);
    console.log("User 'gugliama' created.");
  } else {
    // Force update password to be sure
    db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hashedPassword, "gugliama");
    console.log("User 'gugliama' password updated.");
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1); // Trust the first proxy (nginx)
  app.use(express.json());
  app.use(session({
    secret: "ahorra-secret-key",
    resave: true,
    saveUninitialized: true,
    proxy: true, // Trust the proxy for secure cookies
    cookie: { 
      secure: true, // Required for SameSite=None
      sameSite: "none", // Required for cross-origin iframe
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));

  // Auth Middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    // Check for session OR custom header (for iframe compatibility)
    const userId = req.session.userId || req.headers['x-user-id'];
    if (userId) {
      // If header was used, ensure it's a valid user (basic check)
      if (!req.session.userId && req.headers['x-user-id']) {
        const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(req.headers['x-user-id']) as any;
        if (user) {
          req.session.userId = user.id;
          req.session.username = user.username;
        } else {
          return res.status(401).json({ error: "No autorizado" });
        }
      }
      return next();
    }
    res.status(401).json({ error: "No autorizado" });
  };

  // Auth Routes
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for user: ${username}`);
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    
    if (user && bcrypt.compareSync(password, user.password)) {
      console.log(`Login successful for user: ${username}`);
      req.session.userId = user.id;
      req.session.username = user.username;
      res.json({ id: user.id, username: user.username });
    } else {
      console.log(`Login failed for user: ${username}`);
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.userId) {
      res.json({ id: req.session.userId, username: req.session.username });
    } else {
      res.status(401).json({ error: "No autenticado" });
    }
  });

  // API Routes
  app.get("/api/categories", isAuthenticated, (req, res) => {
    const categories = db.prepare("SELECT * FROM categories").all();
    res.json(categories);
  });

  app.get("/api/expenses", isAuthenticated, (req, res) => {
    const expenses = db.prepare(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color 
      FROM expenses e 
      LEFT JOIN categories c ON e.category_id = c.id
      ORDER BY date DESC
    `).all();
    res.json(expenses);
  });

  app.post("/api/expenses", isAuthenticated, (req, res) => {
    const { amount, description, date, category_id } = req.body;
    const result = db.prepare("INSERT INTO expenses (amount, description, date, category_id) VALUES (?, ?, ?, ?)")
      .run(amount, description, date, category_id);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/expenses/:id", isAuthenticated, (req, res) => {
    db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/goals", isAuthenticated, (req, res) => {
    const goals = db.prepare("SELECT * FROM goals").all();
    res.json(goals);
  });

  app.post("/api/goals", isAuthenticated, (req, res) => {
    const { name, target_amount, deadline } = req.body;
    const result = db.prepare("INSERT INTO goals (name, target_amount, deadline) VALUES (?, ?, ?)")
      .run(name, target_amount, deadline);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/goals/:id", isAuthenticated, (req, res) => {
    const { current_amount } = req.body;
    db.prepare("UPDATE goals SET current_amount = ? WHERE id = ?").run(current_amount, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/goals/:id", isAuthenticated, (req, res) => {
    db.prepare("DELETE FROM goals WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/categories/:id/budget", isAuthenticated, (req, res) => {
    const { budget } = req.body;
    db.prepare("UPDATE categories SET budget = ? WHERE id = ?").run(budget, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/recurring", isAuthenticated, (req, res) => {
    const recurring = db.prepare(`
      SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color 
      FROM recurring_expenses r 
      LEFT JOIN categories c ON r.category_id = c.id
    `).all();
    res.json(recurring);
  });

  app.post("/api/recurring", isAuthenticated, (req, res) => {
    const { amount, description, category_id, frequency, next_date } = req.body;
    const result = db.prepare("INSERT INTO recurring_expenses (amount, description, category_id, frequency, next_date) VALUES (?, ?, ?, ?, ?)")
      .run(amount, description, category_id, frequency, next_date);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/recurring/:id", isAuthenticated, (req, res) => {
    db.prepare("DELETE FROM recurring_expenses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/expenses/export", isAuthenticated, (req, res) => {
    const expenses = db.prepare(`
      SELECT e.date, e.amount, e.description, c.name as category
      FROM expenses e 
      LEFT JOIN categories c ON e.category_id = c.id
      ORDER BY date DESC
    `).all() as any[];
    
    const headers = ["Fecha", "Importe", "Descripción", "Categoría"];
    const rows = expenses.map(e => [e.date, e.amount, e.description || "", e.category || "Sin categoría"]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=gastos.csv");
    res.send(csv);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
