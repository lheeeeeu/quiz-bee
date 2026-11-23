import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

class SupabaseSyncService {
  constructor() {
    this.url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    this.key =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      '';

    this.client = this.url && this.key
      ? createClient(this.url, this.key, {
          auth: { persistSession: false, autoRefreshToken: false }
        })
      : null;

    this.status = {
      configured: Boolean(this.client),
      url: this.url || null,
      connected: false,
      tablesReady: false,
      syncing: false,
      lastSyncedAt: null,
      lastError: this.client ? null : 'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in .env'
    };

    this.pushTimer = null;
    this.dbRef = null;
  }

  getStatus() {
    return { ...this.status };
  }

  async checkConnection() {
    if (!this.client) {
      this.status.connected = false;
      this.status.tablesReady = false;
      this.status.lastError = 'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in .env';
      return this.getStatus();
    }

    try {
      const { error } = await this.client.from('event_config').select('id').limit(1);
      if (error) {
        const msg = error.message || '';
        const code = error.code || '';
        const isMissingTable =
          code === '42P01' ||
          code === 'PGRST205' ||
          msg.toLowerCase().includes('could not find the table') ||
          msg.toLowerCase().includes('does not exist');

        this.status.connected = isMissingTable;
        this.status.tablesReady = false;
        this.status.lastError = isMissingTable
          ? 'Supabase connected, but tables are not created yet. Run supabase/schema.sql in your Supabase SQL Editor.'
          : msg;
        return this.getStatus();
      }

      this.status.connected = true;
      this.status.tablesReady = true;
      this.status.lastError = null;
      return this.getStatus();
    } catch (err) {
      this.status.connected = false;
      this.status.tablesReady = false;
      this.status.lastError = err.message || 'Failed to reach Supabase';
      return this.getStatus();
    }
  }

  // Called once at server startup: checks tables; pulls cloud state if populated, else pushes initial state
  async initSync(db) {
    this.dbRef = db;
    const status = await this.checkConnection();
    if (!status.tablesReady) {
      console.warn(`[Supabase] ${status.lastError}`);
      return status;
    }

    try {
      const [cfgRes, catRes, teamRes] = await Promise.all([
        this.client.from('event_config').select('id').limit(1),
        this.client.from('categories').select('id').limit(1),
        this.client.from('teams').select('id').limit(1)
      ]);
      if (cfgRes.error) throw cfgRes.error;
      if (catRes.error) throw catRes.error;
      if (teamRes.error) throw teamRes.error;

      const hasCloudData =
        (cfgRes.data && cfgRes.data.length > 0) ||
        (catRes.data && catRes.data.length > 0) ||
        (teamRes.data && teamRes.data.length > 0);

      if (hasCloudData) {
        console.log('[Supabase] Found existing data in Supabase Cloud — pulling into local runtime cache...');
        await this.pullFromSupabase(db);
      } else {
        console.log('[Supabase] Cloud tables are empty — pushing initial local database to Supabase...');
        await this.pushToSupabase(db);
      }
    } catch (err) {
      this.status.lastError = err.message;
      console.error('[Supabase] Initial sync warning:', err.message);
    }

    return this.getStatus();
  }

