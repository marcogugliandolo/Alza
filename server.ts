import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import bcrypt from "bcryptjs";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

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
    user_id INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS recurring_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT,
    category_id INTEGER,
    frequency TEXT NOT NULL, -- 'monthly', 'weekly'
    next_date TEXT NOT NULL,
    user_id INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    user_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

// Migration: Add user_id if it doesn't exist
const tables = ['expenses', 'recurring_expenses', 'goals', 'categories'];
tables.forEach(table => {
  const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  if (!tableInfo.find(col => col.name === 'user_id')) {
    if (table === 'categories') {
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER DEFAULT NULL`);
    } else {
      db.exec(`ALTER TABLE ${table} ADD COLUMN user_id INTEGER DEFAULT 1`);
    }
  }
});

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

  // Google OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      
      console.log("Checking OAuth config...");
      console.log("GOOGLE_CLIENT_ID present:", !!clientId);
      console.log("GOOGLE_CLIENT_SECRET present:", !!clientSecret);

      if (!clientId || !clientSecret) {
        const missing = [];
        if (!clientId) missing.push("GOOGLE_CLIENT_ID");
        if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
        
        return res.status(400).json({ 
          error: "Configuración incompleta", 
          message: `Faltan los siguientes secretos en AI Studio: ${missing.join(", ")}. Asegúrate de que el interruptor 'Cloud Runtime' esté activado.` 
        });
      }

      // Detect appUrl from request to support custom domains automatically
      const host = req.get('x-forwarded-host') || req.get('host');
      // Force https as the app is behind a proxy that handles SSL
      const protocol = 'https'; 
      let appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
      
      if (host) {
        appUrl = `${protocol}://${host}`;
      }

      const redirectUri = `${appUrl}/api/auth/google/callback`;
      console.log("Generating Google Auth URL. Redirect URI:", redirectUri);
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent'
      });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      res.json({ url: authUrl, redirectUri });
    } catch (error) {
      console.error("Error generating Google Auth URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    
    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = 'https';
    let appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    
    if (host) {
      appUrl = `${protocol}://${host}`;
    }
    
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    console.log("Google OAuth callback received. Code present:", !!code);

    if (!code) {
      return res.status(400).send("Authorization code missing");
    }

    try {
      console.log("Exchanging code for tokens...");
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        console.error("Failed to get access token. Response:", tokenData);
        throw new Error('Failed to get access token: ' + (tokenData.error_description || tokenData.error || 'Unknown error'));
      }

      console.log("Access token obtained. Fetching user info...");
      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userResponse.json();

      if (!userData.email) {
        console.error("Failed to get user email. Response:", userData);
        throw new Error('Failed to get user email');
      }

      console.log("User email obtained:", userData.email);
      // Find or create user
      let user = db.prepare("SELECT * FROM users WHERE username = ?").get(userData.email) as any;
      if (!user) {
        console.log("Creating new user for email:", userData.email);
        // Create user with a random password since they use Google
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = bcrypt.hashSync(randomPassword, 10);
        const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(userData.email, hashedPassword);
        user = { id: result.lastInsertRowid, username: userData.email };
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      console.log("Session set for user:", user.username);

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      res.status(500).send(`Authentication failed: ${error.message}`);
    }
  });

  // API Routes
  app.get("/api/categories", isAuthenticated, (req, res) => {
    const categories = db.prepare("SELECT * FROM categories WHERE user_id IS NULL OR user_id = ?").all(req.session.userId);
    res.json(categories);
  });

  app.post("/api/categories", isAuthenticated, (req, res) => {
    const { name, icon, color } = req.body;
    try {
      const result = db.prepare("INSERT INTO categories (name, icon, color, user_id) VALUES (?, ?, ?, ?)")
        .run(name, icon, color, req.session.userId);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "Ya existe una categoría con ese nombre" });
      } else {
        res.status(500).json({ error: "Error al crear la categoría" });
      }
    }
  });

  app.get("/api/expenses", isAuthenticated, (req, res) => {
    const expenses = db.prepare(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color 
      FROM expenses e 
      LEFT JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ?
      ORDER BY date DESC
    `).all(req.session.userId);
    res.json(expenses);
  });

  app.post("/api/expenses", isAuthenticated, (req, res) => {
    const { amount, description, date, category_id } = req.body;
    const result = db.prepare("INSERT INTO expenses (amount, description, date, category_id, user_id) VALUES (?, ?, ?, ?, ?)")
      .run(amount, description, date, category_id, req.session.userId);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/expenses/:id", isAuthenticated, (req, res) => {
    db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
    res.json({ success: true });
  });

  app.put("/api/expenses/:id", isAuthenticated, (req, res) => {
    const { amount, description, category_id, date } = req.body;
    db.prepare("UPDATE expenses SET amount = ?, description = ?, category_id = ?, date = ? WHERE id = ? AND user_id = ?")
      .run(amount, description, category_id, date, req.params.id, req.session.userId);
    res.json({ success: true });
  });

  app.get("/api/goals", isAuthenticated, (req, res) => {
    const goals = db.prepare("SELECT * FROM goals WHERE user_id = ?").all(req.session.userId);
    res.json(goals);
  });

  app.post("/api/goals", isAuthenticated, (req, res) => {
    const { name, target_amount, deadline } = req.body;
    const result = db.prepare("INSERT INTO goals (name, target_amount, deadline, user_id) VALUES (?, ?, ?, ?)")
      .run(name, target_amount, deadline, req.session.userId);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/goals/:id", isAuthenticated, (req, res) => {
    const { current_amount } = req.body;
    db.prepare("UPDATE goals SET current_amount = ? WHERE id = ? AND user_id = ?").run(current_amount, req.params.id, req.session.userId);
    res.json({ success: true });
  });

  app.delete("/api/goals/:id", isAuthenticated, (req, res) => {
    db.prepare("DELETE FROM goals WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
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
      WHERE r.user_id = ?
    `).all(req.session.userId);
    res.json(recurring);
  });

  app.post("/api/recurring", isAuthenticated, (req, res) => {
    const { amount, description, category_id, frequency, next_date } = req.body;
    const result = db.prepare("INSERT INTO recurring_expenses (amount, description, category_id, frequency, next_date, user_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(amount, description, category_id, frequency, next_date, req.session.userId);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/recurring/:id", isAuthenticated, (req, res) => {
    db.prepare("DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?").run(req.params.id, req.session.userId);
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

  app.post("/api/users", isAuthenticated, (req, res) => {
    if (req.session.username !== 'gugliama') {
      return res.status(403).json({ error: "No tienes permiso para registrar usuarios" });
    }
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    try {
      db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "No se pudo registrar el usuario" });
    }
  });

  app.get("/api/users", isAuthenticated, (req, res) => {
    if (req.session.username !== 'gugliama') {
      return res.status(403).json({ error: "No tienes permiso para ver usuarios" });
    }
    const users = db.prepare("SELECT id, username FROM users").all();
    res.json(users);
  });

  app.delete("/api/users/:id", isAuthenticated, (req, res) => {
    if (req.session.username !== 'gugliama') {
      return res.status(403).json({ error: "No tienes permiso para eliminar usuarios" });
    }
    // Prevent deleting the admin user
    const userToDelete = db.prepare("SELECT username FROM users WHERE id = ?").get(req.params.id) as any;
    if (userToDelete && userToDelete.username === 'gugliama') {
      return res.status(400).json({ error: "No puedes eliminar al administrador principal" });
    }
    
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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
