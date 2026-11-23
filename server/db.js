import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'quizbee.db');

const DEFAULT_CONFIG = {
  event_name: 'IT Skills Olympics',
  event_category: 'Quiz Bee',
  event_subtitle: 'Inter-University Competition Portal',
  participant_label: 'School / University',
  primary_color: '#3e1b20',
  accent_color: '#b89b4a',
  display_theme: 'light',
  results_sort_by: 'number',
  round_complete_note: 'Results are locked while the host prepares the next round.',
  auto_evaluate_exact: true
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-easy', name: 'Easy Round', badge_color: '#3e1b20', default_points: 3, default_timer_seconds: 15, question_count: 10, display_order: 1 },
  { id: 'cat-avg', name: 'Average Round', badge_color: '#7c2d12', default_points: 5, default_timer_seconds: 20, question_count: 10, display_order: 2 },
  { id: 'cat-diff', name: 'Difficult Round', badge_color: '#991b1b', default_points: 10, default_timer_seconds: 30, question_count: 10, display_order: 3 },
  { id: 'cat-clinch', name: 'Clincher Round', badge_color: '#b89b4a', default_points: 1, default_timer_seconds: 30, question_count: 5, display_order: 4 }
];

const DEFAULT_QUESTIONS = [
  {
    id: 'q-easy-1',
    category_id: 'cat-easy',
    question_number: 1,
    question_type: 'identification',
    choices: [],
    question_text: 'What is the smallest unit of data representation in a computer?',
    image_url: '',
    correct_answer: 'Bit',
    accepted_answers: 'bit, binary digit',
    explanation: 'A bit (binary digit) represents a single binary value of either 0 or 1.',
    points: 3,
    timer_seconds: 15,
    order_index: 1,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-2',
    category_id: 'cat-easy',
    question_number: 2,
    question_type: 'identification',
    choices: [],
    question_text: 'In computer networking, what protocol is primarily used to translate domain names into IP addresses?',
    image_url: '',
    correct_answer: 'DNS',
    accepted_answers: 'Domain Name System, DNS',
    explanation: 'DNS (Domain Name System) maps human-readable hostnames to numeric IP addresses.',
    points: 3,
    timer_seconds: 15,
    order_index: 2,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-3',
    category_id: 'cat-easy',
    question_number: 3,
    question_type: 'identification',
    choices: [],
    question_text: 'What data structure operates strictly on a Last-In, First-Out (LIFO) principle?',
    image_url: '',
    correct_answer: 'Stack',
    accepted_answers: 'stack, a stack',
    explanation: 'A stack pushes and pops elements from the top, following LIFO ordering.',
    points: 3,
    timer_seconds: 15,
    order_index: 3,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-4',
    category_id: 'cat-easy',
    question_number: 4,
    question_type: 'identification',
    choices: [],
    question_text: 'In relational databases, what key uniquely identifies each record in a table and cannot contain NULL values?',
    image_url: '',
    correct_answer: 'Primary Key',
    accepted_answers: 'primary key, PK',
    explanation: 'A Primary Key enforces entity integrity by uniquely identifying every row.',
    points: 3,
    timer_seconds: 15,
    order_index: 4,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-5',
    category_id: 'cat-easy',
    question_number: 5,
    question_type: 'identification',
    choices: [],
    question_text: 'What OOP principle, whose name means "many forms," lets one method call through a superclass reference execute different subclass implementations at run time?',
    image_url: '',
    correct_answer: 'Polymorphism',
    accepted_answers: 'polymorphism, runtime polymorphism, dynamic polymorphism',
    explanation: 'Polymorphism allows objects of different subclasses to respond differently to the same method call.',
    points: 3,
    timer_seconds: 15,
    order_index: 5,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-6',
    category_id: 'cat-easy',
    question_number: 6,
    question_type: 'identification',
    choices: [],
    question_text: 'What HTTP status code indicates that a requested resource could not be found on the server?',
    image_url: '',
    correct_answer: '404',
    accepted_answers: '404, 404 Not Found, Not Found',
    explanation: 'HTTP 404 Not Found signals that the server cannot locate the requested URI.',
    points: 3,
    timer_seconds: 15,
    order_index: 6,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-7',
    category_id: 'cat-easy',
    question_number: 7,
    question_type: 'identification',
    choices: [],
    question_text: 'In Git version control, which command creates a local copy of an existing remote repository?',
    image_url: '',
    correct_answer: 'git clone',
    accepted_answers: 'git clone, clone',
    explanation: 'git clone copies the repository history, branches, and working tree locally.',
    points: 3,
    timer_seconds: 15,
    order_index: 7,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-8',
    category_id: 'cat-easy',
    question_number: 8,
    question_type: 'identification',
    choices: [],
    question_text: 'What does the acronym "SQL" stand for?',
    image_url: '',
    correct_answer: 'Structured Query Language',
    accepted_answers: 'Structured Query Language',
    explanation: 'SQL is the standard language for managing and querying relational databases.',
    points: 3,
    timer_seconds: 15,
    order_index: 8,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-9',
    category_id: 'cat-easy',
    question_number: 9,
    question_type: 'identification',
    choices: [],
    question_text: 'Which layer of the OSI model is responsible for logical addressing and packet routing?',
    image_url: '',
    correct_answer: 'Network Layer',
    accepted_answers: 'Network Layer, Network, Layer 3',
    explanation: 'Layer 3 (Network Layer) handles IP addressing and routing across networks.',
    points: 3,
    timer_seconds: 15,
    order_index: 9,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-easy-10',
    category_id: 'cat-easy',
    question_number: 10,
    question_type: 'identification',
    choices: [],
    question_text: 'What is the decimal equivalent of the 8-bit binary number 00101010?',
    image_url: '',
    correct_answer: '42',
    accepted_answers: '42',
    explanation: '32 + 8 + 2 = 42.',
    points: 3,
    timer_seconds: 15,
    order_index: 10,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-avg-1',
    category_id: 'cat-avg',
    question_number: 1,
    question_type: 'identification',
    choices: [],
    question_text: 'What is the worst-case time complexity of binary search on a sorted array of n elements?',
    image_url: '',
    correct_answer: 'O(log n)',
    accepted_answers: 'O(log n), O(log2 n), logarithmic',
    explanation: 'Binary search halves the search interval on each comparison, yielding O(log n).',
    points: 5,
    timer_seconds: 20,
    order_index: 11,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-avg-2',
    category_id: 'cat-avg',
    question_number: 2,
    question_type: 'identification',
    choices: [],
    question_text: 'In database normalization, which normal form eliminates transitive dependencies on non-key attributes?',
    image_url: '',
    correct_answer: 'Third Normal Form',
    accepted_answers: '3NF, Third Normal Form, 3rd Normal Form',
    explanation: '3NF requires 2NF plus no non-prime attribute transitively dependent on a candidate key.',
    points: 5,
    timer_seconds: 20,
    order_index: 12,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-diff-1',
    category_id: 'cat-diff',
    question_number: 1,
    question_type: 'identification',
    choices: [],
    question_text: 'What theorem in distributed systems states that a data store can simultaneously provide at most two of Consistency, Availability, and Partition Tolerance?',
    image_url: '',
    correct_answer: 'CAP Theorem',
    accepted_answers: "CAP Theorem, CAP, Brewer Theorem, Brewer's Theorem",
    explanation: "Eric Brewer's CAP theorem defines fundamental trade-offs in distributed data stores.",
    points: 10,
    timer_seconds: 30,
    order_index: 13,
    is_active: true,
    is_revealed: false
  },
  {
    id: 'q-clinch-1',
    category_id: 'cat-clinch',
    question_number: 1,
    question_type: 'identification',
    choices: [],
    question_text: 'Which sorting algorithm invented by Tony Hoare uses a divide-and-conquer partitioning strategy with an average time complexity of O(n log n)?',
    image_url: '',
    correct_answer: 'Quicksort',
    accepted_answers: 'Quicksort, Quick Sort',
    explanation: 'Quicksort partitions elements around a pivot and recursively sorts subarrays.',
    points: 1,
    timer_seconds: 30,
    order_index: 14,
    is_active: true,
    is_revealed: false
  }
];