  // Flush any pending debounced write immediately (used on Cloud Run SIGTERM shutdown)
  async flushPendingPush() {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
      if (this.dbRef && this.status.tablesReady) {
        await this.pushToSupabase(this.dbRef);
      }
    }
  }

  // Schedule debounced background sync to Supabase after local SQLite mutations (zero lag on live timer!)
  schedulePush(db, delayMs = 350) {
    this.dbRef = db;
    if (!this.client || !this.status.tablesReady) return;

    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushToSupabase(db).catch(err => {
        console.warn('[Supabase] Background sync warning:', err.message);
      });
    }, delayMs);
  }

  async pushToSupabase(db) {
    if (!this.client) throw new Error('Supabase client not configured');
    const check = this.status.tablesReady ? this.status : await this.checkConnection();
    if (!check.tablesReady) {
      throw new Error(check.lastError || 'Supabase tables are not ready');
    }

    this.status.syncing = true;
    try {
      const now = new Date().toISOString();
      const config = db.getConfig();
      const categories = db.getCategories();
      const questions = db.getQuestions();
      const teams = db.getTeams();
      const session = db.getSession();
      const answers = db.getAnswers();

      // 1. Upsert event_config
      const { error: cfgErr } = await this.client.from('event_config').upsert({
        id: 'default',
        ...config,
        updated_at: now
      }, { onConflict: 'id' });
      if (cfgErr) throw cfgErr;

      // 2. Sync categories (upsert current, remove deleted)
      if (categories.length > 0) {
        const { error: catErr } = await this.client.from('categories').upsert(
          categories.map(c => ({
            id: c.id,
            name: c.name,
            badge_color: c.badge_color || '#3e1b20',
            default_points: Number(c.default_points) || 3,
            default_timer_seconds: Number(c.default_timer_seconds) || 15,
            question_count: Number(c.question_count) || 10,
            display_order: Number(c.display_order) || 1
          })),
          { onConflict: 'id' }
        );
        if (catErr) throw catErr;
      }
      await this.pruneMissingIds('categories', categories.map(c => c.id));

      // 3. Sync questions
      if (questions.length > 0) {
        const { error: qErr } = await this.client.from('questions').upsert(
          questions.map(q => ({
            id: q.id,
            category_id: q.category_id,
            question_number: Number(q.question_number) || 1,
            question_type: q.question_type || 'identification',
            choices: Array.isArray(q.choices) ? q.choices : [],
            question_text: q.question_text,
            image_url: q.image_url || '',
            correct_answer: q.correct_answer,
            accepted_answers: q.accepted_answers || '',
            explanation: q.explanation || '',
            points: Number(q.points) || 3,
            timer_seconds: Number(q.timer_seconds) || 15,
            order_index: Number(q.order_index) || 1,
            is_active: q.is_active !== false,
            is_revealed: Boolean(q.is_revealed)
          })),
          { onConflict: 'id' }
        );
        if (qErr) throw qErr;
      }
      await this.pruneMissingIds('questions', questions.map(q => q.id));

      // 4. Sync teams / groups
      if (teams.length > 0) {
        const { error: tErr } = await this.client.from('teams').upsert(
          teams.map(t => ({
            id: t.id,
            seat_number: Number(t.seat_number) || 1,
            name: t.name,
            code: t.code,
            avatar: t.avatar || '🏛️',
            color: t.color || '#3e1b20',
            is_active: t.is_active !== false
          })),
          { onConflict: 'id' }
        );
        if (tErr) throw tErr;
      }
      await this.pruneMissingIds('teams', teams.map(t => t.id));

      // 5. Sync answers
      if (answers.length > 0) {
        const { error: aErr } = await this.client.from('answers').upsert(
          answers.map(a => ({
            id: a.id,
            session_id: a.session_id || 'active_session',
            question_id: a.question_id,
            team_id: a.team_id,
            answer_text: a.answer_text || '',
            is_locked: Boolean(a.is_locked),
            is_evaluated: Boolean(a.is_evaluated),
            is_correct: a.is_correct === undefined ? null : a.is_correct,
            points_awarded: Number(a.points_awarded) || 0,
            override_reason: a.override_reason || null,
            submitted_at: a.submitted_at || now,
            evaluated_at: a.evaluated_at || null
          })),
          { onConflict: 'id' }
        );
        if (aErr) throw aErr;
      }
      await this.pruneMissingIds('answers', answers.map(a => a.id));

      // 6. Sync session state
      const { error: sErr } = await this.client.from('competition_sessions').upsert({
        id: 'active_session',
        title: session.title,
        status: session.status,
        active_category_id: session.active_category_id || null,
        results_category_id: session.results_category_id || null,
        current_question_id: session.current_question_id || null,
        timer_started_at: session.timer_started_at || null,
        timer_ends_at: session.timer_ends_at || null,
        timer_duration: Number(session.timer_duration) || 15,
        show_correct_answer: Boolean(session.show_correct_answer),
        updated_at: now
      }, { onConflict: 'id' });
      if (sErr) throw sErr;

      this.status.connected = true;
      this.status.tablesReady = true;
      this.status.lastSyncedAt = now;
      this.status.lastError = null;
      return this.getStatus();
    } catch (err) {
      this.status.lastError = err.message || 'Supabase push failed';
      throw err;
    } finally {
      this.status.syncing = false;
    }
  }

  async pruneMissingIds(table, keepIds) {
    const { data, error } = await this.client.from(table).select('id');
    if (error || !data) return;
    const keepSet = new Set(keepIds);
    const toDelete = data.map(r => r.id).filter(id => !keepSet.has(id));
    if (toDelete.length > 0) {
      await this.client.from(table).delete().in('id', toDelete);
    }
  }

  async pullFromSupabase(db) {
    if (!this.client) throw new Error('Supabase client not configured');
    const check = await this.checkConnection();
    if (!check.tablesReady) {
      throw new Error(check.lastError || 'Supabase tables are not ready');
    }

    this.status.syncing = true;
    try {
      const [cfgRes, catRes, qRes, teamRes, ansRes] = await Promise.all([
        this.client.from('event_config').select('*').eq('id', 'default').maybeSingle(),
        this.client.from('categories').select('*').order('display_order', { ascending: true }),
        this.client.from('questions').select('*').order('question_number', { ascending: true }),
        this.client.from('teams').select('*').order('seat_number', { ascending: true }),
        this.client.from('answers').select('*')
      ]);

      if (catRes.error) throw catRes.error;
      if (qRes.error) throw qRes.error;
      if (teamRes.error) throw teamRes.error;
      if (ansRes.error) throw ansRes.error;

      const snapshot = {
        config: cfgRes.data || db.getConfig(),
        categories: catRes.data || [],
        questions: (qRes.data || []).map(q => ({
          ...q,
          choices: Array.isArray(q.choices) ? q.choices : []
        })),
        teams: teamRes.data || [],
        answers: ansRes.data || []
      };

      db.importSnapshot(snapshot);
      this.status.connected = true;
      this.status.tablesReady = true;
      this.status.lastSyncedAt = new Date().toISOString();
      this.status.lastError = null;
      return this.getStatus();
    } catch (err) {
      this.status.lastError = err.message || 'Supabase pull failed';
      throw err;
    } finally {
      this.status.syncing = false;
    }
  }
}

export const supabaseSync = new SupabaseSyncService();
