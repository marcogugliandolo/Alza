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
    password TEXT NOT NULL,
    profile_image TEXT,
    account_mode TEXT DEFAULT 'individual',
    theme_color TEXT DEFAULT 'default'
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'familiar', 'amigos'
    created_by INTEGER,
    invite_code TEXT UNIQUE,
    FOREIGN KEY (created_by) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER,
    user_id INTEGER,
    role TEXT DEFAULT 'member',
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

// Migration: Add user_id and group_id if they don't exist
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
  if (!tableInfo.find(col => col.name === 'group_id')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN group_id INTEGER DEFAULT NULL`);
  }
});

// Migration: Add profile_image to users if it doesn't exist
const userInfo = db.prepare(`PRAGMA table_info(users)`).all() as any[];
if (!userInfo.find(col => col.name === 'profile_image')) {
  db.exec(`ALTER TABLE users ADD COLUMN profile_image TEXT`);
}
if (!userInfo.find(col => col.name === 'account_mode')) {
  db.exec(`ALTER TABLE users ADD COLUMN account_mode TEXT DEFAULT 'individual'`);
}
if (!userInfo.find(col => col.name === 'theme_color')) {
  db.exec(`ALTER TABLE users ADD COLUMN theme_color TEXT DEFAULT 'default'`);
}

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
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
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
      // If we have a userId but no username in session, fetch it
      if (!req.session.username) {
        const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(userId) as any;
        if (user) {
          req.session.userId = user.id;
          req.session.username = user.username;
        } else {
          return res.status(401).json({ error: "Usuario no encontrado" });
        }
      }
      return next();
    }
    res.status(401).json({ error: "No autorizado" });
  };

  // Helper to get full user data with group info
  const getFullUserData = (userId: number) => {
    const user = db.prepare("SELECT id, username, profile_image, account_mode, theme_color FROM users WHERE id = ?").get(userId) as any;
    if (user) {
      const group = db.prepare(`
        SELECT g.* FROM groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ?
      `).get(user.id) as any;
      
      if (group) {
        user.group = group;
        user.group.members = db.prepare(`
          SELECT u.id, u.username, u.profile_image, gm.role FROM users u
          JOIN group_members gm ON u.id = gm.user_id
          WHERE gm.group_id = ?
        `).all(group.id);
      }
    }
    return user;
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
      res.json(getFullUserData(user.id));
    } else {
      console.log(`Login failed for user: ${username}`);
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    const { username, password, account_mode, theme_color, invite_code } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    let mode = account_mode || 'individual';
    const theme = theme_color || 'default';
    try {
      let userId: number;
      db.transaction(() => {
        const result = db.prepare("INSERT INTO users (username, password, account_mode, theme_color) VALUES (?, ?, ?, ?)").run(username, hashedPassword, mode, theme);
        userId = result.lastInsertRowid as number;
        
        // Auto-login after registration
        req.session.userId = userId;
        req.session.username = username;

        // If invite code is provided, join that group instead of creating a new one
        if (invite_code) {
          const group = db.prepare("SELECT * FROM groups WHERE invite_code = ?").get(invite_code) as any;
          if (group) {
            db.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)").run(group.id, userId, 'member');
            // Update user account mode to match group type
            db.prepare("UPDATE users SET account_mode = ? WHERE id = ?").run(group.type, userId);
          }
        } else if (mode !== 'individual') {
          // If not individual and no invite code, create a new group
          const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
          const groupName = mode === 'familiar' ? `Familia de ${username}` : `Amigos de ${username}`;
          const groupResult = db.prepare("INSERT INTO groups (name, type, created_by, invite_code) VALUES (?, ?, ?, ?)").run(groupName, mode, userId, inviteCode);
          const groupId = groupResult.lastInsertRowid as number;
          db.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)").run(groupId, userId, 'admin');
        }
      })();
      
      res.json(getFullUserData(req.session.userId));
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "El nombre de usuario ya existe" });
      } else {
        res.status(500).json({ error: "Error al registrar el usuario" });
      }
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.session.userId) {
      const user = getFullUserData(req.session.userId);
      if (user) {
        res.json(user);
      } else {
        res.status(404).json({ error: "Usuario no encontrado" });
      }
    } else {
      res.status(401).json({ error: "No autenticado" });
    }
  });

  app.get("/api/groups/validate/:code", (req, res) => {
    const group = db.prepare("SELECT name, type FROM groups WHERE invite_code = ?").get(req.params.code) as any;
    if (group) {
      res.json({ valid: true, groupName: group.name, groupType: group.type });
    } else {
      res.status(404).json({ valid: false, error: "Código inválido" });
    }
  });

  app.post("/api/groups/join", isAuthenticated, (req, res) => {
    const { invite_code } = req.body;
    const userId = req.session.userId;

    const group = db.prepare("SELECT * FROM groups WHERE invite_code = ?").get(invite_code) as any;
    if (!group) {
      return res.status(404).json({ error: "Código de invitación inválido" });
    }

    try {
      db.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)").run(group.id, userId, 'member');
      // Update user account mode to match group type
      db.prepare("UPDATE users SET account_mode = ? WHERE id = ?").run(group.type, userId);
      res.json({ success: true, group });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
        res.status(400).json({ error: "Ya eres miembro de este grupo" });
      } else {
        res.status(500).json({ error: "Error al unirse al grupo" });
      }
    }
  });

  app.post("/api/groups/regenerate-code", isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    
    // Check if user is admin of their group
    const membership = db.prepare("SELECT group_id, role FROM group_members WHERE user_id = ?").get(userId) as any;
    
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: "Solo el administrador puede regenerar el código" });
    }

    const newInviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    db.prepare("UPDATE groups SET invite_code = ? WHERE id = ?").run(newInviteCode, membership.group_id);
    
    res.json({ invite_code: newInviteCode });
  });

  app.delete("/api/groups/members/:memberId", isAuthenticated, (req, res) => {
    const adminId = req.session.userId;
    const memberId = parseInt(req.params.memberId);

    // Check if the requester is an admin of the group the member belongs to
    const adminMembership = db.prepare("SELECT group_id, role FROM group_members WHERE user_id = ?").get(adminId) as any;
    
    if (!adminMembership || adminMembership.role !== 'admin') {
      return res.status(403).json({ error: "Solo el administrador puede eliminar miembros" });
    }

    const memberMembership = db.prepare("SELECT group_id FROM group_members WHERE user_id = ? AND group_id = ?").get(memberId, adminMembership.group_id) as any;

    if (!memberMembership) {
      return res.status(404).json({ error: "El usuario no pertenece a tu grupo" });
    }

    if (adminId.toString() === memberId.toString()) {
      return res.status(400).json({ error: "No puedes eliminarte a ti mismo del grupo" });
    }

    try {
      db.transaction(() => {
        // Remove from group
        db.prepare("DELETE FROM group_members WHERE user_id = ? AND group_id = ?").run(memberId, adminMembership.group_id);
        // Reset user account mode to individual
        db.prepare("UPDATE users SET account_mode = 'individual' WHERE id = ?").run(memberId);
      })();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Error al eliminar al miembro" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, (req, res) => {
    const { username, profile_image, theme_color } = req.body;
    const userId = req.session.userId;

    try {
      if (username) {
        db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, userId);
        req.session.username = username;
      }
      if (profile_image !== undefined) {
        db.prepare("UPDATE users SET profile_image = ? WHERE id = ?").run(profile_image, userId);
      }
      if (theme_color !== undefined) {
        db.prepare("UPDATE users SET theme_color = ? WHERE id = ?").run(theme_color, userId);
      }
      
      res.json(getFullUserData(userId));
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: "El nombre de usuario ya existe" });
      } else {
        res.status(500).json({ error: "Error al actualizar el perfil" });
      }
    }
  });

  app.patch("/api/auth/password", isAuthenticated, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.session.userId;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Contraseña actual y nueva requeridas" });
    }

    const user = db.prepare("SELECT password FROM users WHERE id = ?").get(userId) as any;
    if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(401).json({ error: "La contraseña actual es incorrecta" });
    }

    const hashedNewPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedNewPassword, userId);
    
    res.json({ success: true });
  });

  // Google OAuth Routes
  app.get("/api/auth/google/url", (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SEC;
      
      console.log("Checking OAuth config...");
      console.log("GOOGLE_CLIENT_ID present:", !!clientId);
      console.log("GOOGLE_CLIENT_SECRET/SEC present:", !!clientSecret);

      if (!clientId || !clientSecret) {
        const missing = [];
        if (!clientId) missing.push("GOOGLE_CLIENT_ID");
        if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
        
        return res.status(400).json({ 
          error: "Configuración incompleta", 
          message: `Faltan los siguientes secretos en AI Studio: ${missing.join(", ")}. Asegúrate de que el nombre sea exactamente GOOGLE_CLIENT_SECRET.` 
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
          client_secret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SEC || '',
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
        const profileImage = userData.picture || null;
        const result = db.prepare("INSERT INTO users (username, password, profile_image) VALUES (?, ?, ?)").run(userData.email, hashedPassword, profileImage);
        user = { id: result.lastInsertRowid, username: userData.email, profile_image: profileImage };
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
    const userId = req.session.userId;
    const categories = db.prepare(`
      SELECT * FROM categories 
      WHERE user_id IS NULL 
      OR user_id = ? 
      OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
    `).all(userId, userId);
    res.json(categories);
  });

  app.post("/api/categories", isAuthenticated, (req, res) => {
    const { name, icon, color } = req.body;
    const userId = req.session.userId;
    
    // Get user's group if any
    const group = db.prepare("SELECT group_id FROM group_members WHERE user_id = ?").get(userId) as any;
    const groupId = group ? group.group_id : null;

    try {
      const result = db.prepare("INSERT INTO categories (name, icon, color, user_id, group_id) VALUES (?, ?, ?, ?, ?)")
        .run(name, icon, color, userId, groupId);
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
    const userId = req.session.userId;
    const expenses = db.prepare(`
      SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
             u.username as author_name, u.profile_image as author_image
      FROM expenses e 
      LEFT JOIN categories c ON e.category_id = c.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.user_id = ? OR e.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
      ORDER BY date DESC
    `).all(userId, userId);
    res.json(expenses);
  });

  app.post("/api/expenses", isAuthenticated, (req, res) => {
    const { amount, description, date, category_id } = req.body;
    const userId = req.session.userId;
    
    // Get user's group if any
    const group = db.prepare("SELECT group_id FROM group_members WHERE user_id = ?").get(userId) as any;
    const groupId = group ? group.group_id : null;

    const result = db.prepare("INSERT INTO expenses (amount, description, date, category_id, user_id, group_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(amount, description, date, category_id, userId, groupId);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/expenses/:id", isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    db.prepare(`
      DELETE FROM expenses 
      WHERE id = ? 
      AND (user_id = ? OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))
    `).run(req.params.id, userId, userId);
    res.json({ success: true });
  });

  app.put("/api/expenses/:id", isAuthenticated, (req, res) => {
    const { amount, description, category_id, date } = req.body;
    const userId = req.session.userId;
    db.prepare(`
      UPDATE expenses SET amount = ?, description = ?, category_id = ?, date = ? 
      WHERE id = ? 
      AND (user_id = ? OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))
    `).run(amount, description, category_id, date, req.params.id, userId, userId);
    res.json({ success: true });
  });

  app.get("/api/goals", isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const goals = db.prepare(`
      SELECT * FROM goals 
      WHERE user_id = ? 
      OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
    `).all(userId, userId);
    res.json(goals);
  });

  app.post("/api/goals", isAuthenticated, (req, res) => {
    const { name, target_amount, deadline } = req.body;
    const userId = req.session.userId;
    
    // Get user's group if any
    const group = db.prepare("SELECT group_id FROM group_members WHERE user_id = ?").get(userId) as any;
    const groupId = group ? group.group_id : null;

    const result = db.prepare("INSERT INTO goals (name, target_amount, deadline, user_id, group_id) VALUES (?, ?, ?, ?, ?)")
      .run(name, target_amount, deadline, userId, groupId);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/goals/:id", isAuthenticated, (req, res) => {
    const { current_amount } = req.body;
    const userId = req.session.userId;
    db.prepare(`
      UPDATE goals SET current_amount = ? 
      WHERE id = ? 
      AND (user_id = ? OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))
    `).run(current_amount, req.params.id, userId, userId);
    res.json({ success: true });
  });

  app.delete("/api/goals/:id", isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    db.prepare(`
      DELETE FROM goals 
      WHERE id = ? 
      AND (user_id = ? OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))
    `).run(req.params.id, userId, userId);
    res.json({ success: true });
  });

  app.patch("/api/categories/:id/budget", isAuthenticated, (req, res) => {
    const { budget } = req.body;
    const userId = req.session.userId;
    db.prepare(`
      UPDATE categories SET budget = ? 
      WHERE id = ? 
      AND (user_id = ? OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?) OR user_id IS NULL)
    `).run(budget, req.params.id, userId, userId);
    res.json({ success: true });
  });

  app.get("/api/recurring", isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const recurring = db.prepare(`
      SELECT r.*, c.name as category_name, c.icon as category_icon, c.color as category_color 
      FROM recurring_expenses r 
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.user_id = ? OR r.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)
    `).all(userId, userId);
    res.json(recurring);
  });

  app.post("/api/recurring", isAuthenticated, (req, res) => {
    const { amount, description, category_id, frequency, next_date } = req.body;
    const userId = req.session.userId;
    
    // Get user's group if any
    const group = db.prepare("SELECT group_id FROM group_members WHERE user_id = ?").get(userId) as any;
    const groupId = group ? group.group_id : null;

    const result = db.prepare("INSERT INTO recurring_expenses (amount, description, category_id, frequency, next_date, user_id, group_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(amount, description, category_id, frequency, next_date, userId, groupId);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/recurring/:id", isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    db.prepare(`
      DELETE FROM recurring_expenses 
      WHERE id = ? 
      AND (user_id = ? OR group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))
    `).run(req.params.id, userId, userId);
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
    if (req.session.username !== 'gugliama' && req.session.username !== 'marcogugliandolo94@gmail.com') {
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
    if (req.session.username !== 'gugliama' && req.session.username !== 'marcogugliandolo94@gmail.com') {
      return res.status(403).json({ error: "No tienes permiso para ver usuarios" });
    }
    const users = db.prepare("SELECT id, username FROM users").all();
    res.json(users);
  });

  app.delete("/api/users/:id", isAuthenticated, (req, res) => {
    const currentUsername = req.session.username?.trim();
    console.log(`DELETE /api/users/${req.params.id} called by user: ${currentUsername} (ID: ${req.session.userId})`);
    
    if (currentUsername !== 'gugliama' && currentUsername !== 'marcogugliandolo94@gmail.com') {
      console.log(`Intento de eliminación no autorizado por: ${currentUsername}`);
      return res.status(403).json({ error: "No tienes permiso para eliminar usuarios" });
    }
    
    const userIdToDelete = parseInt(req.params.id, 10);
    
    if (isNaN(userIdToDelete)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }
    
    // Prevent deleting the admin user
    const userToDelete = db.prepare("SELECT username FROM users WHERE id = ?").get(userIdToDelete) as any;
    if (!userToDelete) {
      console.log(`Usuario a eliminar no encontrado: ${userIdToDelete}`);
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    const targetUsername = userToDelete.username?.trim();
    if (targetUsername === 'gugliama' || targetUsername === 'marcogugliandolo94@gmail.com') {
      console.log(`Intento de eliminar administrador: ${targetUsername}`);
      return res.status(400).json({ error: "No puedes eliminar a un administrador" });
    }
    
    try {
      const deleteTransaction = db.transaction(() => {
        db.prepare("DELETE FROM expenses WHERE user_id = ?").run(userIdToDelete);
        db.prepare("DELETE FROM recurring_expenses WHERE user_id = ?").run(userIdToDelete);
        db.prepare("DELETE FROM goals WHERE user_id = ?").run(userIdToDelete);
        db.prepare("DELETE FROM categories WHERE user_id = ?").run(userIdToDelete);
        db.prepare("DELETE FROM users WHERE id = ?").run(userIdToDelete);
      });
      
      deleteTransaction();
      console.log(`Usuario eliminado exitosamente: ${userIdToDelete}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Error al eliminar el usuario y sus datos: " + (error as Error).message });
    }
  });

  // API 404 handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
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

  app.use((err: any, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
