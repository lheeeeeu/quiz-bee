import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { GameEngine } from './game-engine.js';
import { supabaseSync } from './supabase-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Dynamic CORS origin validation for Vercel frontend + local development
const rawCorsOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowAllOrigins = rawCorsOrigins.length === 0 || rawCorsOrigins.includes('*');

function corsOriginValidator(origin, callback) {
  // Allow non-browser requests (curl, Cloud Run health probes, same-origin)
  if (!origin || allowAllOrigins) return callback(null, true);
  const normalized = origin.replace(/\/+$/, '');
  const isAllowed = rawCorsOrigins.some(allowed => {
    if (allowed === normalized) return true;
    // Support wildcard subdomain patterns like https://*.vercel.app
    if (allowed.includes('*')) {
      const regex = new RegExp('^' + allowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+') + '$');
      return regex.test(normalized);
    }
    return false;
  });
  if (isAllowed) return callback(null, true);
  return callback(new Error(`CORS origin not allowed: ${origin}`));
}

const io = new Server(server, {
  cors: {
    origin: corsOriginValidator,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: !allowAllOrigins
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000
});

const gameEngine = new GameEngine(io);

app.use(cors({
  origin: corsOriginValidator,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: !allowAllOrigins
}));
app.use(express.json({ limit: '5mb' }));

// Cloud Run Health Check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    supabase: supabaseSync.getStatus()
  });
});

// Health & Server Time
app.get('/api/time', (req, res) => {
  res.json({ serverTime: Date.now() });
});

// Full state snapshot
app.get('/api/state', (req, res) => {
  res.json(gameEngine.getFullState());
});

// Event & Display Config
app.get('/api/config', (req, res) => {
  res.json(db.getConfig());
});

app.post('/api/config', (req, res) => {
  const cfg = db.saveConfig(req.body);
  gameEngine.broadcastFullState();
  res.json(cfg);
});

// Local SQLite Database Management (Info, Export, Import, Clear Blank, Audit Logs)
app.get('/api/db/info', (req, res) => {
  res.json(db.getDatabaseInfo());
});

app.get('/api/db/audit-logs', (req, res) => {
  const limit = Number(req.query.limit) || 50;
  res.json(db.getAuditLogs(limit));
});

