import { db } from './db.js';
import { supabaseSync } from './supabase-sync.js';

export class GameEngine {
  constructor(io) {
    this.io = io;
    this.timerTimeout = null;
    this.connectedTeams = new Map(); // teamId -> Set<socketId>
    this.socketToTeam = new Map(); // socketId -> teamId
  }

  getFullState() {
    const config = db.getConfig();
    const session = db.getSession();
    const categories = db.getCategories();
    const questions = db.getQuestions();
    const teams = db.getTeams();

    const currentQuestion = session.current_question_id
      ? db.getQuestion(session.current_question_id)
      : null;
    const currentCategory = currentQuestion
      ? categories.find(c => c.id === currentQuestion.category_id)
      : categories.find(c => c.id === session.active_category_id) || categories[0] || null;

    const answers = session.current_question_id
      ? db.getAnswers(session.current_question_id)
      : [];
    const leaderboard = db.getLeaderboard();

    const resultsCategoryId = session.results_category_id || currentCategory?.id || categories[0]?.id || null;
    const roundMatrix = resultsCategoryId ? db.getRoundMatrix(resultsCategoryId) : null;

    // Also include matrices by category id for Host Judge Grid convenience
    const roundMatrices = {};
    for (const cat of categories) {
      roundMatrices[cat.id] = db.getRoundMatrix(cat.id);
    }

    return {
      config,
      session,
      currentQuestion: currentQuestion ? {
        ...currentQuestion,
        category: currentCategory
      } : null,
      answers,
      leaderboard,
      roundMatrix,
      roundMatrices,
      teams,
      categories,
      questions,
      dbInfo: db.getDatabaseInfo(),
      supabaseStatus: supabaseSync.getStatus(),
      auditLogs: db.getAuditLogs(25),
      connectedTeamIds: Array.from(this.connectedTeams.keys()),
      serverTime: Date.now()
    };
  }

  broadcastFullState(options = { syncCloud: true }) {
    if (options?.syncCloud !== false) {
      supabaseSync.schedulePush(db);
    }
    if (!this.io) return;
    const state = this.getFullState();
    this.io.emit('game_state_update', state);
  }