const DEFAULT_TEAMS = [
  { id: 'team-1', seat_number: 1, name: 'NU - Fairview', code: 'T01', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-2', seat_number: 2, name: 'UNIVERSITY OF NORTHERN PHILIPPINES', code: 'T02', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-3', seat_number: 3, name: 'LAGUNA UNIVERSITY', code: 'T03', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-4', seat_number: 4, name: 'STI COLLEGE GLOBAL CITY', code: 'T04', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-5', seat_number: 5, name: 'PAMANTASAN NG LUNGSOD NG VALENZUELA', code: 'T05', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-6', seat_number: 6, name: 'BICOL UNIVERSITY', code: 'T06', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-7', seat_number: 7, name: 'UNIVERSITY OF SANTO TOMAS', code: 'T07', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-8', seat_number: 8, name: 'UNIVERSIDAD DE MANILA', code: 'T08', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-9', seat_number: 9, name: 'UNIVERSITY OF THE EAST - MANILA CAMPUS', code: 'T09', avatar: '🏛️', color: '#3e1b20', is_active: true },
  { id: 'team-10', seat_number: 10, name: 'FEU INSTITUTE OF TECHNOLOGY', code: 'T10', avatar: '🏛️', color: '#3e1b20', is_active: true }
];

function normalizeAnswerString(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:]+$/g, '')
    .replace(/\s+/g, ' ');
}

function generateUniqueGroupCode(existingCodesSet) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 50; attempt++) {
    let part = '';
    for (let i = 0; i < 6; i++) {
      part += chars[Math.floor(Math.random() * chars.length)];
    }
    const code = `${part.slice(0, 3)}-${part.slice(3)}`;
    if (!existingCodesSet.has(code)) {
      existingCodesSet.add(code);
      return code;
    }
  }
  return `G${Date.now().toString().slice(-5)}`;
}

function toBool(val) {
  return val === 1 || val === true || val === '1';
}