app.get('/api/db/export', (req, res) => {
  const snapshot = db.exportSnapshot();
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="quizbee-backup-${stamp}.json"`);
  res.send(JSON.stringify(snapshot, null, 2));
});

app.post('/api/db/import', (req, res) => {
  try {
    const info = db.importSnapshot(req.body);
    gameEngine.broadcastFullState();
    res.json({ success: true, dbInfo: info });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/db/clear-blank', (req, res) => {
  try {
    const state = gameEngine.clearToBlank();
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Supabase Cloud Sync Controls
app.get('/api/db/supabase/status', async (req, res) => {
  const status = await supabaseSync.checkConnection();
  gameEngine.broadcastFullState({ syncCloud: false });
  res.json(status);
});

app.post('/api/db/supabase/push', async (req, res) => {
  try {
    const status = await supabaseSync.pushToSupabase(db);
    gameEngine.broadcastFullState({ syncCloud: false });
    res.json({ success: true, status });
  } catch (err) {
    gameEngine.broadcastFullState({ syncCloud: false });
    res.status(400).json({ error: err.message, status: supabaseSync.getStatus() });
  }
});

app.post('/api/db/supabase/pull', async (req, res) => {
  try {
    const status = await supabaseSync.pullFromSupabase(db);
    gameEngine.broadcastFullState({ syncCloud: false });
    res.json({ success: true, status });
  } catch (err) {
    gameEngine.broadcastFullState({ syncCloud: false });
    res.status(400).json({ error: err.message, status: supabaseSync.getStatus() });
  }
});

// Categories / Rounds CRUD
app.get('/api/categories', (req, res) => {
  res.json(db.getCategories());
});

app.post('/api/categories', (req, res) => {
  const cat = db.saveCategory(req.body);
  gameEngine.broadcastFullState();
  res.json(cat);
});

app.delete('/api/categories/:id', (req, res) => {
  const cats = db.deleteCategory(req.params.id);
  gameEngine.broadcastFullState();
  res.json(cats);
});

// Questions CRUD & Bulk Import
app.get('/api/questions', (req, res) => {
  res.json(db.getQuestions());
});

app.post('/api/questions', (req, res) => {
  const q = db.saveQuestion(req.body);
  gameEngine.broadcastFullState();
  res.json(q);
});

app.post('/api/questions/bulk', (req, res) => {
  try {
    const items = Array.isArray(req.body?.questions) ? req.body.questions : [];
    for (const item of items) {
      if (item.question_text && item.correct_answer && item.category_id) {
        db.saveQuestion(item);
      }
    }
    gameEngine.broadcastFullState();
    res.json({ success: true, count: items.length, questions: db.getQuestions() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/questions/:id', (req, res) => {
  const list = db.deleteQuestion(req.params.id);
  gameEngine.broadcastFullState();
  res.json(list);
});

// Teams / Schools CRUD & Code Generation
app.get('/api/teams', (req, res) => {
  res.json(db.getTeams());
});

app.post('/api/teams', (req, res) => {
  const t = db.saveTeam(req.body);
  gameEngine.broadcastFullState();
  res.json(t);
});

app.post('/api/teams/:id/regenerate-code', (req, res) => {
  try {
    const team = db.regenerateTeamCode(req.params.id);
    gameEngine.broadcastFullState();
    res.json({ success: true, team });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/teams/regenerate-all-codes', (req, res) => {
  const teams = db.regenerateAllTeamCodes();
  gameEngine.broadcastFullState();
  res.json({ success: true, teams });
});

app.delete('/api/teams/:id', (req, res) => {
  const list = db.deleteTeam(req.params.id);
  gameEngine.broadcastFullState();
  res.json(list);
});

// Separate Portal Authentication Endpoints
app.post('/api/auth/admin-login', (req, res) => {
  const expected = (process.env.ADMIN_PASSCODE || 'ADMIN2026').trim();
  const provided = String(req.body?.passcode || '').trim();
  if (!provided || provided !== expected) {
    return res.status(401).json({ success: false, error: 'Invalid Admin Passcode.' });
  }
  res.json({ success: true });
});

app.post('/api/auth/team-login', (req, res) => {
  const rawCode = String(req.body?.code || '').trim().toUpperCase();
  if (!rawCode) {
    return res.status(400).json({ success: false, error: 'Please enter your group access code.' });
  }
  const team = db.getTeams().find(t => t.is_active && String(t.code || '').trim().toUpperCase() === rawCode);
  if (!team) {
    return res.status(401).json({ success: false, error: 'Invalid Group Code. Please check the code given by the admin.' });
  }
  res.json({ success: true, team });
});

// Host Actions REST
app.post('/api/host/set-idle', (req, res) => {
  try {
    res.json({ success: true, state: gameEngine.setIdle() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/display-question', (req, res) => {
  try {
    const { questionId } = req.body;
    const state = gameEngine.displayQuestion(questionId);
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/start-timer', (req, res) => {
  try {
    const state = gameEngine.startTimer();
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/expire-timer', (req, res) => {
  try {
    gameEngine.expireTimer();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/evaluate', (req, res) => {
  try {
    const { answerId, isCorrect, pointsOverride, overrideReason } = req.body;
    const answer = gameEngine.evaluateAnswer(answerId, isCorrect, pointsOverride, overrideReason);
    res.json({ success: true, answer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/auto-evaluate', (req, res) => {
  try {
    const { questionId } = req.body || {};
    const answers = gameEngine.autoEvaluateQuestion(questionId);
    res.json({ success: true, answers });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/judge-cell', (req, res) => {
  try {
    const { questionId, teamId, status, pointsOverride } = req.body;
    const answer = gameEngine.judgeCellUpdate(questionId, teamId, status, pointsOverride);
    res.json({ success: true, answer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/show-results', (req, res) => {
  try {
    const state = gameEngine.showResults();
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/show-round-results', (req, res) => {
  try {
    const { categoryId } = req.body || {};
    const state = gameEngine.showRoundResults(categoryId);
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/show-leaderboard', (req, res) => {
  try {
    const state = gameEngine.showLeaderboard();
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/next-question', (req, res) => {
  try {
    const { categoryId } = req.body || {};
    const state = gameEngine.nextQuestion(categoryId);
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/reset-scores', (req, res) => {
  try {
    const state = gameEngine.resetScoresOnly();
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/host/reset', (req, res) => {
  try {
    const state = gameEngine.resetCompetition();
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Team Answer Submission
app.post('/api/team/submit-answer', (req, res) => {
  try {
    const { teamId, questionId, answerText } = req.body;
    const answer = gameEngine.submitAnswer(teamId, questionId, answerText);
    res.json({ success: true, answer });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// WebSocket Connection Lifecycle
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.emit('game_state_update', gameEngine.getFullState());

  socket.on('team_identify', ({ teamId }) => {
    if (teamId) {
      gameEngine.registerTeamConnection(teamId, socket.id);
    }
  });

  socket.on('team_logout', () => {
    gameEngine.unregisterSocket(socket.id);
  });

  socket.on('team_draft_answer', ({ teamId, questionId, answerText }) => {
    try {
      gameEngine.submitAnswer(teamId, questionId, answerText);
    } catch (err) {
      socket.emit('submission_error', { message: err.message });
    }
  });

  socket.on('host_action', (action) => {
    try {
      switch (action.type) {
        case 'SET_IDLE':
          gameEngine.setIdle();
          break;
        case 'DISPLAY_QUESTION':
          gameEngine.displayQuestion(action.questionId);
          break;
        case 'START_TIMER':
          gameEngine.startTimer();
          break;
        case 'EXPIRE_TIMER':
          gameEngine.expireTimer();
          break;
        case 'EVALUATE_ANSWER':
          gameEngine.evaluateAnswer(action.answerId, action.isCorrect, action.pointsOverride, action.overrideReason);
          break;
        case 'AUTO_EVALUATE':
          gameEngine.autoEvaluateQuestion(action.questionId);
          break;
        case 'JUDGE_CELL_UPDATE':
          gameEngine.judgeCellUpdate(action.questionId, action.teamId, action.status, action.pointsOverride);
          break;
        case 'SHOW_RESULTS':
          gameEngine.showResults();
          break;
        case 'SHOW_ROUND_RESULTS':
          gameEngine.showRoundResults(action.categoryId);
          break;
        case 'SHOW_LEADERBOARD':
          gameEngine.showLeaderboard();
          break;
        case 'NEXT_QUESTION':
          gameEngine.nextQuestion(action.categoryId);
          break;
        case 'RESET_SCORES':
          gameEngine.resetScoresOnly();
          break;
        case 'CLEAR_BLANK':
          gameEngine.clearToBlank();
          break;
        case 'RESET':
          gameEngine.resetCompetition();
          break;
      }
    } catch (err) {
      socket.emit('action_error', { message: err.message });
    }
  });

  socket.on('disconnect', () => {
    gameEngine.unregisterSocket(socket.id);
  });
});

// Serve production dist
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send('Quiz Bee Competition Server running. Start Vite dev server for frontend or build dist.');
    }
  });
});

const PORT = Number(process.env.PORT) || 8080;
const HOST = '0.0.0.0';

async function startServer() {
  // Hydrate from Supabase before accepting live requests so Cloud Run cold starts never serve stale defaults
  const supa = await supabaseSync.initSync(db);

  server.listen(PORT, HOST, () => {
    const info = db.getDatabaseInfo();
    console.log(`====================================================`);
    console.log(`🏆 QUIZ BEE COMPETITION SERVER RUNNING ON ${HOST}:${PORT}`);
    console.log(`🗄️  Runtime Cache DB: ${info.engine} (${info.file})`);
    console.log(`🌐 CORS Allowed Origins: ${allowAllOrigins ? '*' : rawCorsOrigins.join(', ')}`);
    console.log(`📡 WebSocket ready & Server Time Authoritative`);
    if (supa.tablesReady) {
      console.log(`☁️  Supabase Cloud Sync ACTIVE (${supa.url})`);
    } else if (supa.configured) {
      console.log(`☁️  Supabase Configured (${supa.url}) — ${supa.lastError}`);
    }
    console.log(`====================================================`);
    gameEngine.broadcastFullState({ syncCloud: false });
  });
}

// Graceful shutdown for Google Cloud Run (flushes pending Supabase sync before container exit)
async function handleShutdown(signal) {
  console.log(`[Server] Received ${signal}. Flushing pending cloud sync...`);
  try {
    await supabaseSync.flushPendingPush();
    console.log('[Server] Cloud sync flushed cleanly.');
  } catch (err) {
    console.error('[Server] Error flushing cloud sync on shutdown:', err.message);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
