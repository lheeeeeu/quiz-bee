import React, { useState, useEffect } from 'react';
import {
  Play, StopCircle, Eye, Award, ArrowRight, RotateCcw,
  CheckCircle2, XCircle, Plus, Edit2, Trash2, Users, HelpCircle,
  Settings, Check, Table2, ExternalLink, Sparkles, Monitor,
  Sliders, Upload, Download, Database, Layers, ShieldCheck, FileX2, History, Cloud, RefreshCw, KeyRound, Copy
} from 'lucide-react';
import { socketService } from '../../services/socket';
import { apiUrl, IS_API_CONFIGURED } from '../../services/api';
import { sound } from '../../services/sound';
import { TimerDisplay } from '../common/TimerDisplay';

export function HostDashboard({ state }) {
  const [activeTab, setActiveTab] = useState('controller'); // 'controller', 'questions', 'categories', 'teams', 'config'
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [manualPoints, setManualPoints] = useState({});
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const config = state?.config || {};
  const session = state?.session;
  const currentQuestion = state?.currentQuestion;
  const questions = state?.questions || [];
  const categories = state?.categories || [];
  const teams = state?.teams || [];
  const answers = state?.answers || [];
  const leaderboard = state?.leaderboard || [];
  const roundMatrices = state?.roundMatrices || {};
  const connectedTeamIds = state?.connectedTeamIds || [];

  const primaryColor = config.primary_color || '#3e1b20';
  const accentColor = config.accent_color || '#b89b4a';
  const participantLabel = config.participant_label || 'School / University';
  const status = session?.status || 'IDLE';

  // Sync default selected category
  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(session?.active_category_id || categories[0].id);
    }
  }, [categories, selectedCategoryId, session?.active_category_id]);

  // Keep selected question synced if active question changes
  const roundQuestions = questions.filter(q => q.category_id === selectedCategoryId);
  const effectiveSelectedQuestionId = selectedQuestionId
    && roundQuestions.some(q => q.id === selectedQuestionId)
    ? selectedQuestionId
    : (currentQuestion && currentQuestion.category_id === selectedCategoryId
        ? currentQuestion.id
        : roundQuestions[0]?.id || '');

  const previewQuestion = questions.find(q => q.id === effectiveSelectedQuestionId) || currentQuestion || null;
  const activeRoundMatrix = roundMatrices[selectedCategoryId] || state?.roundMatrix || null;

  const showNotification = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3200);
  };

  // Host live actions
  const handleSetIdle = () => {
    socketService.hostAction('SET_IDLE');
    showNotification('Projector returned to Standby / Welcome screen.');
  };

  const handleDisplayQuestion = (qId) => {
    const targetId = qId || effectiveSelectedQuestionId;
    if (!targetId) return;
    setSelectedQuestionId(targetId);
    socketService.hostAction('DISPLAY_QUESTION', { questionId: targetId });
    showNotification('Question flashed in Reading Mode (Waiting for Answer Now).');
  };

  const handleStartTimer = () => {
    socketService.hostAction('START_TIMER');
    showNotification('Answer Now! Countdown started & contestant portals unlocked.');
  };

  const handleExpireTimer = () => {
    socketService.hostAction('EXPIRE_TIMER');
    showNotification('Timer stopped. All contestant answers locked.');
  };

  const handleAutoEvaluate = () => {
    if (!currentQuestion) return;
    socketService.hostAction('AUTO_EVALUATE', { questionId: currentQuestion.id });
    showNotification('Auto-graded exact matches against Official Key & alternates.');
  };

  const handleEvaluate = (answerId, isCorrect, customPts = null, overrideReason = null) => {
    if (!answerId) return;
    socketService.hostAction('EVALUATE_ANSWER', {
      answerId,
      isCorrect,
      pointsOverride: customPts !== null && customPts !== '' ? Number(customPts) : null,
      overrideReason
    });
    if (isCorrect) sound.playCorrect();
  };

  const handleDirectJudgeCurrent = (teamId, isCorrect, customPts = null, overrideReason = null) => {
    if (!currentQuestion) return;
    const existing = answers.find(a => a.team_id === teamId);
    if (existing) {
      handleEvaluate(existing.id, isCorrect, customPts, overrideReason);
    } else {
      socketService.hostAction('JUDGE_CELL_UPDATE', {
        questionId: currentQuestion.id,
        teamId,
        status: isCorrect ? 'correct' : 'wrong',
        pointsOverride: customPts !== null && customPts !== '' ? Number(customPts) : null
      });
      if (isCorrect) sound.playCorrect();
    }
  };

  const handleMarkAll = (isCorrect) => {
    if (!currentQuestion) return;
    teams.filter(t => t.is_active).forEach(team => {
      handleDirectJudgeCurrent(team.id, isCorrect);
    });
    showNotification(`All teams marked as ${isCorrect ? '1 (Correct)' : '0 (Wrong)'}.`);
  };

  const handleShowResults = () => {
    socketService.hostAction('SHOW_RESULTS');
    showNotification('Official answer & question results flashed on Projector.');
  };

  const handleShowRoundResults = (catId = null) => {
    const targetCat = catId || selectedCategoryId || currentQuestion?.category_id;
    socketService.hostAction('SHOW_ROUND_RESULTS', { categoryId: targetCat });
    showNotification('Round Results Matrix flashed on Projector!');
  };

  const handleShowLeaderboard = () => {
    socketService.hostAction('SHOW_LEADERBOARD');
    sound.playFanfare();
    showNotification('Overall Standings flashed on Projector!');
  };

  const handleNextQuestion = () => {
    socketService.hostAction('NEXT_QUESTION', { categoryId: selectedCategoryId });
    showNotification('Flashed next question in Reading Mode.');
  };

  const handleJudgeMatrixCycle = (questionId, teamId, currentVal) => {
    if (!questionId) return;
    // Cycle: blank (null) -> 1 (correct) -> 0 (wrong) -> blank
    const nextStatus = currentVal === null ? 'correct' : currentVal === 1 ? 'wrong' : 'blank';
    socketService.hostAction('JUDGE_CELL_UPDATE', {
      questionId,
      teamId,
      status: nextStatus
    });
  };

  const handleResetScoresOnly = () => {
    if (window.confirm('Clear all submitted answers and reset scores to 0? Your configured questions, rounds, schools, and event settings will be KEPT.')) {
      socketService.hostAction('RESET_SCORES');
      showNotification('Scores & answers cleared. All configurations preserved.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-700" />
            <span className="font-semibold text-sm">{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg('')} className="text-emerald-700 hover:text-emerald-950 font-bold text-xs">✕</button>
        </div>
      )}

      {/* Navigation Tabs + Quick Projector Launch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd6cd] pb-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-[#ddd6cd] shadow-sm">
          {[
            { id: 'controller', label: 'Live Controller', icon: Play },
            { id: 'questions', label: `Question Bank (${questions.length})`, icon: HelpCircle },
            { id: 'categories', label: `Rounds (${categories.length})`, icon: Layers },
            { id: 'teams', label: `${participantLabel}s (${teams.length})`, icon: Users },
            { id: 'config', label: 'Event & Display Config', icon: Sliders }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={active ? { backgroundColor: primaryColor } : undefined}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                  active
                    ? 'text-white shadow-sm'
                    : 'text-[#5c4f51] hover:text-[#2b1b1d] hover:bg-[#f4f1ec]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.open('/display', '_blank')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#faf8f5] text-[#2b1b1d] border border-[#d6cfc7] text-xs font-bold shadow-sm transition-all"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Open Projector Window</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </button>

          <button
            onClick={handleResetScoresOnly}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-bold transition-all"
            title="Clears scores & answers only; keeps your questions and schools"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Scores</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          TAB 1: LIVE COMPETITION CONTROLLER
         ============================================================ */}
      {activeTab === 'controller' && (
        <div className="space-y-6">
          {/* Round Selector & Question Matrix Strip */}
          <div className="bg-white rounded-2xl p-5 lg:p-6 border border-[#ddd6cd] shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accentColor }}>
                  Stage Projector & Live Execution
                </div>
                <h2 className="text-xl lg:text-2xl font-extrabold text-[#2b1b1d]">
                  Live Competition Controller
                </h2>
              </div>

              {/* Current Stage Pipeline Indicator */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                {[
                  { key: 'QUESTION_DISPLAYED', label: '1. Reading' },
                  { key: 'TIMER_RUNNING', label: '2. Answer Now' },
                  { key: 'TIMER_EXPIRED', label: '3. Locked' },
                  { key: 'SHOW_RESULTS', label: '4. Reveal Key' },
                  { key: 'SHOW_ROUND_RESULTS', label: '5. Round Matrix' },
                  { key: 'SHOW_LEADERBOARD', label: '6. Overall' }
                ].map((step) => {
                  const isCurrent = status === step.key;
                  return (
                    <span
                      key={step.key}
                      style={isCurrent ? { backgroundColor: primaryColor } : undefined}
                      className={`px-2.5 py-1 rounded-md border ${
                        isCurrent
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-[#f6f4ef] text-[#756769] border-[#e2dcd4]'
                      }`}
                    >
                      {step.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Round Selector Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#756769] mr-1">Round:</span>
              {categories.map(cat => {
                const selected = cat.id === selectedCategoryId;
                const catQCount = questions.filter(q => q.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      const firstQ = questions.find(q => q.category_id === cat.id);
                      if (firstQ) setSelectedQuestionId(firstQ.id);
                    }}
                    style={selected ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      selected
                        ? 'text-white shadow-sm'
                        : 'bg-[#f8f6f2] text-[#4c3e40] border-[#dcd5cc] hover:border-[#b89b4a]'
                    }`}
                  >
                    {cat.name} <span className="opacity-75 font-normal">({catQCount}Q · {cat.default_points}pts)</span>
                  </button>
                );
              })}
            </div>

            {/* Question Slots Q1..Q10 for Selected Round */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-[#756769]">
                  Select Question in {categories.find(c => c.id === selectedCategoryId)?.name || 'Round'}:
                </span>
                <span className="text-[#756769]">Click a number to select, then click <strong>Flash Question</strong> (or double-click to flash immediately)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {roundQuestions.length > 0 ? roundQuestions.map((q) => {
                  const isSelected = q.id === effectiveSelectedQuestionId;
                  const isLive = currentQuestion?.id === q.id && ['QUESTION_DISPLAYED', 'TIMER_RUNNING', 'TIMER_EXPIRED', 'SHOW_RESULTS'].includes(status);
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuestionId(q.id)}
                      onDoubleClick={() => handleDisplayQuestion(q.id)}
                      style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}12` } : undefined}
                      className={`relative px-3.5 py-2 rounded-xl border-2 text-xs font-extrabold transition-all min-w-[60px] ${
                        isSelected
                          ? 'text-[#2b1b1d] shadow-sm'
                          : q.is_revealed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:border-emerald-400'
                          : 'bg-[#faf8f5] border-[#e2dcd4] text-[#4c3e40] hover:border-[#b89b4a]'
                      }`}
                    >
                      <span>Q{q.question_number}</span>
                      {isLive && (
                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-black tracking-wider">
                          LIVE
                        </span>
                      )}
                      {!isLive && q.is_revealed && (
                        <span className="ml-1 text-emerald-700">✓</span>
                      )}
                    </button>
                  );
                }) : (
                  <div className="text-xs text-[#756769] italic py-2">
                    No questions configured for this round yet. Go to the Question Bank tab to add questions.
                  </div>
                )}
              </div>
            </div>

            {/* Primary Stage Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2 border-t border-[#ece6de]">
              <button
                onClick={() => handleDisplayQuestion(effectiveSelectedQuestionId)}
                disabled={!effectiveSelectedQuestionId}
                style={{ backgroundColor: primaryColor }}
                className="col-span-2 sm:col-span-2 lg:col-span-2 hover:opacity-95 disabled:opacity-40 text-white px-4 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Flash Question (Reading)</span>
              </button>

              <button
                onClick={handleStartTimer}
                disabled={!currentQuestion || status === 'TIMER_RUNNING'}
                className={`col-span-2 sm:col-span-2 lg:col-span-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm transition-all ${
                  status === 'TIMER_RUNNING' || !currentQuestion
                    ? 'bg-amber-100 text-amber-800/60 cursor-not-allowed border border-amber-200'
                    : 'bg-[#b89b4a] hover:bg-[#a68a3e] text-white shadow-sm'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Answer Now! (Start Timer)</span>
              </button>

              <button
                onClick={handleExpireTimer}
                disabled={status !== 'TIMER_RUNNING'}
                className={`flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl font-bold text-xs transition-all ${
                  status !== 'TIMER_RUNNING'
                    ? 'bg-[#f4f1ec] text-[#a09496] cursor-not-allowed border border-[#e5dfd6]'
                    : 'bg-red-700 hover:bg-red-800 text-white shadow-sm'
                }`}
              >
                <StopCircle className="w-4 h-4" />
                <span>Lock Now</span>
              </button>

              <button
                onClick={handleShowResults}
                disabled={!currentQuestion}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Reveal Key</span>
              </button>

              <button
                onClick={() => handleShowRoundResults(selectedCategoryId)}
                className="bg-[#2b1b1d] hover:bg-[#3f282b] text-white flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                <Table2 className="w-4 h-4 text-[#d8bc6d]" />
                <span>Round Results</span>
              </button>

              <button
                onClick={handleShowLeaderboard}
                className="bg-white hover:bg-[#faf8f5] text-[#2b1b1d] border border-[#cfc6bc] flex items-center justify-center space-x-1.5 py-3 px-3 rounded-xl font-bold text-xs transition-all"
              >
                <Award className="w-4 h-4 text-[#b89b4a]" />
                <span>Overall</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleNextQuestion}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#f6f4ef] hover:bg-[#ece7df] text-[#2b1b1d] border border-[#d8d2ca] font-bold transition-all"
                >
                  <span>Next Question in Round</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleSetIdle}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#f6f4ef] text-[#6e6062] border border-[#e2dcd4] font-semibold transition-all"
                >
                  Standby Screen
                </button>
              </div>
              <div className="text-[#6e6062]">
                Connected Portals: <strong className="text-emerald-700 font-mono">{connectedTeamIds.length} / {teams.filter(t => t.is_active).length}</strong>
              </div>
            </div>
          </div>

          {/* Selected / Live Question Preview + Timer */}
          {previewQuestion ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {categories.find(c => c.id === previewQuestion.category_id)?.name || 'Round'} · Question {previewQuestion.question_number}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900">
                      {previewQuestion.points} pts · {previewQuestion.timer_seconds}s
                    </span>
                    {currentQuestion?.id === previewQuestion.id ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">ON STAGE</span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#f3efe9] text-[#6e6062]">PREVIEW ONLY</span>
                    )}
                  </div>
                </div>

                <h3 className="text-xl lg:text-2xl font-bold text-[#2b1b1d] leading-snug">
                  {previewQuestion.question_text}
                </h3>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Official Correct Answer</span>
                  </div>
                  <p className="text-lg font-extrabold text-emerald-950">
                    {previewQuestion.correct_answer}
                  </p>
                  {previewQuestion.accepted_answers && (
                    <p className="text-xs text-emerald-800">
                      Accepted alternates: <span className="font-mono font-semibold">{previewQuestion.accepted_answers}</span>
                    </p>
                  )}
                  {previewQuestion.explanation && (
                    <p className="text-xs text-emerald-900/75 italic pt-1">
                      Note: {previewQuestion.explanation}
                    </p>
                  )}
                </div>
              </div>

              {/* Live Timer & Submission Counter */}
              <div className="bg-white border border-[#ddd6cd] rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 text-center shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#756769]">
                  Synchronized Stage Timer
                </span>
                <TimerDisplay session={session} size="large" />

                <div className="w-full bg-[#f8f6f2] rounded-xl p-3.5 border border-[#e5dfd6] text-xs space-y-2">
                  <div className="flex justify-between items-center text-[#5e5153]">
                    <span>Portals Online:</span>
                    <span className="font-bold text-emerald-700 font-mono">{connectedTeamIds.length} / {teams.filter(t => t.is_active).length}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#5e5153]">
                    <span>Submitted Answers:</span>
                    <span className="font-bold text-[#3e1b20] font-mono">
                      {answers.filter(a => a.answer_text && a.answer_text.trim() !== '').length} / {teams.filter(t => t.is_active).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#5e5153]">
                    <span>Contestant Inputs:</span>
                    <span className={`font-bold ${status === 'TIMER_RUNNING' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {status === 'TIMER_RUNNING' ? 'UNLOCKED (Live)' : 'LOCKED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* LIVE ANSWER EVALUATION PANEL (CURRENT QUESTION) */}
          <div className="bg-white rounded-2xl p-5 lg:p-6 border border-[#ddd6cd] shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accentColor }}>
                  Auto-Check & Judge Consideration · Current Question
                </span>
                <h3 className="text-lg lg:text-xl font-extrabold text-[#2b1b1d]">
                  {currentQuestion
                    ? `${currentQuestion.category?.name || 'Round'} — Question ${currentQuestion.question_number} Submissions`
                    : 'Contestant Submissions'}
                </h3>
                <p className="text-xs text-[#6e6062]">
                  Answers are automatically checked when time expires. Click <strong>Consider (1)</strong> or <strong>0</strong> anytime to override with instructor's decision.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAutoEvaluate}
                  disabled={!currentQuestion}
                  style={{ backgroundColor: primaryColor }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-95 disabled:opacity-40 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#e6cb7a]" />
                  <span>Re-Run Auto-Check</span>
                </button>
                <button
                  onClick={() => handleMarkAll(true)}
                  disabled={!currentQuestion}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold disabled:opacity-40"
                >
                  Mark All 1
                </button>
                <button
                  onClick={() => handleMarkAll(false)}
                  disabled={!currentQuestion}
                  className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-900 text-xs font-bold disabled:opacity-40"
                >
                  Mark All 0
                </button>
              </div>
            </div>

            {/* Post-Timer Next Step Quick Action Banner */}
            {(status === 'TIMER_EXPIRED' || status === 'SHOW_RESULTS') && currentQuestion && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f6f1e4] border border-[#d8c79a] rounded-xl px-4 py-3">
                <div className="text-xs sm:text-sm font-bold text-[#3e1b20]">
                  {status === 'TIMER_EXPIRED'
                    ? '✓ Time is up — answers locked & auto-checked! Review/consider below, then flash the next screen:'
                    : '✓ Answer revealed! Ready to flash the Leaderboard, Round Results Matrix, or Next Question:'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleShowResults}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold"
                  >
                    Reveal Answer Key
                  </button>
                  <button
                    onClick={() => handleShowRoundResults(selectedCategoryId)}
                    style={{ backgroundColor: primaryColor }}
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-95"
                  >
                    Flash Round Results
                  </button>
                  <button
                    onClick={handleShowLeaderboard}
                    className="px-3 py-1.5 rounded-lg bg-[#b89b4a] hover:bg-[#a68a3e] text-white text-xs font-bold"
                  >
                    Flash Overall Leaderboard
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#faf8f5] text-[#2b1b1d] border border-[#cfc6bc] text-xs font-bold"
                  >
                    Next Question →
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-[#e2dcd4] rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="text-white text-xs uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>
                    <th className="py-2.5 px-3 text-center w-12">No.</th>
                    <th className="py-2.5 px-4">{participantLabel}</th>
                    <th className="py-2.5 px-4">Submitted Answer</th>
                    <th className="py-2.5 px-4 text-center">Decision (Auto / Consider)</th>
                    <th className="py-2.5 px-4 text-center">Judge Override Pts</th>
                    <th className="py-2.5 px-4 text-center">Running Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece6de]">
                  {teams.filter(t => t.is_active).map((team, idx) => {
                    const ans = answers.find(a => a.team_id === team.id);
                    const runningTotal = leaderboard.find(l => l.team_id === team.id)?.total_points ?? 0;
                    const isOnline = connectedTeamIds.includes(team.id);
                    const isEvaluated = Boolean(ans?.is_evaluated);
                    const isCorrect = ans?.is_correct;
                    const pts = ans?.points_awarded || 0;

                    return (
                      <tr
                        key={team.id}
                        className={
                          isEvaluated && isCorrect
                            ? 'bg-emerald-50/60'
                            : isEvaluated && isCorrect === false
                            ? 'bg-red-50/40'
                            : idx % 2 === 1
                            ? 'bg-[#faf8f5]'
                            : 'bg-white'
                        }
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-xs font-bold text-[#756769]">
                          {team.seat_number || idx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-stone-300'}`}
                              title={isOnline ? 'Portal Online' : 'Portal Offline'}
                            />
                            <span className="font-bold text-[#2b1b1d]">{team.name}</span>
                            <span className="text-[11px] font-mono text-[#8a7c7e]">({team.code})</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-[#2b1b1d]">
                          <div className="flex flex-wrap items-center gap-2">
                            {ans?.answer_text ? (
                              <span className="px-2.5 py-1 rounded bg-[#f4f0ea] border border-[#e2dcd4] inline-block">
                                {ans.answer_text}
                              </span>
                            ) : (
                              <span className="text-xs text-[#9c8f91] italic">No answer</span>
                            )}
                            {ans?.override_reason && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                {ans.override_reason}
                              </span>
                            )}
                            {isEvaluated && !ans?.override_reason && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                                Auto-checked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleDirectJudgeCurrent(team.id, true, null, isEvaluated && !isCorrect ? "Considered by Instructor" : null)}
                              disabled={!currentQuestion}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                isEvaluated && isCorrect
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              {isEvaluated && !isCorrect
                                ? `Consider · 1 (+${currentQuestion?.points || 3})`
                                : `1 (+${currentQuestion?.points || 3})`}
                            </button>
                            <button
                              onClick={() => handleDirectJudgeCurrent(team.id, false, null, isEvaluated && isCorrect ? "Overridden by Instructor" : null)}
                              disabled={!currentQuestion}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                                isEvaluated && isCorrect === false
                                  ? 'bg-red-700 text-white border-red-700'
                                  : 'bg-white hover:bg-red-50 text-red-800 border-red-300'
                              }`}
                            >
                              0
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="inline-flex items-center space-x-1">
                            <input
                              type="number"
                              placeholder={String(pts)}
                              value={manualPoints[team.id] ?? ''}
                              onChange={(e) => setManualPoints({ ...manualPoints, [team.id]: e.target.value })}
                              className="w-16 bg-white border border-[#d6cfc7] rounded-lg px-2 py-1 text-xs text-center font-mono font-bold"
                            />
                            <button
                              onClick={() => {
                                if (manualPoints[team.id] !== undefined && manualPoints[team.id] !== '') {
                                  const val = Number(manualPoints[team.id]);
                                  handleDirectJudgeCurrent(team.id, val > 0, val, 'Judge custom points');
                                }
                              }}
                              disabled={!currentQuestion}
                              className="px-2 py-1 rounded-lg bg-[#f3efe9] hover:bg-[#e8e1d8] border border-[#d6cfc7] text-[11px] font-bold text-[#2b1b1d]"
                            >
                              Set
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-extrabold text-sm text-[#2b1b1d]">
                          {runningTotal} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* LIVE INTERACTIVE ROUND RESULTS MATRIX (JUDGE OVERRIDE GRID) */}
          {activeRoundMatrix && (
            <div className="bg-white rounded-2xl p-5 lg:p-6 border border-[#ddd6cd] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#b89b4a]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: accentColor }}>
                      Judge Score Matrix Preview & Direct Override
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-[#2b1b1d]">
                    {activeRoundMatrix.category.name} results (Click any cell to toggle: Blank → 1 → 0)
                  </h3>
                </div>

                <button
                  onClick={() => handleShowRoundResults(activeRoundMatrix.category.id)}
                  style={{ backgroundColor: primaryColor }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm hover:opacity-95"
                >
                  <Table2 className="w-4 h-4 text-[#e6cb7a]" />
                  <span>Flash {activeRoundMatrix.category.name} Matrix to Projector</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-[#d8d2ca]">
                <table className="w-full border-collapse text-xs sm:text-sm tabular-nums">
                  <thead>
                    <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                      <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-white/15 w-12">No.</th>
                      <th rowSpan={2} className="py-2.5 px-4 text-left border-r border-white/15 min-w-[200px]">{participantLabel}</th>
                      <th colSpan={activeRoundMatrix.columns.length + 1} className="py-2 px-2 text-center border-b border-white/15 font-bold">
                        {activeRoundMatrix.category.name}
                      </th>
                    </tr>
                    <tr className="text-white/95" style={{ backgroundColor: primaryColor }}>
                      {activeRoundMatrix.columns.map(col => (
                        <th key={col.label} className="py-1.5 px-2 text-center border-r border-white/15 min-w-[38px]">
                          {col.label}
                        </th>
                      ))}
                      <th className="py-1.5 px-3 text-center font-bold min-w-[58px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e3ddd5]">
                    {activeRoundMatrix.rows.map((row, rIdx) => (
                      <tr key={row.team_id} className={rIdx % 2 === 1 ? 'bg-[#f8f6f2]' : 'bg-white'}>
                        <td className="py-2 px-3 text-center border-r border-[#e3ddd5] text-[#6e6062]">{row.seat_number}</td>
                        <td className="py-2 px-4 font-semibold border-r border-[#e3ddd5]">{row.team_name}</td>
                        {row.cells.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            onClick={() => cell.questionId && handleJudgeMatrixCycle(cell.questionId, row.team_id, cell.value)}
                            title={cell.questionId ? `Click to cycle instructor's decision (Answer: ${cell.answerText || 'none'})` : 'No question configured for this slot'}
                            className={`py-2 px-2 text-center border-r border-[#e3ddd5] select-none transition-colors ${
                              cell.questionId ? 'cursor-pointer hover:bg-amber-100/70' : 'bg-stone-100/60 cursor-default'
                            } ${cell.value === 1 ? 'font-extrabold text-emerald-900 bg-emerald-50/70' : cell.value === 0 ? 'text-[#756769]' : ''}`}
                          >
                            {cell.value === null ? '' : cell.value}
                          </td>
                        ))}
                        <td className="py-2 px-3 text-center font-extrabold text-[#2b1b1d]">
                          {row.total_points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: QUESTION BANK MANAGER
         ============================================================ */}
      {activeTab === 'questions' && (
        <QuestionBankManager
          questions={questions}
          categories={categories}
          primaryColor={primaryColor}
          editingQuestion={editingQuestion}
          setEditingQuestion={setEditingQuestion}
          onQuestionSaved={(msg) => showNotification(msg || 'Question saved!')}
        />
      )}

      {/* ============================================================
          TAB 3: ROUNDS & SCORING MANAGER
         ============================================================ */}
      {activeTab === 'categories' && (
        <CategoryManager
          categories={categories}
          questions={questions}
          primaryColor={primaryColor}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          onCategorySaved={() => showNotification('Round configuration saved!')}
        />
      )}

      {/* ============================================================
          TAB 4: SCHOOLS / TEAMS MANAGER
         ============================================================ */}
      {activeTab === 'teams' && (
        <TeamManager
          teams={teams}
          participantLabel={participantLabel}
          primaryColor={primaryColor}
          connectedTeamIds={connectedTeamIds}
          editingTeam={editingTeam}
          setEditingTeam={setEditingTeam}
          onTeamSaved={() => showNotification(`${participantLabel} saved!`)}
        />
      )}

      {/* ============================================================
          TAB 5: EVENT & DISPLAY CONFIGURATION ("ICOCONFIG")
         ============================================================ */}
      {activeTab === 'config' && (
        <EventConfigManager
          config={config}
          dbInfo={state?.dbInfo}
          supabaseStatus={state?.supabaseStatus}
          auditLogs={state?.auditLogs || []}
          primaryColor={primaryColor}
          onConfigSaved={() => showNotification('Event & Display configuration saved and synced!')}
          onImported={(msg) => showNotification(msg)}
          onResetScores={handleResetScoresOnly}
          onClearBlank={() => {
            if (window.confirm('Clear all sample questions, schools, and answers so you can build your own competition from scratch?')) {
              socketService.hostAction('CLEAR_BLANK');
              showNotification('Cleared sample data. Database is now blank and ready for your own entries!');
            }
          }}
          onFactoryReset={() => {
            if (window.confirm('Reset EVERYTHING (questions, rounds, schools, config, and scores) back to the IT Skills Olympics sample template?')) {
              socketService.hostAction('RESET');
              showNotification('SQLite database restored to sample template.');
            }
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   SUBCOMPONENT: QUESTION BANK MANAGER (WITH BULK IMPORT)
   ------------------------------------------------------------ */
function QuestionBankManager({ questions, categories, primaryColor, editingQuestion, setEditingQuestion, onQuestionSaved }) {
  const [filterCatId, setFilterCatId] = useState('ALL');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState(categories[0]?.id || '');
  const [bulkText, setBulkText] = useState('');

  const [formData, setFormData] = useState({
    id: '',
    category_id: categories[0]?.id || '',
    question_number: '',
    question_type: 'identification',
    choices_text: '',
    question_text: '',
    image_url: '',
    correct_answer: '',
    accepted_answers: '',
    explanation: '',
    points: categories[0]?.default_points || 3,
    timer_seconds: categories[0]?.default_timer_seconds || 15
  });

  const handleEdit = (q) => {
    setFormData({
      id: q.id,
      category_id: q.category_id,
      question_number: q.question_number || '',
      question_type: q.question_type || 'identification',
      choices_text: Array.isArray(q.choices) ? q.choices.join('\n') : '',
      question_text: q.question_text,
      image_url: q.image_url || '',
      correct_answer: q.correct_answer,
      accepted_answers: q.accepted_answers || '',
      explanation: q.explanation || '',
      points: q.points,
      timer_seconds: q.timer_seconds
    });
    setEditingQuestion(true);
    setShowBulkImport(false);
  };

  const handleNew = () => {
    const defaultCat = (filterCatId !== 'ALL' ? categories.find(c => c.id === filterCatId) : categories[0]) || categories[0];
    const catQuestions = questions.filter(q => q.category_id === defaultCat?.id);
    const nextNum = catQuestions.reduce((m, q) => Math.max(m, Number(q.question_number) || 0), 0) + 1;
    setFormData({
      id: '',
      category_id: defaultCat?.id || '',
      question_number: nextNum,
      question_type: 'identification',
      choices_text: '',
      question_text: '',
      image_url: '',
      correct_answer: '',
      accepted_answers: '',
      explanation: '',
      points: defaultCat?.default_points || 3,
      timer_seconds: defaultCat?.default_timer_seconds || 15
    });
    setEditingQuestion(true);
    setShowBulkImport(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      choices: formData.question_type === 'multiple_choice'
        ? formData.choices_text.split('\n').map(s => s.trim()).filter(Boolean)
        : []
    };
    try {
      const res = await fetch(apiUrl('/api/questions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingQuestion(false);
        onQuestionSaved('Question saved to Question Bank!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const cat = categories.find(c => c.id === (bulkCategoryId || categories[0]?.id));
    if (!cat) return;
    const existingCount = questions.filter(q => q.category_id === cat.id).length;

    // Format per line: Question Text | Correct Answer | Accepted Alternates (optional)
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map((line, i) => {
      const parts = line.split('|').map(p => p.trim());
      return {
        category_id: cat.id,
        question_number: existingCount + i + 1,
        question_type: 'identification',
        question_text: parts[0] || '',
        correct_answer: parts[1] || '',
        accepted_answers: parts[2] || '',
        points: cat.default_points,
        timer_seconds: cat.default_timer_seconds
      };
    }).filter(item => item.question_text && item.correct_answer);

    if (parsed.length === 0) return;

    const res = await fetch(apiUrl('/api/questions/bulk'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: parsed })
    });
    if (res.ok) {
      setBulkText('');
      setShowBulkImport(false);
      onQuestionSaved(`Imported ${parsed.length} questions into ${cat.name}!`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    await fetch(apiUrl(`/api/questions/${id}`), { method: 'DELETE' });
  };

  const filteredQuestions = filterCatId === 'ALL'
    ? questions
    : questions.filter(q => q.category_id === filterCatId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#2b1b1d]">Question Bank Configuration</h3>
          <p className="text-xs text-[#6e6062]">Organize questions by round (Q1–Q10), set official answer keys, accepted alternates, and timers.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => { setShowBulkImport(!showBulkImport); setEditingQuestion(false); }}
            className="flex items-center space-x-1.5 bg-white hover:bg-[#faf8f5] text-[#2b1b1d] border border-[#d6cfc7] px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={handleNew}
            style={{ backgroundColor: primaryColor }}
            className="flex items-center space-x-1.5 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Round Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCatId('ALL')}
          style={filterCatId === 'ALL' ? { backgroundColor: primaryColor } : undefined}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
            filterCatId === 'ALL' ? 'text-white border-transparent' : 'bg-white text-[#5c4f51] border-[#dcd5cc]'
          }`}
        >
          All Rounds ({questions.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCatId(cat.id)}
            style={filterCatId === cat.id ? { backgroundColor: primaryColor } : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              filterCatId === cat.id ? 'text-white border-transparent' : 'bg-white text-[#5c4f51] border-[#dcd5cc]'
            }`}
          >
            {cat.name} ({questions.filter(q => q.category_id === cat.id).length})
          </button>
        ))}
      </div>

      {/* Bulk Import Form */}
      {showBulkImport && (
        <form onSubmit={handleBulkSubmit} className="bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-4 shadow-sm">
          <h4 className="font-extrabold text-base text-[#2b1b1d]">Quick Bulk Import Questions</h4>
          <p className="text-xs text-[#6e6062]">
            Enter one question per line using <code className="bg-[#f3efe9] px-1.5 py-0.5 rounded font-mono">Question text | Official Answer | Optional alternate answers</code>
          </p>
          <div>
            <label className="block text-xs font-bold text-[#5c4f51] mb-1">Target Round</label>
            <select
              value={bulkCategoryId || categories[0]?.id || ''}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              className="bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2 text-sm font-semibold"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.default_points} pts, {c.default_timer_seconds}s)</option>
              ))}
            </select>
          </div>
          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'What is the smallest unit of data? | Bit | bit, binary digit\nWhat does HTTP stand for? | Hypertext Transfer Protocol'}
            className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl p-3 text-sm font-mono"
            required
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setShowBulkImport(false)} className="px-4 py-2 rounded-xl bg-[#f3efe9] text-xs font-bold">Cancel</button>
            <button type="submit" style={{ backgroundColor: primaryColor }} className="px-5 py-2 rounded-xl text-white text-xs font-bold">Import Lines</button>
          </div>
        </form>
      )}

      {/* Single Question Add/Edit Form */}
      {editingQuestion && (
        <form onSubmit={handleSave} className="bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-4 shadow-sm">
          <h4 className="font-extrabold text-lg text-[#2b1b1d]">
            {formData.id ? 'Edit Question' : 'Add New Question'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Round</label>
              <select
                value={formData.category_id}
                onChange={(e) => {
                  const catId = e.target.value;
                  const cat = categories.find(c => c.id === catId);
                  setFormData({
                    ...formData,
                    category_id: catId,
                    points: cat ? cat.default_points : formData.points,
                    timer_seconds: cat ? cat.default_timer_seconds : formData.timer_seconds
                  });
                }}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Question #</label>
              <input
                type="number"
                min={1}
                value={formData.question_number}
                onChange={(e) => setFormData({ ...formData, question_number: e.target.value })}
                required
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Points</label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                required
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Timer (sec)</label>
              <input
                type="number"
                value={formData.timer_seconds}
                onChange={(e) => setFormData({ ...formData, timer_seconds: e.target.value })}
                required
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Question Format</label>
              <select
                value={formData.question_type}
                onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                <option value="identification">Identification / Open-Ended (Standard Quiz Bee)</option>
                <option value="multiple_choice">Multiple Choice (A, B, C, D)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Image URL (Optional)</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5c4f51] mb-1">Question Text</label>
            <textarea
              rows={3}
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              required
              placeholder='e.g. What OOP principle, whose name means "many forms," lets one method call...'
              className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl p-3 text-sm"
            />
          </div>

          {formData.question_type === 'multiple_choice' && (
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Choices (One per line, e.g. 4 lines for A–D)</label>
              <textarea
                rows={4}
                value={formData.choices_text}
                onChange={(e) => setFormData({ ...formData, choices_text: e.target.value })}
                placeholder={'Encapsulation\nPolymorphism\nAbstraction\nInheritance'}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl p-3 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Official Correct Answer</label>
              <input
                type="text"
                value={formData.correct_answer}
                onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                required
                placeholder="e.g. Polymorphism"
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Accepted Alternate Answers (comma-separated, for auto-grading)</label>
              <input
                type="text"
                value={formData.accepted_answers}
                onChange={(e) => setFormData({ ...formData, accepted_answers: e.target.value })}
                placeholder="e.g. polymorphism, runtime polymorphism"
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5c4f51] mb-1">Explanation / Judge Note (Optional)</label>
            <input
              type="text"
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Optional explanation shown on Reveal Answer screen"
              className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={() => setEditingQuestion(false)} className="px-4 py-2 rounded-xl bg-[#f3efe9] text-xs font-bold">Cancel</button>
            <button type="submit" style={{ backgroundColor: primaryColor }} className="px-5 py-2 rounded-xl text-white text-xs font-bold">Save Question</button>
          </div>
        </form>
      )}

      {/* Question Table */}
      <div className="bg-white border border-[#ddd6cd] rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-white text-xs uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>
              <th className="p-3.5">Round / Q#</th>
              <th className="p-3.5">Question</th>
              <th className="p-3.5">Official Answer</th>
              <th className="p-3.5 text-center">Pts</th>
              <th className="p-3.5 text-center">Timer</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece6de]">
            {filteredQuestions.map((q) => {
              const cat = categories.find(c => c.id === q.category_id);
              return (
                <tr key={q.id} className="hover:bg-[#faf8f5]">
                  <td className="p-3.5 whitespace-nowrap">
                    <div className="font-bold text-xs text-[#2b1b1d]">{cat?.name || 'Round'}</div>
                    <div className="text-xs font-mono text-[#756769]">Question {q.question_number}</div>
                  </td>
                  <td className="p-3.5 max-w-md">
                    <div className="font-medium text-[#2b1b1d]">{q.question_text}</div>
                    {q.question_type === 'multiple_choice' && (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">Multiple Choice</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="font-bold text-emerald-800">{q.correct_answer}</div>
                    {q.accepted_answers && <div className="text-[11px] text-[#756769] truncate max-w-[180px]">{q.accepted_answers}</div>}
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold">{q.points}</td>
                  <td className="p-3.5 text-center font-mono">{q.timer_seconds}s</td>
                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button onClick={() => handleEdit(q)} className="p-1.5 rounded-lg bg-[#f3efe9] hover:bg-[#e7e0d6] text-[#2b1b1d]">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   SUBCOMPONENT: ROUNDS & SCORING MANAGER
   ------------------------------------------------------------ */
function CategoryManager({ categories, questions, primaryColor, editingCategory, setEditingCategory, onCategorySaved }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    badge_color: '#3e1b20',
    default_points: 3,
    default_timer_seconds: 15,
    question_count: 10,
    display_order: 1
  });

  const handleEdit = (cat) => {
    setFormData({
      ...cat,
      question_count: cat.question_count || 10
    });
    setEditingCategory(true);
  };

  const handleNew = () => {
    setFormData({
      id: '',
      name: '',
      badge_color: primaryColor,
      default_points: 3,
      default_timer_seconds: 15,
      question_count: 10,
      display_order: categories.length + 1
    });
    setEditingCategory(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const res = await fetch(apiUrl('/api/categories'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setEditingCategory(false);
      onCategorySaved();
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this round?')) return;
    await fetch(apiUrl(`/api/categories/${id}`), { method: 'DELETE' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#2b1b1d]">Rounds & Scoring Rules</h3>
          <p className="text-xs text-[#6e6062]">Configure each round's points per correct answer, default timer, and number of Q columns in the Results Matrix (e.g. Q1–Q10).</p>
        </div>
        <button
          onClick={handleNew}
          style={{ backgroundColor: primaryColor }}
          className="flex items-center space-x-1.5 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Round</span>
        </button>
      </div>

      {editingCategory && (
        <form onSubmit={handleSave} className="bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-4 shadow-sm">
          <h4 className="font-extrabold text-base text-[#2b1b1d]">
            {formData.id ? 'Edit Round' : 'Create Round'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Round Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Easy Round"
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Points / Question</label>
              <input
                type="number"
                value={formData.default_points}
                onChange={(e) => setFormData({ ...formData, default_points: e.target.value })}
                required
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Default Timer (s)</label>
              <input
                type="number"
                value={formData.default_timer_seconds}
                onChange={(e) => setFormData({ ...formData, default_timer_seconds: e.target.value })}
                required
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Matrix Columns (Q#)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.question_count}
                onChange={(e) => setFormData({ ...formData, question_count: e.target.value })}
                required
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setEditingCategory(false)} className="px-4 py-2 rounded-xl bg-[#f3efe9] text-xs font-bold">Cancel</button>
            <button type="submit" style={{ backgroundColor: primaryColor }} className="px-5 py-2 rounded-xl text-white text-xs font-bold">Save Round</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map(cat => {
          const count = questions.filter(q => q.category_id === cat.id).length;
          return (
            <div key={cat.id} className="bg-white border border-[#ddd6cd] rounded-2xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-base text-[#2b1b1d]">{cat.name}</span>
                <div className="space-x-1">
                  <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg bg-[#f3efe9] hover:bg-[#e6dfd5] text-[#2b1b1d]">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-[#6e6062] space-y-1.5 font-mono border-t border-[#ece6de] pt-3">
                <div className="flex justify-between"><span>Points / Question:</span><strong className="text-[#2b1b1d]">{cat.default_points} pts</strong></div>
                <div className="flex justify-between"><span>Default Timer:</span><strong className="text-[#2b1b1d]">{cat.default_timer_seconds}s</strong></div>
                <div className="flex justify-between"><span>Matrix Slots:</span><strong className="text-[#2b1b1d]">Q1–Q{cat.question_count || 10}</strong></div>
                <div className="flex justify-between"><span>Questions Added:</span><strong className="text-emerald-800">{count}</strong></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   SUBCOMPONENT: SCHOOLS / TEAMS MANAGER
   ------------------------------------------------------------ */
function TeamManager({ teams, participantLabel, primaryColor, connectedTeamIds, editingTeam, setEditingTeam, onTeamSaved }) {
  const [copiedId, setCopiedId] = useState('');
  const [formData, setFormData] = useState({
    id: '',
    seat_number: 1,
    name: '',
    code: '',
    avatar: '🏛️',
    color: '#3e1b20',
    is_active: true
  });

  const makeRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return `${s.slice(0, 3)}-${s.slice(3)}`;
  };

  const handleEdit = (t) => {
    setFormData(t);
    setEditingTeam(true);
  };

  const handleNew = () => {
    const nextSeat = teams.reduce((m, t) => Math.max(m, Number(t.seat_number) || 0), 0) + 1;
    setFormData({
      id: '',
      seat_number: nextSeat,
      name: '',
      code: makeRandomCode(),
      avatar: '🏛️',
      color: primaryColor,
      is_active: true
    });
    setEditingTeam(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const res = await fetch(apiUrl('/api/teams'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setEditingTeam(false);
      onTeamSaved();
    }
  };

  const handleRegenerateOne = async (team) => {
    const res = await fetch(apiUrl(`/api/teams/${team.id}/regenerate-code`), { method: 'POST' });
    if (res.ok) {
      onTeamSaved();
    }
  };

  const handleRegenerateAll = async () => {
    if (!window.confirm('Generate fresh random access codes for ALL groups/schools? Existing codes will be replaced.')) return;
    const res = await fetch(apiUrl('/api/teams/regenerate-all-codes'), { method: 'POST' });
    if (res.ok) {
      onTeamSaved();
    }
  };

  const handleCopyCode = (team) => {
    navigator.clipboard?.writeText(team.code).catch(() => {});
    setCopiedId(team.id);
    setTimeout(() => setCopiedId(''), 1500);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Remove this ${participantLabel}?`)) return;
    await fetch(apiUrl(`/api/teams/${id}`), { method: 'DELETE' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-[#2b1b1d]">Participating {participantLabel}s & Access Codes</h3>
          <p className="text-xs text-[#6e6062]">
            Generate unique access codes to distribute to each group. Groups sign in at <code className="font-mono bg-[#f3efe9] px-1.5 py-0.5 rounded">/contestant</code> using only their code.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRegenerateAll}
            className="flex items-center space-x-1.5 bg-white hover:bg-[#faf8f5] text-[#2b1b1d] border border-[#d6cfc7] px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-sm"
          >
            <KeyRound className="w-4 h-4 text-[#b89b4a]" />
            <span>Generate Codes for All</span>
          </button>
          <button
            onClick={handleNew}
            style={{ backgroundColor: primaryColor }}
            className="flex items-center space-x-1.5 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:opacity-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add {participantLabel}</span>
          </button>
        </div>
      </div>

      {editingTeam && (
        <form onSubmit={handleSave} className="bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-4 shadow-sm">
          <h4 className="font-extrabold text-base text-[#2b1b1d]">
            {formData.id ? `Edit ${participantLabel}` : `Register ${participantLabel}`}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">No. (Table Order)</label>
              <input
                type="number"
                min={1}
                value={formData.seat_number}
                onChange={(e) => setFormData({ ...formData, seat_number: e.target.value })}
                required
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-mono font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">{participantLabel} Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. UNIVERSITY OF NORTHERN PHILIPPINES"
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Group Access Code</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="ABC-123"
                  className="flex-1 min-w-0 bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-mono font-bold uppercase"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, code: makeRandomCode() })}
                  title="Generate Random Code"
                  className="px-2.5 py-2.5 rounded-xl bg-[#f3efe9] hover:bg-[#e6dfd5] border border-[#d6cfc7] text-xs font-bold text-[#2b1b1d] shrink-0"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setEditingTeam(false)} className="px-4 py-2 rounded-xl bg-[#f3efe9] text-xs font-bold">Cancel</button>
            <button type="submit" style={{ backgroundColor: primaryColor }} className="px-5 py-2 rounded-xl text-white text-xs font-bold">Save</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#ddd6cd] rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-white text-xs uppercase tracking-wider" style={{ backgroundColor: primaryColor }}>
              <th className="p-3.5 text-center w-16">No.</th>
              <th className="p-3.5">{participantLabel}</th>
              <th className="p-3.5">Generated Group Code</th>
              <th className="p-3.5">Portal Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ece6de]">
            {teams.map((team, idx) => {
              const isOnline = connectedTeamIds.includes(team.id);
              return (
                <tr key={team.id} className="hover:bg-[#faf8f5]">
                  <td className="p-3.5 text-center font-mono font-bold text-[#6e6062]">{team.seat_number || idx + 1}</td>
                  <td className="p-3.5 font-bold text-[#2b1b1d]">{team.name}</td>
                  <td className="p-3.5">
                    <div className="inline-flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-sm px-2.5 py-1 rounded-lg bg-[#f4f0ea] border border-[#dcd5cc] text-[#3e1b20] tracking-wider">
                        {team.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(team)}
                        className="p-1.5 rounded-lg bg-white hover:bg-[#f3efe9] border border-[#dcd5cc] text-[#5c4f51]"
                        title="Copy group code"
                      >
                        {copiedId === team.id ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegenerateOne(team)}
                        className="p-1.5 rounded-lg bg-white hover:bg-[#f3efe9] border border-[#dcd5cc] text-[#5c4f51]"
                        title="Generate new code for this group"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center space-x-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      isOnline
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-[#f4f1ec] text-[#7c7072] border-[#e2dcd4]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                      <span>{isOnline ? 'Connected' : 'Offline'}</span>
                    </span>
                  </td>
                  <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button onClick={() => handleEdit(team)} className="p-1.5 rounded-lg bg-[#f3efe9] hover:bg-[#e6dfd5] text-[#2b1b1d]">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(team.id)} className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   SUBCOMPONENT: EVENT & DISPLAY CONFIG ("ICOCONFIG")
   ------------------------------------------------------------ */
function EventConfigManager({ config, dbInfo, supabaseStatus, auditLogs, primaryColor, onConfigSaved, onImported, onResetScores, onClearBlank, onFactoryReset }) {
  const [importError, setImportError] = useState('');
  const [supaBusy, setSupaBusy] = useState(false);
  const [supaMsg, setSupaMsg] = useState('');
  const [form, setForm] = useState({
    event_name: config.event_name || 'IT Skills Olympics',
    event_category: config.event_category || 'Quiz Bee',
    event_subtitle: config.event_subtitle || 'Inter-University Competition Portal',
    participant_label: config.participant_label || 'School / University',
    primary_color: config.primary_color || '#3e1b20',
    accent_color: config.accent_color || '#b89b4a',
    display_theme: config.display_theme || 'light',
    results_sort_by: config.results_sort_by || 'number',
    round_complete_note: config.round_complete_note || 'Results are locked while the host prepares the next round.',
    auto_evaluate_exact: config.auto_evaluate_exact !== undefined ? Boolean(config.auto_evaluate_exact) : true
  });

  useEffect(() => {
    setForm({
      event_name: config.event_name || 'IT Skills Olympics',
      event_category: config.event_category || 'Quiz Bee',
      event_subtitle: config.event_subtitle || 'Inter-University Competition Portal',
      participant_label: config.participant_label || 'School / University',
      primary_color: config.primary_color || '#3e1b20',
      accent_color: config.accent_color || '#b89b4a',
      display_theme: config.display_theme || 'light',
      results_sort_by: config.results_sort_by || 'number',
      round_complete_note: config.round_complete_note || 'Results are locked while the host prepares the next round.',
      auto_evaluate_exact: config.auto_evaluate_exact !== undefined ? Boolean(config.auto_evaluate_exact) : true
    });
  }, [config]);

  const handleSave = async (e) => {
    e.preventDefault();
    const res = await fetch(apiUrl('/api/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      onConfigSaved();
    }
  };

  const colorPresets = [
    { name: 'Academic Maroon & Gold', primary: '#3e1b20', accent: '#b89b4a' },
    { name: 'Royal Navy & Gold', primary: '#172554', accent: '#c9a227' },
    { name: 'Forest Green & Gold', primary: '#143b2a', accent: '#c5a044' },
    { name: 'Slate Charcoal & Amber', primary: '#1e293b', accent: '#d97706' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-extrabold text-[#2b1b1d]">Event Branding & Projector Configuration</h3>
        <p className="text-xs text-[#6e6062]">Customize everything flashed on the auditorium projector — event header, colors, table columns, sorting, and auto-grading behavior.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-6 shadow-sm">
        {/* Branding Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#3e1b20] border-b border-[#ece6de] pb-2">
            1. Event Identity (Top Projector Bar)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Event Name</label>
              <input
                type="text"
                value={form.event_name}
                onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
                placeholder="IT Skills Olympics"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Category / Event Label</label>
              <input
                type="text"
                value={form.event_category}
                onChange={(e) => setForm({ ...form, event_category: e.target.value })}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
                placeholder="Quiz Bee"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Participant Column Header</label>
              <input
                type="text"
                value={form.participant_label}
                onChange={(e) => setForm({ ...form, participant_label: e.target.value })}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
                placeholder="School / University"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Event Subtitle</label>
              <input
                type="text"
                value={form.event_subtitle}
                onChange={(e) => setForm({ ...form, event_subtitle: e.target.value })}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Round Results Footer Message</label>
              <input
                type="text"
                value={form.round_complete_note}
                onChange={(e) => setForm({ ...form, round_complete_note: e.target.value })}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Visual Appearance */}
        <div className="space-y-4">
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#3e1b20] border-b border-[#ece6de] pb-2">
            2. Projector Theme & Palette
          </h4>

          <div className="flex flex-wrap gap-2">
            {colorPresets.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => setForm({ ...form, primary_color: p.primary, accent_color: p.accent })}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-[#d6cfc7] bg-[#faf8f5] hover:bg-white text-xs font-bold"
              >
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.primary }} />
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.accent }} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Primary Header Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-[#d6cfc7] cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="flex-1 bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Accent Divider Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={form.accent_color}
                  onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-[#d6cfc7] cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={form.accent_color}
                  onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                  className="flex-1 bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Projector Background</label>
              <select
                value={form.display_theme}
                onChange={(e) => setForm({ ...form, display_theme: e.target.value })}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                <option value="light">Warm Light Stage (Recommended)</option>
                <option value="dark">Dark Auditorium Stage</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5c4f51] mb-1">Round Matrix Row Order</label>
              <select
                value={form.results_sort_by}
                onChange={(e) => setForm({ ...form, results_sort_by: e.target.value })}
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-3 py-2.5 text-sm font-semibold"
              >
                <option value="number">By Participant No. (1, 2, 3...)</option>
                <option value="score">By Highest Round Score</option>
              </select>
            </div>
          </div>
        </div>

        {/* Judging Options */}
        <div className="space-y-3">
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#3e1b20] border-b border-[#ece6de] pb-2">
            3. Judging & Scoring Automation
          </h4>
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_evaluate_exact}
              onChange={(e) => setForm({ ...form, auto_evaluate_exact: e.target.checked })}
              className="mt-1 w-4 h-4 accent-[#3e1b20]"
            />
            <div>
              <div className="text-sm font-bold text-[#2b1b1d]">Auto-evaluate exact answer matches when timer expires</div>
              <div className="text-xs text-[#6e6062]">
                Automatically marks case-insensitive matches against Official Answer & Accepted Alternates as 1 (Correct). Judges can always override any score manually.
              </div>
            </div>
          </label>
        </div>

        <div className="flex justify-end pt-2 border-t border-[#ece6de]">
          <button
            type="submit"
            style={{ backgroundColor: primaryColor }}
            className="px-6 py-2.5 rounded-xl text-white font-bold text-sm shadow-sm hover:opacity-95"
          >
            Save Configuration & Apply Live
          </button>
        </div>
      </form>

      {/* Supabase Cloud Database Sync Panel */}
      <div className="bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm ${
              supabaseStatus?.tablesReady ? 'bg-emerald-700' : 'bg-amber-600'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-base font-extrabold text-[#2b1b1d]">
                  Supabase Cloud Database
                </h4>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  supabaseStatus?.tablesReady
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  {supabaseStatus?.tablesReady ? 'Connected & Auto-Syncing' : 'Setup Needed'}
                </span>
              </div>
              <p className="text-xs text-[#6e6062] font-mono mt-0.5">
                {supabaseStatus?.url || 'Not configured in .env'}
                {supabaseStatus?.lastSyncedAt ? ` · Last synced ${new Date(supabaseStatus.lastSyncedAt).toLocaleTimeString()}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={supaBusy}
              onClick={async () => {
                setSupaBusy(true);
                setSupaMsg('');
                try {
                  const res = await fetch(apiUrl('/api/db/supabase/status'));
                  const data = await res.json();
                  setSupaMsg(data.tablesReady ? 'Supabase tables verified & ready!' : (data.lastError || 'Tables not ready yet.'));
                } finally {
                  setSupaBusy(false);
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#f6f4ef] hover:bg-[#ece6de] text-[#2b1b1d] border border-[#d6cfc7] text-xs font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${supaBusy ? 'animate-spin' : ''}`} />
              <span>Check Connection</span>
            </button>

            <button
              type="button"
              disabled={supaBusy}
              onClick={async () => {
                setSupaBusy(true);
                setSupaMsg('');
                try {
                  const res = await fetch(apiUrl('/api/db/supabase/push'), { method: 'POST' });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Push failed');
                  onImported('Pushed all questions, schools, config, and answers to Supabase Cloud!');
                } catch (err) {
                  setSupaMsg(err.message);
                } finally {
                  setSupaBusy(false);
                }
              }}
              style={{ backgroundColor: primaryColor }}
              className="px-3.5 py-2 rounded-xl text-white text-xs font-bold hover:opacity-95 disabled:opacity-50"
            >
              Push to Supabase ↑
            </button>

            <button
              type="button"
              disabled={supaBusy}
              onClick={async () => {
                setSupaBusy(true);
                setSupaMsg('');
                try {
                  const res = await fetch(apiUrl('/api/db/supabase/pull'), { method: 'POST' });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Pull failed');
                  onImported('Pulled latest questions, schools, and answers from Supabase Cloud!');
                } catch (err) {
                  setSupaMsg(err.message);
                } finally {
                  setSupaBusy(false);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#faf8f5] text-[#2b1b1d] border border-[#cfc6bc] text-xs font-bold disabled:opacity-50"
            >
              Pull from Supabase ↓
            </button>
          </div>
        </div>

        {(supabaseStatus?.lastError || supaMsg) && (
          <div className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 border ${
            supabaseStatus?.tablesReady && !supabaseStatus?.lastError
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}>
            {supaMsg || supabaseStatus?.lastError}
          </div>
        )}
      </div>

      {/* Local SQLite Database Status, Backup & Import */}
      <div className="bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ece6de] pb-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-[#2b1b1d]">
                Local Dynamic SQLite Database
              </h4>
              <p className="text-xs text-[#6e6062] font-mono">
                {dbInfo?.engine || 'SQLite'} · {dbInfo?.file || 'data/quizbee.db'}
                {dbInfo?.size_bytes ? ` · ${(dbInfo.size_bytes / 1024).toFixed(1)} KB` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={IS_API_CONFIGURED ? apiUrl('/api/db/export') : '#'}
              download
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#f6f4ef] hover:bg-[#ece6de] text-[#2b1b1d] border border-[#d6cfc7] text-xs font-bold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup (.json)</span>
            </a>

            <label
              style={{ backgroundColor: primaryColor }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold cursor-pointer hover:opacity-95 shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Backup (.json)</span>
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setImportError('');
                  try {
                    const text = await file.text();
                    const parsed = JSON.parse(text);
                    const res = await fetch(apiUrl('/api/db/import'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(parsed)
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Import failed');
                    onImported(`Imported backup "${file.name}" into local SQLite database!`);
                  } catch (err) {
                    setImportError(err.message || 'Invalid JSON backup file');
                  }
                }}
              />
            </label>
          </div>
        </div>

        {importError && (
          <div className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            Import Error: {importError}
          </div>
        )}

        {/* Live DB Table Row Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Rounds', value: dbInfo?.counts?.categories ?? 0 },
            { label: 'Questions', value: dbInfo?.counts?.questions ?? 0 },
            { label: 'Participants', value: dbInfo?.counts?.teams ?? 0 },
            { label: 'Saved Answers', value: dbInfo?.counts?.answers ?? 0 },
            { label: 'Audit Records', value: dbInfo?.counts?.audit_logs ?? 0 }
          ].map(stat => (
            <div key={stat.label} className="bg-[#faf8f5] border border-[#e5dfd6] rounded-xl p-3 text-center">
              <div className="text-xl font-black font-mono text-[#2b1b1d]">{stat.value}</div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#756769]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Session & Data Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#ece6de]">
          <p className="text-xs text-[#6e6062] max-w-xl">
            Every change (questions, schools, rounds, config, answers, and instructor's decisions) is persisted immediately to your local SQLite database and survives server restarts.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onResetScores}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold"
            >
              Reset Scores Only
            </button>
            <button
              type="button"
              onClick={onClearBlank}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#faf8f5] text-[#2b1b1d] border border-[#cfc6bc] text-xs font-bold"
            >
              <FileX2 className="w-3.5 h-3.5" />
              <span>Start Blank (Clear Sample Data)</span>
            </button>
            <button
              type="button"
              onClick={onFactoryReset}
              className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold"
            >
              Load Sample Template
            </button>
          </div>
        </div>
      </div>

      {/* Live SQLite Audit Trail */}
      <div className="bg-white border border-[#ddd6cd] rounded-2xl p-6 space-y-3 shadow-sm">
        <div className="flex items-center space-x-2">
          <History className="w-4 h-4 text-[#b89b4a]" />
          <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#2b1b1d]">
            Recent Database Activity & Judge Audit Log
          </h4>
        </div>
        <div className="max-h-56 overflow-y-auto border border-[#e5dfd6] rounded-xl divide-y divide-[#ece6de] text-xs">
          {auditLogs.length > 0 ? auditLogs.map(log => (
            <div key={log.id} className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 hover:bg-[#faf8f5]">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#f3efe9] text-[#3e1b20] text-[10px]">
                  {log.event_type}
                </span>
                <span className="text-[#2b1b1d] font-medium">{log.summary}</span>
              </div>
              <span className="text-[11px] font-mono text-[#8a7c7e]">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>
            </div>
          )) : (
            <div className="p-4 text-center text-[#756769] italic">No database events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