  // 0. Return projector to Standby / Welcome screen
  setIdle() {
    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }
    db.updateSession({
      status: 'IDLE',
      timer_started_at: null,
      timer_ends_at: null,
      show_correct_answer: false
    });
    this.broadcastFullState();
    return this.getFullState();
  }

  // 1. Host clicks "Flash Question" (Reading Question · Waiting for Answer Now)
  displayQuestion(questionId) {
    const question = db.getQuestion(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }

    db.updateSession({
      status: 'QUESTION_DISPLAYED',
      active_category_id: question.category_id,
      results_category_id: question.category_id,
      current_question_id: question.id,
      timer_started_at: null,
      timer_ends_at: null,
      timer_duration: question.timer_seconds,
      show_correct_answer: false
    });

    console.log(`[GameEngine] Question displayed (Reading mode): Q${question.question_number} "${question.question_text}" (${question.timer_seconds}s)`);
    this.broadcastFullState();
    return this.getFullState();
  }

  // 2. Host clicks "Answer Now!" (Start Timer)
  startTimer() {
    const session = db.getSession();
    if (!session.current_question_id) {
      throw new Error('No question currently selected');
    }

    const question = db.getQuestion(session.current_question_id);
    if (!question) {
      throw new Error('Question data not found');
    }

    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
    }

    const durationSeconds = Number(question.timer_seconds) || Number(session.timer_duration) || 15;
    const now = Date.now();
    const endsAt = now + (durationSeconds * 1000);

    db.updateSession({
      status: 'TIMER_RUNNING',
      timer_started_at: new Date(now).toISOString(),
      timer_ends_at: new Date(endsAt).toISOString(),
      timer_duration: durationSeconds,
      show_correct_answer: false
    });

    console.log(`[GameEngine] Answer Now / Timer started: ${durationSeconds}s`);

    this.io.emit('timer_started', {
      startedAt: now,
      endsAt: endsAt,
      duration: durationSeconds,
      serverTime: now
    });
    this.broadcastFullState();

    this.timerTimeout = setTimeout(() => {
      this.expireTimer();
    }, durationSeconds * 1000);

    return this.getFullState();
  }

  // 3. Timer expires automatically or host stops it
  expireTimer() {
    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }

    const session = db.getSession();
    if (!session.current_question_id) return;

    console.log(`[GameEngine] Timer expired for question ${session.current_question_id}`);

    db.lockAnswers(session.current_question_id);

    db.updateSession({
      status: 'TIMER_EXPIRED'
    });

    this.io.emit('timer_expired', {
      questionId: session.current_question_id,
      timestamp: Date.now()
    });
    this.broadcastFullState();
  }

  // Team submits/drafts answer
  submitAnswer(teamId, questionId, answerText) {
    const session = db.getSession();

    if (session.current_question_id !== questionId) {
      throw new Error('Question is not the active question');
    }

    if (session.status !== 'TIMER_RUNNING') {
      throw new Error('Answering is not allowed outside the active timer window');
    }

    const now = Date.now();
    const endsAt = session.timer_ends_at ? new Date(session.timer_ends_at).getTime() : 0;
    if (endsAt > 0 && now > (endsAt + 1500)) {
      throw new Error('Server timer expired. Answer cannot be accepted.');
    }

    const answer = db.upsertAnswer(questionId, teamId, answerText);

    this.io.emit('answer_updated', {
      teamId,
      questionId,
      answerText,
      submittedAt: answer.submitted_at
    });

    // Also broadcast state so host sees live answers immediately
    this.broadcastFullState();
    return answer;
  }

  // 4. Host evaluates answer
  evaluateAnswer(answerId, isCorrect, pointsOverride = null, overrideReason = null) {
    const answer = db.evaluateAnswer(answerId, isCorrect, pointsOverride, overrideReason);
    db.markQuestionRevealed(answer.question_id, true);
    console.log(`[GameEngine] Evaluated answer ${answerId}: isCorrect=${isCorrect}, points=${answer.points_awarded}`);
    this.broadcastFullState();
    return answer;
  }

  // Auto-evaluate exact matches for current question
  autoEvaluateQuestion(questionId) {
    const session = db.getSession();
    const targetId = questionId || session.current_question_id;
    if (!targetId) throw new Error('No question selected to auto-evaluate');
    const answers = db.autoEvaluateQuestion(targetId);
    this.broadcastFullState();
    return answers;
  }

  // Judge matrix cell direct override
  judgeCellUpdate(questionId, teamId, status, pointsOverride = null) {
    const answer = db.judgeCellUpdate(questionId, teamId, status, pointsOverride);
    this.broadcastFullState();
    return answer;
  }

  // 5. Host clicks "Reveal Answer"
  showResults() {
    const session = db.getSession();
    if (session.current_question_id) {
      db.lockAnswers(session.current_question_id);
      db.markQuestionRevealed(session.current_question_id, true);
    }
    db.updateSession({
      status: 'SHOW_RESULTS',
      show_correct_answer: true
    });
    console.log('[GameEngine] Showing Question Answer Reveal screen');
    this.broadcastFullState();
    return this.getFullState();
  }

  // 6. Host clicks "Flash Round Results" (Easy Round results matrix Q1..Q10 + Total)
  showRoundResults(categoryId = null) {
    const session = db.getSession();
    const currentQ = session.current_question_id ? db.getQuestion(session.current_question_id) : null;
    const targetCatId = categoryId || currentQ?.category_id || session.active_category_id || db.getCategories()[0]?.id;

    db.updateSession({
      status: 'SHOW_ROUND_RESULTS',
      results_category_id: targetCatId,
      active_category_id: targetCatId
    });
    console.log(`[GameEngine] Showing Round Results Matrix for category ${targetCatId}`);
    this.broadcastFullState();
    return this.getFullState();
  }

  // 7. Host clicks "Overall Standings"
  showLeaderboard() {
    db.updateSession({
      status: 'SHOW_LEADERBOARD'
    });
    console.log('[GameEngine] Showing Overall Standings screen');
    this.broadcastFullState();
    return this.getFullState();
  }

  // 8. Host clicks "Next Question"
  nextQuestion(categoryId = null) {
    const session = db.getSession();
    const questions = categoryId
      ? db.getQuestionsByCategory(categoryId)
      : db.getQuestions().filter(q => q.is_active !== false);

    let nextQ = null;
    if (session.current_question_id) {
      const currIdx = questions.findIndex(q => q.id === session.current_question_id);
      if (currIdx >= 0 && currIdx < questions.length - 1) {
        nextQ = questions[currIdx + 1];
      }
    }

    if (!nextQ && questions.length > 0) {
      nextQ = questions[0];
    }

    if (nextQ) {
      return this.displayQuestion(nextQ.id);
    } else {
      return this.setIdle();
    }
  }

  registerTeamConnection(teamId, socketId) {
    // If this socket previously identified as another team, detach it first
    const prevTeamId = this.socketToTeam.get(socketId);
    if (prevTeamId && prevTeamId !== teamId) {
      const prevSet = this.connectedTeams.get(prevTeamId);
      if (prevSet) {
        prevSet.delete(socketId);
        if (prevSet.size === 0) this.connectedTeams.delete(prevTeamId);
      }
    }

    if (!this.connectedTeams.has(teamId)) {
      this.connectedTeams.set(teamId, new Set());
    }
    this.connectedTeams.get(teamId).add(socketId);
    this.socketToTeam.set(socketId, teamId);

    this.io.emit('team_presence_changed', {
      teamId,
      connected: true,
      connectedTeamIds: Array.from(this.connectedTeams.keys())
    });
    this.broadcastFullState({ syncCloud: false });
  }

  unregisterSocket(socketId) {
    const teamId = this.socketToTeam.get(socketId);
    if (!teamId) return;
    this.socketToTeam.delete(socketId);

    const sockets = this.connectedTeams.get(teamId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.connectedTeams.delete(teamId);
        this.io.emit('team_presence_changed', {
          teamId,
          connected: false,
          connectedTeamIds: Array.from(this.connectedTeams.keys())
        });
        this.broadcastFullState({ syncCloud: false });
      }
    }
  }

  // Reset only scores & answers (keeps configured questions, rounds, schools, event settings)
  resetScoresOnly() {
    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }
    db.resetScoresOnly();
    this.broadcastFullState();
    return this.getFullState();
  }

  // Clear sample questions, schools, and answers for a blank competition
  clearToBlank() {
    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }
    db.clearToBlankCompetition();
    this.broadcastFullState();
    return this.getFullState();
  }

  // Reset entire competition to factory demo defaults
  resetCompetition() {
    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }
    db.resetCompetition();
    this.broadcastFullState();
    return this.getFullState();
  }
}
