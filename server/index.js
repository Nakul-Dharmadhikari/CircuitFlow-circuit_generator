import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'circuitflow_production_jwt_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ---------------------------------------------------------------------------
// AUTHENTICATION ENDPOINTS
// ---------------------------------------------------------------------------

// Register new user with hashed password
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(cleanUsername, cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already registered' });
    }

    // Hash password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const userDisplayName = displayName?.trim() || username.trim();

    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, display_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, cleanUsername, cleanEmail, passwordHash, userDisplayName, now);

    const userPayload = {
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      displayName: userDisplayName,
      createdAt: now,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login user and return JWT session token
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password required' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const userRecord = db.prepare(`
      SELECT id, username, email, password_hash, display_name, created_at
      FROM users
      WHERE username = ? OR email = ?
    `).get(cleanIdentifier, cleanIdentifier);

    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, userRecord.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const userPayload = {
      id: userRecord.id,
      username: userRecord.username,
      email: userRecord.email,
      displayName: userRecord.display_name,
      createdAt: userRecord.created_at,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login successful',
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Current user profile check
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ---------------------------------------------------------------------------
// SAVED CIRCUITS ENDPOINTS (Private per user in database)
// ---------------------------------------------------------------------------

// Get all saved circuits for the authenticated user
app.get('/api/circuits', authenticateToken, (req, res) => {
  try {
    const circuits = db.prepare(`
      SELECT id, name, circuit_json, created_at, updated_at
      FROM circuits
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.user.id);

    const parsed = circuits.map((c) => ({
      id: c.id,
      name: c.name,
      circuit: JSON.parse(c.circuit_json),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    res.json({ circuits: parsed });
  } catch (error) {
    console.error('Error fetching circuits:', error);
    res.status(500).json({ error: 'Failed to retrieve saved circuits' });
  }
});

// Save or overwrite a circuit
app.post('/api/circuits', authenticateToken, (req, res) => {
  try {
    const { id, name, circuit } = req.body;

    if (!name || !circuit) {
      return res.status(400).json({ error: 'Circuit name and data are required' });
    }

    const circuitId = id || `ckt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();
    const jsonStr = JSON.stringify(circuit);

    db.prepare(`
      INSERT INTO circuits (id, user_id, name, circuit_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        circuit_json = excluded.circuit_json,
        updated_at = excluded.updated_at
    `).run(circuitId, req.user.id, name.trim(), jsonStr, now, now);

    res.json({
      message: 'Circuit saved successfully',
      id: circuitId,
      name: name.trim(),
      updatedAt: now,
    });
  } catch (error) {
    console.error('Error saving circuit:', error);
    res.status(500).json({ error: 'Failed to save circuit' });
  }
});

// Delete a circuit
app.delete('/api/circuits/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM circuits
      WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Circuit not found or access denied' });
    }

    res.json({ message: 'Circuit deleted successfully' });
  } catch (error) {
    console.error('Error deleting circuit:', error);
    res.status(500).json({ error: 'Failed to delete circuit' });
  }
});

// ---------------------------------------------------------------------------
// CUSTOM IC DEFINITIONS ENDPOINTS (Database persistence)
// ---------------------------------------------------------------------------

// Get user custom ICs
app.get('/api/custom-ics', authenticateToken, (req, res) => {
  try {
    const customICs = db.prepare(`
      SELECT id, part_number, name, definition_json, created_at, updated_at
      FROM custom_ics
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.user.id);

    const parsed = customICs.map((ic) => JSON.parse(ic.definition_json));
    res.json({ customICs: parsed });
  } catch (error) {
    console.error('Error fetching custom ICs:', error);
    res.status(500).json({ error: 'Failed to retrieve custom ICs' });
  }
});

// Save or update custom IC
app.post('/api/custom-ics', authenticateToken, (req, res) => {
  try {
    const icDef = req.body;
    if (!icDef || !icDef.id || (!icDef.name && !icDef.partNumber)) {
      return res.status(400).json({ error: 'Invalid custom IC definition' });
    }

    const now = Date.now();
    const jsonStr = JSON.stringify(icDef);

    db.prepare(`
      INSERT INTO custom_ics (id, user_id, part_number, name, definition_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        part_number = excluded.part_number,
        name = excluded.name,
        definition_json = excluded.definition_json,
        updated_at = excluded.updated_at
    `).run(icDef.id, req.user.id, icDef.partNumber || icDef.name, icDef.name || icDef.partNumber, jsonStr, now, now);

    res.json({ message: 'Custom IC saved successfully', id: icDef.id });
  } catch (error) {
    console.error('Error saving custom IC:', error);
    res.status(500).json({ error: 'Failed to save custom IC' });
  }
});

// Delete custom IC
app.delete('/api/custom-ics/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare(`
      DELETE FROM custom_ics
      WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Custom IC not found or access denied' });
    }

    res.json({ message: 'Custom IC deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom IC:', error);
    res.status(500).json({ error: 'Failed to delete custom IC' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: Date.now(), service: 'CircuitFlow Backend API' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CircuitFlow Backend] Production API running on http://localhost:${PORT}`);
});