function parseChoices(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class Database {
  constructor(dbPath = DB_FILE) {
    this.dbPath = dbPath;
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    this.sqlite = new DatabaseSync(this.dbPath);
    this.sqlite.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `);

    this.createTables();

    // Seed only if database has never been initialized (no config row)
    const cfgRow = this.sqlite.prepare('SELECT id FROM event_config WHERE id = ?').get('default');
    if (!cfgRow) {
      this.seedDefaults();
    } else {
      // Ensure active session row always exists
      const sessionRow = this.sqlite.prepare('SELECT id FROM competition_sessions WHERE id = ?').get('active_session');
      if (!sessionRow) {
        this.insertDefaultSession();
      }
    }
  }

  createTables() {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS event_config (
        id TEXT PRIMARY KEY DEFAULT 'default',
        event_name TEXT NOT NULL DEFAULT 'IT Skills Olympics',
        event_category TEXT NOT NULL DEFAULT 'Quiz Bee',
        event_subtitle TEXT NOT NULL DEFAULT 'Inter-University Competition Portal',
        participant_label TEXT NOT NULL DEFAULT 'School / University',
        primary_color TEXT NOT NULL DEFAULT '#3e1b20',
        accent_color TEXT NOT NULL DEFAULT '#b89b4a',
        display_theme TEXT NOT NULL DEFAULT 'light',
        results_sort_by TEXT NOT NULL DEFAULT 'number',
        round_complete_note TEXT NOT NULL DEFAULT 'Results are locked while the host prepares the next round.',
        auto_evaluate_exact INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        badge_color TEXT NOT NULL DEFAULT '#3e1b20',
        default_points INTEGER NOT NULL DEFAULT 3,
        default_timer_seconds INTEGER NOT NULL DEFAULT 15,
        question_count INTEGER NOT NULL DEFAULT 10,
        display_order INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        question_number INTEGER NOT NULL DEFAULT 1,
        question_type TEXT NOT NULL DEFAULT 'identification',
        choices_json TEXT NOT NULL DEFAULT '[]',
        question_text TEXT NOT NULL,
        image_url TEXT NOT NULL DEFAULT '',
        correct_answer TEXT NOT NULL,
        accepted_answers TEXT NOT NULL DEFAULT '',
        explanation TEXT NOT NULL DEFAULT '',
        points INTEGER NOT NULL DEFAULT 3,
        timer_seconds INTEGER NOT NULL DEFAULT 15,
        order_index INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_revealed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        seat_number INTEGER NOT NULL DEFAULT 1,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '🏛️',
        color TEXT NOT NULL DEFAULT '#3e1b20',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS competition_sessions (
        id TEXT PRIMARY KEY DEFAULT 'active_session',
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'IDLE',
        active_category_id TEXT,
        results_category_id TEXT,
        current_question_id TEXT,
        timer_started_at TEXT,
        timer_ends_at TEXT,
        timer_duration INTEGER NOT NULL DEFAULT 15,
        show_correct_answer INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (current_question_id) REFERENCES questions(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS answers (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL DEFAULT 'active_session',
        question_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        answer_text TEXT NOT NULL DEFAULT '',
        is_locked INTEGER NOT NULL DEFAULT 0,
        is_evaluated INTEGER NOT NULL DEFAULT 0,
        is_correct INTEGER,
        points_awarded INTEGER NOT NULL DEFAULT 0,
        override_reason TEXT,
        submitted_at TEXT NOT NULL,
        evaluated_at TEXT,
        UNIQUE(question_id, team_id),
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'host',
        summary TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id, question_number);
      CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
      CREATE INDEX IF NOT EXISTS idx_answers_team ON answers(team_id);
    `);
  }

  runInTransaction(fn) {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.sqlite.exec('COMMIT');
      return result;
    } catch (err) {
      try { this.sqlite.exec('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }

  logAudit(eventType, summary, payload = null, actor = 'host') {
    const now = new Date().toISOString();
    this.sqlite.prepare(`
      INSERT INTO audit_logs (event_type, actor, summary, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventType, actor, summary, payload ? JSON.stringify(payload) : null, now);
  }

  getAuditLogs(limit = 30) {
    return this.sqlite.prepare(`
      SELECT id, event_type, actor, summary, payload_json, created_at
      FROM audit_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(Number(limit) || 30).map(row => ({
      id: row.id,
      event_type: row.event_type,
      actor: row.actor,
      summary: row.summary,
      payload: row.payload_json ? JSON.parse(row.payload_json) : null,
      created_at: row.created_at
    }));
  }

  getDatabaseInfo() {
    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(this.dbPath).size;
    } catch { /* ignore */ }

    const counts = {
      categories: this.sqlite.prepare('SELECT COUNT(*) AS c FROM categories').get().c,
      questions: this.sqlite.prepare('SELECT COUNT(*) AS c FROM questions').get().c,
      teams: this.sqlite.prepare('SELECT COUNT(*) AS c FROM teams').get().c,
      answers: this.sqlite.prepare('SELECT COUNT(*) AS c FROM answers').get().c,
      audit_logs: this.sqlite.prepare('SELECT COUNT(*) AS c FROM audit_logs').get().c
    };

    return {
      engine: 'SQLite (Local Relational Database)',
      file: path.relative(path.join(__dirname, '..'), this.dbPath).replace(/\\/g, '/'),
      size_bytes: sizeBytes,
      counts
    };
  }

  insertDefaultSession(firstCategoryId = 'cat-easy') {
    const now = new Date().toISOString();
    const cfg = this.getConfig();
    const title = cfg.event_category ? `${cfg.event_name} / ${cfg.event_category}` : cfg.event_name;
    this.sqlite.prepare(`
      INSERT OR REPLACE INTO competition_sessions
      (id, title, status, active_category_id, results_category_id, current_question_id, timer_started_at, timer_ends_at, timer_duration, show_correct_answer, updated_at)
      VALUES ('active_session', ?, 'IDLE', ?, ?, NULL, NULL, NULL, 15, 0, ?)
    `).run(title, firstCategoryId, firstCategoryId, now);
  }

  seedDefaults() {
    const now = new Date().toISOString();
    this.runInTransaction(() => {
      this.sqlite.exec(`
        DELETE FROM answers;
        DELETE FROM competition_sessions;
        DELETE FROM questions;
        DELETE FROM teams;
        DELETE FROM categories;
        DELETE FROM event_config;
      `);

      this.sqlite.prepare(`
        INSERT INTO event_config (
          id, event_name, event_category, event_subtitle, participant_label,
          primary_color, accent_color, display_theme, results_sort_by,
          round_complete_note, auto_evaluate_exact, updated_at
        ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        DEFAULT_CONFIG.event_name,
        DEFAULT_CONFIG.event_category,
        DEFAULT_CONFIG.event_subtitle,
        DEFAULT_CONFIG.participant_label,
        DEFAULT_CONFIG.primary_color,
        DEFAULT_CONFIG.accent_color,
        DEFAULT_CONFIG.display_theme,
        DEFAULT_CONFIG.results_sort_by,
        DEFAULT_CONFIG.round_complete_note,
        DEFAULT_CONFIG.auto_evaluate_exact ? 1 : 0,
        now
      );

      const insertCat = this.sqlite.prepare(`
        INSERT INTO categories (id, name, badge_color, default_points, default_timer_seconds, question_count, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of DEFAULT_CATEGORIES) {
        insertCat.run(c.id, c.name, c.badge_color, c.default_points, c.default_timer_seconds, c.question_count, c.display_order, now);
      }

      const insertQ = this.sqlite.prepare(`
        INSERT INTO questions (
          id, category_id, question_number, question_type, choices_json, question_text,
          image_url, correct_answer, accepted_answers, explanation,
          points, timer_seconds, order_index, is_active, is_revealed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const q of DEFAULT_QUESTIONS) {
        insertQ.run(
          q.id, q.category_id, q.question_number, q.question_type, JSON.stringify(q.choices || []),
          q.question_text, q.image_url || '', q.correct_answer, q.accepted_answers || '',
          q.explanation || '', q.points, q.timer_seconds, q.order_index,
          q.is_active ? 1 : 0, q.is_revealed ? 1 : 0, now
        );
      }

      const insertTeam = this.sqlite.prepare(`
        INSERT INTO teams (id, seat_number, name, code, avatar, color, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const t of DEFAULT_TEAMS) {
        insertTeam.run(t.id, t.seat_number, t.name, t.code, t.avatar, t.color, t.is_active ? 1 : 0, now);
      }

      this.sqlite.prepare(`
        INSERT INTO competition_sessions
        (id, title, status, active_category_id, results_category_id, current_question_id, timer_started_at, timer_ends_at, timer_duration, show_correct_answer, updated_at)
        VALUES ('active_session', ?, 'IDLE', 'cat-easy', 'cat-easy', NULL, NULL, NULL, 15, 0, ?)
      `).run(`${DEFAULT_CONFIG.event_name} / ${DEFAULT_CONFIG.event_category}`, now);
    });

    this.logAudit('DB_SEED', 'Loaded sample IT Skills Olympics template into SQLite database', null, 'system');
  }

  clearToBlankCompetition() {
    const now = new Date().toISOString();
    this.runInTransaction(() => {
      this.sqlite.exec(`
        DELETE FROM answers;
        DELETE FROM questions;
        DELETE FROM teams;
      `);
      const firstCat = this.getCategories()[0]?.id || null;
      this.sqlite.prepare(`
        UPDATE competition_sessions
        SET status = 'IDLE', current_question_id = NULL, active_category_id = ?, results_category_id = ?,
            timer_started_at = NULL, timer_ends_at = NULL, show_correct_answer = 0, updated_at = ?
        WHERE id = 'active_session'
      `).run(firstCat, firstCat, now);
    });
    this.logAudit('DB_CLEAR_BLANK', 'Cleared sample questions, schools, and answers for a fresh competition');
    return this.getSession();
  }

  resetScoresOnly() {
    const now = new Date().toISOString();
    this.runInTransaction(() => {
      this.sqlite.exec('DELETE FROM answers');
      this.sqlite.exec('UPDATE questions SET is_revealed = 0');
      this.sqlite.prepare(`
        UPDATE competition_sessions
        SET status = 'IDLE', current_question_id = NULL,
            timer_started_at = NULL, timer_ends_at = NULL,
            show_correct_answer = 0, updated_at = ?
        WHERE id = 'active_session'
      `).run(now);
    });
    this.logAudit('RESET_SCORES', 'Cleared all answers & scores; kept rounds, questions, schools, and event config');
    return this.getSession();
  }

  resetCompetition() {
    this.seedDefaults();
    return this.getSession();
  }

  // Export & Import complete database snapshot
  exportSnapshot() {
    return {
      version: 2,
      exported_at: new Date().toISOString(),
      config: this.getConfig(),
      categories: this.getCategories(),
      questions: this.getQuestions(),
      teams: this.getTeams(),
      answers: this.getAnswers()
    };
  }

  importSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.categories) || !Array.isArray(snapshot.teams)) {
      throw new Error('Invalid backup file format. Expected categories, questions, and teams arrays.');
    }

    const now = new Date().toISOString();
    const cfg = { ...DEFAULT_CONFIG, ...(snapshot.config || {}) };
    const categories = snapshot.categories;
    const questions = Array.isArray(snapshot.questions) ? snapshot.questions : [];
    const teams = snapshot.teams;
    const answers = Array.isArray(snapshot.answers) ? snapshot.answers : [];

    this.runInTransaction(() => {
      this.sqlite.exec(`
        DELETE FROM answers;
        DELETE FROM competition_sessions;
        DELETE FROM questions;
        DELETE FROM teams;
        DELETE FROM categories;
        DELETE FROM event_config;
      `);

      this.sqlite.prepare(`
        INSERT INTO event_config (
          id, event_name, event_category, event_subtitle, participant_label,
          primary_color, accent_color, display_theme, results_sort_by,
          round_complete_note, auto_evaluate_exact, updated_at
        ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        cfg.event_name, cfg.event_category, cfg.event_subtitle, cfg.participant_label,
        cfg.primary_color, cfg.accent_color, cfg.display_theme, cfg.results_sort_by,
        cfg.round_complete_note, cfg.auto_evaluate_exact ? 1 : 0, now
      );

      const insertCat = this.sqlite.prepare(`
        INSERT INTO categories (id, name, badge_color, default_points, default_timer_seconds, question_count, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      categories.forEach((c, idx) => {
        insertCat.run(
          c.id, c.name, c.badge_color || '#3e1b20', Number(c.default_points) || 3,
          Number(c.default_timer_seconds) || 15, Number(c.question_count) || 10,
          c.display_order !== undefined ? Number(c.display_order) : idx + 1, now
        );
      });

      const insertQ = this.sqlite.prepare(`
        INSERT INTO questions (
          id, category_id, question_number, question_type, choices_json, question_text,
          image_url, correct_answer, accepted_answers, explanation,
          points, timer_seconds, order_index, is_active, is_revealed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      questions.forEach((q, idx) => {
        insertQ.run(
          q.id, q.category_id, Number(q.question_number) || idx + 1, q.question_type || 'identification',
          JSON.stringify(Array.isArray(q.choices) ? q.choices : []), q.question_text,
          q.image_url || '', q.correct_answer, q.accepted_answers || '', q.explanation || '',
          Number(q.points) || 3, Number(q.timer_seconds) || 15,
          q.order_index !== undefined ? Number(q.order_index) : idx + 1,
          q.is_active === false ? 0 : 1, q.is_revealed ? 1 : 0, now
        );
      });

      const insertTeam = this.sqlite.prepare(`
        INSERT INTO teams (id, seat_number, name, code, avatar, color, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      teams.forEach((t, idx) => {
        insertTeam.run(
          t.id, t.seat_number !== undefined ? Number(t.seat_number) : idx + 1,
          t.name, String(t.code || `T${idx + 1}`).toUpperCase(),
          t.avatar || '🏛️', t.color || '#3e1b20', t.is_active === false ? 0 : 1, now
        );
      });

      const insertAns = this.sqlite.prepare(`
        INSERT INTO answers (
          id, session_id, question_id, team_id, answer_text,
          is_locked, is_evaluated, is_correct, points_awarded,
          override_reason, submitted_at, evaluated_at
        ) VALUES (?, 'active_session', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      answers.forEach(a => {
        insertAns.run(
          a.id || `ans-${a.question_id}-${a.team_id}`, a.question_id, a.team_id,
          a.answer_text || '', a.is_locked ? 1 : 0, a.is_evaluated ? 1 : 0,
          a.is_correct === null || a.is_correct === undefined ? null : (a.is_correct ? 1 : 0),
          Number(a.points_awarded) || 0, a.override_reason || null,
          a.submitted_at || now, a.evaluated_at || null
        );
      });

      const firstCatId = categories[0]?.id || null;
      const title = cfg.event_category ? `${cfg.event_name} / ${cfg.event_category}` : cfg.event_name;
      this.sqlite.prepare(`
        INSERT INTO competition_sessions
        (id, title, status, active_category_id, results_category_id, current_question_id, timer_started_at, timer_ends_at, timer_duration, show_correct_answer, updated_at)
        VALUES ('active_session', ?, 'IDLE', ?, ?, NULL, NULL, NULL, 15, 0, ?)
      `).run(title, firstCatId, firstCatId, now);
    });

    this.logAudit('DB_IMPORT', `Imported backup (${categories.length} rounds, ${questions.length} questions, ${teams.length} participants)`);
    return this.getDatabaseInfo();
  }

  // Event & Display Config
  getConfig() {
    const row = this.sqlite.prepare('SELECT * FROM event_config WHERE id = ?').get('default');
    if (!row) return { ...DEFAULT_CONFIG };
    return {
      event_name: row.event_name,
      event_category: row.event_category,
      event_subtitle: row.event_subtitle,
      participant_label: row.participant_label,
      primary_color: row.primary_color,
      accent_color: row.accent_color,
      display_theme: row.display_theme,
      results_sort_by: row.results_sort_by,
      round_complete_note: row.round_complete_note,
      auto_evaluate_exact: toBool(row.auto_evaluate_exact)
    };
  }

  saveConfig(updates) {
    const current = this.getConfig();
    const merged = { ...current, ...updates };
    const now = new Date().toISOString();

    this.sqlite.prepare(`
      INSERT OR REPLACE INTO event_config (
        id, event_name, event_category, event_subtitle, participant_label,
        primary_color, accent_color, display_theme, results_sort_by,
        round_complete_note, auto_evaluate_exact, updated_at
      ) VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      merged.event_name,
      merged.event_category,
      merged.event_subtitle,
      merged.participant_label,
      merged.primary_color,
      merged.accent_color,
      merged.display_theme,
      merged.results_sort_by,
      merged.round_complete_note,
      merged.auto_evaluate_exact ? 1 : 0,
      now
    );

    const title = merged.event_category ? `${merged.event_name} / ${merged.event_category}` : merged.event_name;
    this.sqlite.prepare('UPDATE competition_sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, now, 'active_session');

    this.logAudit('CONFIG_UPDATED', `Updated event configuration (${title})`);
    return this.getConfig();
  }

  // Session
  getSession() {
    const row = this.sqlite.prepare('SELECT * FROM competition_sessions WHERE id = ?').get('active_session');
    if (!row) {
      this.insertDefaultSession();
      return this.getSession();
    }
    return {
      ...row,
      show_correct_answer: toBool(row.show_correct_answer)
    };
  }

  updateSession(updates) {
    const current = this.getSession();
    const merged = { ...current, ...updates };
    const now = new Date().toISOString();

    this.sqlite.prepare(`
      UPDATE competition_sessions
      SET title = ?, status = ?, active_category_id = ?, results_category_id = ?,
          current_question_id = ?, timer_started_at = ?, timer_ends_at = ?,
          timer_duration = ?, show_correct_answer = ?, updated_at = ?
      WHERE id = 'active_session'
    `).run(
      merged.title,
      merged.status,
      merged.active_category_id ?? null,
      merged.results_category_id ?? null,
      merged.current_question_id ?? null,
      merged.timer_started_at ?? null,
      merged.timer_ends_at ?? null,
      Number(merged.timer_duration) || 15,
      merged.show_correct_answer ? 1 : 0,
      now
    );
    return this.getSession();
  }

  // Categories / Rounds
  getCategories() {
    return this.sqlite.prepare(`
      SELECT id, name, badge_color, default_points, default_timer_seconds, question_count, display_order
      FROM categories
      ORDER BY display_order ASC, created_at ASC
    `).all();
  }

  saveCategory(cat) {
    const now = new Date().toISOString();
    const existing = cat.id
      ? this.sqlite.prepare('SELECT * FROM categories WHERE id = ?').get(cat.id)
      : null;

    if (existing) {
      this.sqlite.prepare(`
        UPDATE categories
        SET name = ?, badge_color = ?, default_points = ?, default_timer_seconds = ?, question_count = ?, display_order = ?
        WHERE id = ?
      `).run(
        cat.name,
        cat.badge_color || existing.badge_color,
        Number(cat.default_points) || 1,
        Number(cat.default_timer_seconds) || 15,
        Math.max(1, Number(cat.question_count) || 10),
        cat.display_order !== undefined ? Number(cat.display_order) : existing.display_order,
        existing.id
      );
      this.logAudit('ROUND_UPDATED', `Updated round "${cat.name}"`);
    } else {
      const id = cat.id || `cat-${Date.now()}`;
      const countRow = this.sqlite.prepare('SELECT COUNT(*) AS c FROM categories').get();
      this.sqlite.prepare(`
        INSERT INTO categories (id, name, badge_color, default_points, default_timer_seconds, question_count, display_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        cat.name,
        cat.badge_color || '#3e1b20',
        Number(cat.default_points) || 3,
        Number(cat.default_timer_seconds) || 15,
        Math.max(1, Number(cat.question_count) || 10),
        cat.display_order !== undefined ? Number(cat.display_order) : countRow.c + 1,
        now
      );
      this.logAudit('ROUND_CREATED', `Created round "${cat.name}"`);
    }
    return this.getCategories();
  }

  deleteCategory(catId) {
    const cat = this.sqlite.prepare('SELECT name FROM categories WHERE id = ?').get(catId);
    this.sqlite.prepare('DELETE FROM categories WHERE id = ?').run(catId);
    if (cat) this.logAudit('ROUND_DELETED', `Deleted round "${cat.name}"`);
    return this.getCategories();
  }

  // Questions
  mapQuestionRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      category_id: row.category_id,
      question_number: row.question_number,
      question_type: row.question_type || 'identification',
      choices: parseChoices(row.choices_json),
      question_text: row.question_text,
      image_url: row.image_url || '',
      correct_answer: row.correct_answer,
      accepted_answers: row.accepted_answers || '',
      explanation: row.explanation || '',
      points: row.points,
      timer_seconds: row.timer_seconds,
      order_index: row.order_index,
      is_active: toBool(row.is_active),
      is_revealed: toBool(row.is_revealed)
    };
  }

  getQuestions() {
    const rows = this.sqlite.prepare(`
      SELECT q.*
      FROM questions q
      LEFT JOIN categories c ON q.category_id = c.id
      ORDER BY COALESCE(c.display_order, 999) ASC, q.question_number ASC, q.order_index ASC
    `).all();
    return rows.map(r => this.mapQuestionRow(r));
  }

  getQuestionsByCategory(categoryId) {
    const rows = this.sqlite.prepare(`
      SELECT *
      FROM questions
      WHERE category_id = ? AND is_active = 1
      ORDER BY question_number ASC, order_index ASC
    `).all(categoryId);
    return rows.map(r => this.mapQuestionRow(r));
  }

  getQuestion(id) {
    const row = this.sqlite.prepare('SELECT * FROM questions WHERE id = ?').get(id);
    return this.mapQuestionRow(row);
  }

  saveQuestion(q) {
    const now = new Date().toISOString();
    const existing = q.id
      ? this.sqlite.prepare('SELECT * FROM questions WHERE id = ?').get(q.id)
      : null;

    const maxNumRow = this.sqlite.prepare(`
      SELECT COALESCE(MAX(question_number), 0) AS m FROM questions WHERE category_id = ? AND id != ?
    `).get(q.category_id, q.id || '');
    const nextNum = (maxNumRow?.m || 0) + 1;

    const totalCount = this.sqlite.prepare('SELECT COUNT(*) AS c FROM questions').get().c;
    const choicesArr = Array.isArray(q.choices)
      ? q.choices.filter(c => String(c).trim() !== '')
      : [];

    const qNumber = q.question_number !== undefined && q.question_number !== ''
      ? Number(q.question_number)
      : (existing && existing.category_id === q.category_id ? existing.question_number : nextNum);

    if (existing) {
      this.sqlite.prepare(`
        UPDATE questions
        SET category_id = ?, question_number = ?, question_type = ?, choices_json = ?,
            question_text = ?, image_url = ?, correct_answer = ?, accepted_answers = ?,
            explanation = ?, points = ?, timer_seconds = ?, order_index = ?,
            is_active = ?, is_revealed = ?
        WHERE id = ?
      `).run(
        q.category_id,
        qNumber,
        q.question_type || 'identification',
        JSON.stringify(choicesArr),
        q.question_text,
        q.image_url || '',
        q.correct_answer,
        q.accepted_answers || '',
        q.explanation || '',
        Number(q.points) || 3,
        Number(q.timer_seconds) || 15,
        q.order_index !== undefined ? Number(q.order_index) : existing.order_index,
        q.is_active !== undefined ? (q.is_active ? 1 : 0) : existing.is_active,
        q.is_revealed !== undefined ? (q.is_revealed ? 1 : 0) : existing.is_revealed,
        existing.id
      );
      this.logAudit('QUESTION_UPDATED', `Updated Q${qNumber} (${q.question_text.slice(0, 48)})`);
    } else {
      const id = q.id || `q-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      this.sqlite.prepare(`
        INSERT INTO questions (
          id, category_id, question_number, question_type, choices_json, question_text,
          image_url, correct_answer, accepted_answers, explanation,
          points, timer_seconds, order_index, is_active, is_revealed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        q.category_id,
        qNumber,
        q.question_type || 'identification',
        JSON.stringify(choicesArr),
        q.question_text,
        q.image_url || '',
        q.correct_answer,
        q.accepted_answers || '',
        q.explanation || '',
        Number(q.points) || 3,
        Number(q.timer_seconds) || 15,
        q.order_index !== undefined ? Number(q.order_index) : totalCount + 1,
        q.is_active !== undefined ? (q.is_active ? 1 : 0) : 1,
        q.is_revealed ? 1 : 0,
        now
      );
      this.logAudit('QUESTION_CREATED', `Added Q${qNumber} (${q.question_text.slice(0, 48)})`);
    }
    return this.getQuestions();
  }

  markQuestionRevealed(questionId, revealed = true) {
    this.sqlite.prepare('UPDATE questions SET is_revealed = ? WHERE id = ?').run(revealed ? 1 : 0, questionId);
    return this.getQuestion(questionId);
  }

  deleteQuestion(id) {
    this.sqlite.prepare('DELETE FROM questions WHERE id = ?').run(id);
    this.logAudit('QUESTION_DELETED', `Deleted question ${id}`);
    return this.getQuestions();
  }

  // Teams / Schools
  mapTeamRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      seat_number: row.seat_number,
      name: row.name,
      code: row.code,
      avatar: row.avatar,
      color: row.color,
      is_active: toBool(row.is_active)
    };
  }

  getTeams() {
    const rows = this.sqlite.prepare(`
      SELECT * FROM teams ORDER BY seat_number ASC, created_at ASC
    `).all();
    return rows.map(r => this.mapTeamRow(r));
  }

  getTeam(id) {
    const row = this.sqlite.prepare('SELECT * FROM teams WHERE id = ? OR UPPER(code) = UPPER(?)').get(id, id);
    return this.mapTeamRow(row);
  }

  saveTeam(t) {
    const now = new Date().toISOString();
    const existing = t.id
      ? this.sqlite.prepare('SELECT * FROM teams WHERE id = ?').get(t.id)
      : null;

    const maxSeatRow = this.sqlite.prepare('SELECT COALESCE(MAX(seat_number), 0) AS m FROM teams').get();
    const seatNumber = t.seat_number !== undefined && t.seat_number !== ''
      ? Number(t.seat_number)
      : (existing ? existing.seat_number : (maxSeatRow?.m || 0) + 1);
    const existingCodes = new Set(this.getTeams().filter(x => x.id !== t.id).map(x => String(x.code || '').toUpperCase()));
    const code = t.code && String(t.code).trim() !== ''
      ? String(t.code).toUpperCase().trim()
      : (existing ? existing.code : generateUniqueGroupCode(existingCodes));

    if (existing) {
      this.sqlite.prepare(`
        UPDATE teams
        SET seat_number = ?, name = ?, code = ?, avatar = ?, color = ?, is_active = ?
        WHERE id = ?
      `).run(
        seatNumber,
        t.name,
        code,
        t.avatar || existing.avatar,
        t.color || existing.color,
        t.is_active !== undefined ? (t.is_active ? 1 : 0) : existing.is_active,
        existing.id
      );
      this.logAudit('TEAM_UPDATED', `Updated participant #${seatNumber} "${t.name}"`);
    } else {
      const id = t.id || `team-${Date.now()}`;
      this.sqlite.prepare(`
        INSERT INTO teams (id, seat_number, name, code, avatar, color, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        seatNumber,
        t.name,
        code,
        t.avatar || '🏛️',
        t.color || '#3e1b20',
        t.is_active !== undefined ? (t.is_active ? 1 : 0) : 1,
        now
      );
      this.logAudit('TEAM_CREATED', `Registered participant #${seatNumber} "${t.name}" (${code})`);
    }
    return this.getTeams();
  }

  deleteTeam(id) {
    const team = this.sqlite.prepare('SELECT name FROM teams WHERE id = ?').get(id);
    this.sqlite.prepare('DELETE FROM teams WHERE id = ?').run(id);
    if (team) this.logAudit('TEAM_DELETED', `Removed participant "${team.name}"`);
    return this.getTeams();
  }

  regenerateTeamCode(teamId) {
    const existing = this.sqlite.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!existing) throw new Error('Group / School not found');
    const existingCodes = new Set(this.getTeams().map(x => String(x.code || '').toUpperCase()));
    const newCode = generateUniqueGroupCode(existingCodes);
    this.sqlite.prepare('UPDATE teams SET code = ? WHERE id = ?').run(newCode, teamId);
    this.logAudit('TEAM_CODE_GENERATED', `Generated new access code for "${existing.name}"`);
    return this.getTeam(teamId);
  }

  regenerateAllTeamCodes() {
    const teams = this.getTeams();
    const used = new Set();
    this.runInTransaction(() => {
      for (const team of teams) {
        const newCode = generateUniqueGroupCode(used);
        this.sqlite.prepare('UPDATE teams SET code = ? WHERE id = ?').run(newCode, team.id);
      }
    });
    this.logAudit('TEAM_CODES_BATCH_GENERATED', `Generated fresh access codes for all ${teams.length} groups`);
    return this.getTeams();
  }

  // Answers
  mapAnswerRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      session_id: row.session_id,
      question_id: row.question_id,
      team_id: row.team_id,
      answer_text: row.answer_text,
      is_locked: toBool(row.is_locked),
      is_evaluated: toBool(row.is_evaluated),
      is_correct: row.is_correct === null || row.is_correct === undefined ? null : toBool(row.is_correct),
      points_awarded: row.points_awarded,
      override_reason: row.override_reason,
      submitted_at: row.submitted_at,
      evaluated_at: row.evaluated_at
    };
  }

  getAnswers(questionId) {
    const rows = questionId
      ? this.sqlite.prepare('SELECT * FROM answers WHERE question_id = ?').all(questionId)
      : this.sqlite.prepare('SELECT * FROM answers').all();
    return rows.map(r => this.mapAnswerRow(r));
  }

  getTeamAnswer(questionId, teamId) {
    const row = this.sqlite.prepare('SELECT * FROM answers WHERE question_id = ? AND team_id = ?').get(questionId, teamId);
    return this.mapAnswerRow(row);
  }

  upsertAnswer(questionId, teamId, answerText) {
    const now = new Date().toISOString();
    const existing = this.sqlite.prepare('SELECT * FROM answers WHERE question_id = ? AND team_id = ?').get(questionId, teamId);

    if (existing) {
      if (toBool(existing.is_locked)) {
        throw new Error('Answer is locked and cannot be updated');
      }
      this.sqlite.prepare(`
        UPDATE answers SET answer_text = ?, submitted_at = ? WHERE id = ?
      `).run(answerText, now, existing.id);
      return this.getTeamAnswer(questionId, teamId);
    }

    const id = `ans-${questionId}-${teamId}`;
    this.sqlite.prepare(`
      INSERT INTO answers (
        id, session_id, question_id, team_id, answer_text,
        is_locked, is_evaluated, is_correct, points_awarded,
        override_reason, submitted_at, evaluated_at
      ) VALUES (?, 'active_session', ?, ?, ?, 0, 0, NULL, 0, NULL, ?, NULL)
    `).run(id, questionId, teamId, answerText, now);

    return this.getTeamAnswer(questionId, teamId);
  }

  getAcceptedAnswerSet(question) {
    const acceptedSet = new Set();
    if (!question) return acceptedSet;
    if (question.correct_answer) acceptedSet.add(normalizeAnswerString(question.correct_answer));
    if (question.accepted_answers) {
      question.accepted_answers.split(',').forEach(part => {
        const norm = normalizeAnswerString(part);
        if (norm) acceptedSet.add(norm);
      });
    }
    return acceptedSet;
  }

  lockAnswers(questionId) {
    const now = new Date().toISOString();
    const activeTeams = this.getTeams().filter(t => t.is_active);
    const question = this.getQuestion(questionId);
    const autoEval = this.getConfig().auto_evaluate_exact !== false;
    const acceptedSet = this.getAcceptedAnswerSet(question);

    this.runInTransaction(() => {
      for (const team of activeTeams) {
        const existing = this.sqlite.prepare('SELECT * FROM answers WHERE question_id = ? AND team_id = ?').get(questionId, team.id);
        if (!existing) {
          this.sqlite.prepare(`
            INSERT INTO answers (
              id, session_id, question_id, team_id, answer_text,
              is_locked, is_evaluated, is_correct, points_awarded,
              override_reason, submitted_at, evaluated_at
            ) VALUES (?, 'active_session', ?, ?, '', 1, ?, 0, 0, NULL, ?, ?)
          `).run(`ans-${questionId}-${team.id}`, questionId, team.id, autoEval ? 1 : 0, now, autoEval ? now : null);
        } else {
          if (autoEval && !toBool(existing.is_evaluated)) {
            const submittedNorm = normalizeAnswerString(existing.answer_text);
            const matched = submittedNorm !== '' && acceptedSet.has(submittedNorm);
            const pts = matched ? (question?.points || 1) : 0;
            this.sqlite.prepare(`
              UPDATE answers
              SET is_locked = 1, is_evaluated = 1, is_correct = ?, points_awarded = ?, evaluated_at = ?
              WHERE id = ?
            `).run(matched ? 1 : 0, pts, now, existing.id);
          } else {
            this.sqlite.prepare('UPDATE answers SET is_locked = 1 WHERE id = ?').run(existing.id);
          }
        }
      }
      if (autoEval && question) {
        this.sqlite.prepare('UPDATE questions SET is_revealed = 1 WHERE id = ?').run(questionId);
      }
    });

    if (autoEval && question) {
      this.logAudit('TIME_UP_AUTO_CHECK', `Time expired on Q${question.question_number} — answers locked & auto-checked`);
    }

    return this.getAnswers(questionId);
  }

  autoEvaluateQuestion(questionId) {
    const question = this.getQuestion(questionId);
    if (!question) throw new Error('Question not found');

    const now = new Date().toISOString();
    const activeTeams = this.getTeams().filter(t => t.is_active);
    const acceptedSet = this.getAcceptedAnswerSet(question);

    this.runInTransaction(() => {
      for (const team of activeTeams) {
        const existing = this.sqlite.prepare('SELECT * FROM answers WHERE question_id = ? AND team_id = ?').get(questionId, team.id);
        if (!existing) {
          this.sqlite.prepare(`
            INSERT INTO answers (
              id, session_id, question_id, team_id, answer_text,
              is_locked, is_evaluated, is_correct, points_awarded,
              override_reason, submitted_at, evaluated_at
            ) VALUES (?, 'active_session', ?, ?, '', 1, 1, 0, 0, NULL, ?, ?)
          `).run(`ans-${questionId}-${team.id}`, questionId, team.id, now, now);
        } else {
          const submittedNorm = normalizeAnswerString(existing.answer_text);
          const matched = submittedNorm !== '' && acceptedSet.has(submittedNorm);
          const pts = matched ? (question.points || 1) : 0;
          this.sqlite.prepare(`
            UPDATE answers
            SET is_locked = 1, is_evaluated = 1, is_correct = ?, points_awarded = ?, override_reason = NULL, evaluated_at = ?
            WHERE id = ?
          `).run(matched ? 1 : 0, pts, now, existing.id);
        }
      }
      this.sqlite.prepare('UPDATE questions SET is_revealed = 1 WHERE id = ?').run(questionId);
    });

    this.logAudit('AUTO_EVALUATE', `Auto-graded exact matches for Q${question.question_number}`);
    return this.getAnswers(questionId);
  }

  evaluateAnswer(answerId, isCorrect, pointsOverride = null, overrideReason = null) {
    const existing = this.sqlite.prepare('SELECT * FROM answers WHERE id = ?').get(answerId);
    if (!existing) throw new Error('Answer not found');

    const question = this.getQuestion(existing.question_id);
    const standardPoints = question ? Number(question.points) : 3;
    const now = new Date().toISOString();

    const hasOverride = pointsOverride !== null && pointsOverride !== undefined && pointsOverride !== '';
    const pts = hasOverride ? Number(pointsOverride) : (isCorrect ? standardPoints : 0);
    const reason = hasOverride ? (overrideReason || "Instructor's decision override") : (overrideReason || null);

    this.sqlite.prepare(`
      UPDATE answers
      SET is_evaluated = 1, is_correct = ?, points_awarded = ?, override_reason = ?, evaluated_at = ?
      WHERE id = ?
    `).run(isCorrect ? 1 : 0, pts, reason, now, answerId);

    const team = this.getTeam(existing.team_id);
    this.logAudit('JUDGE_EVALUATE', `Judged ${team?.name || existing.team_id} on Q${question?.question_number || '?'}: ${isCorrect ? '1' : '0'} (+${pts} pts)`);
    return this.mapAnswerRow(this.sqlite.prepare('SELECT * FROM answers WHERE id = ?').get(answerId));
  }

  judgeCellUpdate(questionId, teamId, status, pointsOverride = null) {
    const question = this.getQuestion(questionId);
    if (!question) throw new Error('Question not found');

    const team = this.getTeam(teamId);
    const now = new Date().toISOString();
    const existing = this.sqlite.prepare('SELECT * FROM answers WHERE question_id = ? AND team_id = ?').get(questionId, teamId);

    if (status === 'blank') {
      if (existing) {
        this.sqlite.prepare(`
          UPDATE answers
          SET is_evaluated = 0, is_correct = NULL, points_awarded = 0, override_reason = NULL, evaluated_at = NULL
          WHERE id = ?
        `).run(existing.id);
      }
      this.logAudit('JUDGE_MATRIX', `Cleared judge mark for ${team?.name || teamId} on Q${question.question_number}`);
      return this.getTeamAnswer(questionId, teamId);
    }

    const isCorrect = status === 'correct';
    const standardPoints = Number(question.points) || 3;
    const hasOverride = pointsOverride !== null && pointsOverride !== undefined && pointsOverride !== '';
    const pts = hasOverride ? Number(pointsOverride) : (isCorrect ? standardPoints : 0);

    if (!existing) {
      this.sqlite.prepare(`
        INSERT INTO answers (
          id, session_id, question_id, team_id, answer_text,
          is_locked, is_evaluated, is_correct, points_awarded,
          override_reason, submitted_at, evaluated_at
        ) VALUES (?, 'active_session', ?, ?, '', 1, 1, ?, ?, 'Instructor''s decision', ?, ?)
      `).run(`ans-${questionId}-${teamId}`, questionId, teamId, isCorrect ? 1 : 0, pts, now, now);
    } else {
      this.sqlite.prepare(`
        UPDATE answers
        SET is_locked = 1, is_evaluated = 1, is_correct = ?, points_awarded = ?, override_reason = 'Instructor''s decision', evaluated_at = ?
        WHERE id = ?
      `).run(isCorrect ? 1 : 0, pts, now, existing.id);
    }

    this.sqlite.prepare('UPDATE questions SET is_revealed = 1 WHERE id = ?').run(questionId);
    this.logAudit('JUDGE_MATRIX', `Judge set ${team?.name || teamId} on Q${question.question_number} → ${isCorrect ? '1' : '0'} (+${pts} pts)`);
    return this.getTeamAnswer(questionId, teamId);
  }

  // Per-Round Score Matrix (No., School/University, Q1..Q10, Total)
  getRoundMatrix(categoryId) {
    const categories = this.getCategories();
    const category = categories.find(c => c.id === categoryId) || categories[0];
    if (!category) return null;

    const roundQuestions = this.getQuestionsByCategory(category.id);
    const slotCount = Math.max(Number(category.question_count) || 10, roundQuestions.length);

    const columns = [];
    for (let i = 1; i <= slotCount; i++) {
      const q = roundQuestions.find(item => Number(item.question_number) === i) || roundQuestions[i - 1] || null;
      const alreadyMapped = q && columns.some(col => col.question?.id === q.id);
      const mappedQ = alreadyMapped ? null : q;
      columns.push({ number: i, label: `Q${i}`, question: mappedQ });
    }

    const activeTeams = this.getTeams().filter(t => t.is_active);
    const config = this.getConfig();
    const allAnswers = this.getAnswers();
    const allQuestions = this.getQuestions();
    const answerMap = new Map(allAnswers.map(a => [`${a.question_id}::${a.team_id}`, a]));

    // Compute previous rounds' cumulative points for each team (for rounds after Round 1)
    const prevCategoryIds = new Set(
      categories
        .filter(c => Number(c.display_order) < Number(category.display_order))
        .map(c => c.id)
    );
    const questionCatMap = new Map(allQuestions.map(q => [q.id, q.category_id]));
    const hasPreviousRounds = prevCategoryIds.size > 0;

    const rows = activeTeams.map((team, idx) => {
      let roundTotal = 0;
      let correctCount = 0;

      const previousPoints = hasPreviousRounds
        ? allAnswers
            .filter(a => a.team_id === team.id && a.is_evaluated && prevCategoryIds.has(questionCatMap.get(a.question_id)))
            .reduce((sum, a) => sum + (Number(a.points_awarded) || 0), 0)
        : 0;

      const cells = columns.map(col => {
        if (!col.question) {
          return { questionId: null, value: null, points: 0, isJudgeOverride: false };
        }
        const ans = answerMap.get(`${col.question.id}::${team.id}`);
        const hasEvaluated = Boolean(ans && ans.is_evaluated);
        const isRevealed = Boolean(col.question.is_revealed);

        if (!isRevealed && !hasEvaluated) {
          return { questionId: col.question.id, value: null, points: 0, isJudgeOverride: false };
        }

        if (ans && ans.is_evaluated) {
          const val = ans.is_correct ? 1 : 0;
          const pts = Number(ans.points_awarded) || 0;
          roundTotal += pts;
          if (ans.is_correct) correctCount += 1;
          return {
            questionId: col.question.id,
            answerId: ans.id,
            answerText: ans.answer_text || '',
            value: val,
            points: pts,
            isJudgeOverride: Boolean(ans.override_reason)
          };
        }

        return {
          questionId: col.question.id,
          answerId: ans?.id || null,
          answerText: ans?.answer_text || '',
          value: 0,
          points: 0,
          isJudgeOverride: false
        };
      });

      const cumulativeTotal = previousPoints + roundTotal;

      return {
        seat_number: team.seat_number || idx + 1,
        team_id: team.id,
        team_name: team.name,
        team_code: team.code,
        team_avatar: team.avatar,
        cells,
        correct_count: correctCount,
        previous_points: previousPoints,
        round_points: roundTotal,
        total_points: cumulativeTotal
      };
    });

    if (config.results_sort_by === 'score') {
      rows.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
        return a.seat_number - b.seat_number;
      });
    } else {
      rows.sort((a, b) => a.seat_number - b.seat_number);
    }

    const revealedCount = columns.filter(c => c.question && c.question.is_revealed).length;
    const isRoundComplete = roundQuestions.length > 0 && revealedCount >= roundQuestions.length;
    const showPreviousColumn = hasPreviousRounds && rows.some(r => r.previous_points > 0);

    return {
      category,
      columns: columns.map(c => ({
        number: c.number,
        label: c.label,
        questionId: c.question?.id || null,
        isRevealed: Boolean(c.question?.is_revealed),
        points: c.question?.points ?? category.default_points
      })),
      rows,
      showPreviousColumn,
      revealedCount,
      totalConfiguredQuestions: roundQuestions.length,
      isRoundComplete
    };
  }

  getLeaderboard() {
    const teams = this.getTeams().filter(t => t.is_active);
    const categories = this.getCategories();
    const allQuestions = this.getQuestions();
    const allAnswers = this.getAnswers();
    const questionCatMap = new Map(allQuestions.map(q => [q.id, q.category_id]));

    const teamStats = teams.map((team, idx) => {
      const teamAnswers = allAnswers.filter(a => a.team_id === team.id && a.is_evaluated);
      const totalPoints = teamAnswers.reduce((sum, a) => sum + (Number(a.points_awarded) || 0), 0);
      const correctCount = teamAnswers.filter(a => a.is_correct === true).length;
      const totalAnswered = allAnswers.filter(a => a.team_id === team.id && a.answer_text && a.answer_text.trim() !== '').length;

      const roundTotals = {};
      for (const cat of categories) {
        roundTotals[cat.id] = teamAnswers
          .filter(a => questionCatMap.get(a.question_id) === cat.id)
          .reduce((sum, a) => sum + (Number(a.points_awarded) || 0), 0);
      }

      return {
        seat_number: team.seat_number || idx + 1,
        team_id: team.id,
        team_name: team.name,
        team_code: team.code,
        team_avatar: team.avatar,
        team_color: team.color,
        round_totals: roundTotals,
        total_points: totalPoints,
        correct_count: correctCount,
        total_answered: totalAnswered
      };
    });

    teamStats.sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.correct_count !== a.correct_count) return b.correct_count - a.correct_count;
      return a.seat_number - b.seat_number;
    });

    let currentRank = 1;
    return teamStats.map((team, index) => {
      if (index > 0) {
        const prev = teamStats[index - 1];
        if (prev.total_points !== team.total_points || prev.correct_count !== team.correct_count) {
          currentRank = index + 1;
        }
      }
      return { ...team, rank: currentRank };
    });
  }
}

export const db = new Database();
