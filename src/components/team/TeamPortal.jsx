import React, { useState, useEffect, useRef } from 'react';
import {
  Lock, Unlock,
  LogOut, Check, KeyRound
} from 'lucide-react';
import { socketService } from '../../services/socket';
import { TimerDisplay } from '../common/TimerDisplay';

export function TeamPortal({ state }) {
  const [activeTeamId, setActiveTeamId] = useState(() => {
    // Clear legacy shared localStorage key so multiple tabs can sign into different schools independently
    localStorage.removeItem('quizbee_active_team_id');
    const params = new URLSearchParams(window.location.search);
    const urlTeam = params.get('team');
    return urlTeam || sessionStorage.getItem('quizbee_active_team_id') || '';
  });

  const [enteredCode, setEnteredCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [answerDraft, setAnswerDraft] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState('idle');
  const debounceRef = useRef(null);
  const latestDraftRef = useRef('');
  const inputRef = useRef(null);

  const config = state?.config || {};
  const session = state?.session;
  const currentQuestion = state?.currentQuestion;
  const teams = state?.teams || [];
  const answers = state?.answers || [];
  const leaderboard = state?.leaderboard || [];

  const primaryColor = config.primary_color || '#3e1b20';
  const accentColor = config.accent_color || '#b89b4a';
  const participantLabel = config.participant_label || 'School / University';

  const status = session?.status || 'IDLE';
  const isTimerRunning = status === 'TIMER_RUNNING';

  const selectedTeam = teams.find(t => t.id === activeTeamId);
  const currentAnswer = currentQuestion && activeTeamId
    ? answers.find(a => a.team_id === activeTeamId && a.question_id === currentQuestion.id)
    : null;

  useEffect(() => {
    if (!activeTeamId) return;
    sessionStorage.setItem('quizbee_active_team_id', activeTeamId);
    socketService.identifyTeam(activeTeamId);

    const sock = socketService.socket;
    const handleReconnect = () => socketService.identifyTeam(activeTeamId);
    if (sock) {
      sock.on('connect', handleReconnect);
      return () => sock.off('connect', handleReconnect);
    }
  }, [activeTeamId]);

  useEffect(() => {
    if (currentAnswer && currentAnswer.answer_text) {
      setAnswerDraft(currentAnswer.answer_text);
      latestDraftRef.current = currentAnswer.answer_text;
    } else {
      setAnswerDraft('');
      latestDraftRef.current = '';
    }
  }, [currentQuestion?.id, currentAnswer?.id]);

  useEffect(() => {
    if (isTimerRunning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTimerRunning]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentQuestion?.id]);

  // Backend-validated Group Access Code Login (NO public list of schools shown!)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const trimmed = enteredCode.trim().toUpperCase();
    if (!trimmed) {
      setLoginError('Please enter the group code given by the admin.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/team-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.team) {
        setLoginError(data.error || 'Invalid Group Code. Please verify with the host/admin.');
      } else {
        setActiveTeamId(data.team.id);
        setEnteredCode('');
      }
    } catch {
      setLoginError('Unable to reach server. Please check your connection.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    socketService.logoutTeam();
    sessionStorage.removeItem('quizbee_active_team_id');
    localStorage.removeItem('quizbee_active_team_id');
    setActiveTeamId('');
  };

  const handleAnswerChange = (val) => {
    setAnswerDraft(val);
    latestDraftRef.current = val;
    if (!isTimerRunning || !currentQuestion || !activeTeamId) return;

    setAutosaveStatus('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      socketService.draftAnswer(activeTeamId, currentQuestion.id, val);
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 1400);
    }, 100);
  };

  const handleFlushOnBlur = () => {
    if (!isTimerRunning || !currentQuestion || !activeTeamId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    socketService.draftAnswer(activeTeamId, currentQuestion.id, latestDraftRef.current);
    setAutosaveStatus('saved');
  };

  const handleSelectChoice = (choiceText) => {
    if (!isTimerRunning || !currentQuestion || !activeTeamId) return;
    setAnswerDraft(choiceText);
    latestDraftRef.current = choiceText;
    setAutosaveStatus('saving');
    socketService.draftAnswer(activeTeamId, currentQuestion.id, choiceText);
    setAutosaveStatus('saved');
    setTimeout(() => setAutosaveStatus('idle'), 1400);
  };

  // CODE-ONLY CONTESTANT LOGIN SCREEN (No list of schools/groups below)
  if (!selectedTeam) {
    return (
      <div className="h-full overflow-hidden flex items-center justify-center p-4 lg:p-8">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white mx-auto shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold uppercase tracking-widest pt-1" style={{ color: primaryColor }}>
              {config.event_name || 'IT Skills Olympics'} / {config.event_category || 'Quiz Bee'}
            </div>
            <div className="w-14 h-[2px] mx-auto" style={{ backgroundColor: accentColor }} />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2b1b1d] pt-1">
              Group Access Login
            </h2>
            <p className="text-[#6e6062] text-sm">
              Enter the unique access code given by the admin for your {participantLabel.toLowerCase()}.
            </p>
          </div>

          <div className="bg-white border border-[#ddd6cd] rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#5c4f51] mb-1.5 text-center">
                  Enter Group Code
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. T01 or ABC-123"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#faf8f5] border-2 border-[#d6cfc7] rounded-xl px-4 py-3.5 text-center text-xl font-mono font-extrabold text-[#2b1b1d] uppercase tracking-[0.2em] focus:outline-none focus:border-[#3e1b20]"
                />
              </div>

              {loginError && (
                <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center font-semibold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-sm hover:opacity-95 disabled:opacity-50 transition-all"
              >
                {loggingIn ? 'Checking Code...' : 'Enter Contestant Terminal'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="h-full overflow-hidden flex flex-col max-w-4xl mx-auto px-4 py-3 gap-3">
      {/* Compact Single-Line Contestant Identity Bar (No Score / No Rank) */}
      <div className="bg-white border border-[#ddd6cd] rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            #{selectedTeam.seat_number || 1}
          </div>
          <div className="flex items-center space-x-2 min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-[#2b1b1d] truncate">{selectedTeam.name}</h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#f3efe9] text-[#5e5153] border border-[#e2dcd4] shrink-0">
              {selectedTeam.code}
            </span>
            <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] text-emerald-700 font-semibold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Connected</span>
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#f6f4ef] hover:bg-[#ece6de] text-[#5c4f51] text-xs font-bold border border-[#d6cfc7] shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* MAIN CONTENT — UNIFORM SPACING, ZERO SCROLL */}
      <div className="flex-1 min-h-0 flex flex-col justify-start gap-3">
        {currentQuestion && status !== 'IDLE' && status !== 'SHOW_ROUND_RESULTS' && status !== 'SHOW_LEADERBOARD' ? (
          <>
            {/* Question Card */}
            <div className="bg-white border border-[#ddd6cd] rounded-2xl px-5 py-4 space-y-2.5 shadow-sm text-center shrink-0">
              <div className="space-y-1">
                <div className="text-xs sm:text-sm font-bold" style={{ color: primaryColor }}>
                  {currentQuestion.category?.name || 'Quiz Round'}
                </div>
                <div className="w-12 h-[2px] mx-auto" style={{ backgroundColor: accentColor }} />
                <div className="text-xs font-semibold text-[#6e6062]">
                  Question {currentQuestion.question_number || 1} · {currentQuestion.points} pts
                </div>
              </div>

              <div className="flex justify-center">
                {status === 'QUESTION_DISPLAYED' && (
                  <span className="inline-flex items-center space-x-2 text-xs sm:text-sm text-[#6e6062] font-semibold bg-[#f6f4ef] border border-[#dcd5cc] px-3.5 py-1 rounded-full">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Reading question · Waiting for Answer Now</span>
                  </span>
                )}
                {status === 'TIMER_RUNNING' && (
                  <TimerDisplay session={session} variant="stage" />
                )}
                {(status === 'TIMER_EXPIRED' || status === 'SHOW_RESULTS') && (
                  <span className="inline-flex items-center space-x-2 text-xs sm:text-sm text-red-800 font-bold bg-red-50 border border-red-200 px-3.5 py-1 rounded-full">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Time is up · Answer locked</span>
                  </span>
                )}
              </div>

              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#2b1b1d] leading-snug max-w-3xl mx-auto">
                {currentQuestion.question_text}
              </h3>

              {currentQuestion.image_url && (
                <div className="rounded-xl overflow-hidden border border-[#e2dcd4] max-h-36 inline-block">
                  <img src={currentQuestion.image_url} alt="Question Attachment" className="max-h-36 object-contain" />
                </div>
              )}
            </div>

            {/* Answer Input Card — No Confirm Button, Auto-Saves & Auto-Locks */}
            <div className="bg-white border border-[#ddd6cd] rounded-2xl px-5 py-3.5 space-y-2 shadow-sm flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between shrink-0">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#5c4f51] flex items-center space-x-2">
                  {isTimerRunning ? <Unlock className="w-3.5 h-3.5 text-emerald-700" /> : <Lock className="w-3.5 h-3.5 text-[#8a7c7e]" />}
                  <span>Your Answer {isTimerRunning ? '(Auto-locks at 0s)' : '(Locked)'}</span>
                </label>

                <div className="text-xs font-mono">
                  {autosaveStatus === 'saving' && <span className="text-amber-700">Syncing...</span>}
                  {autosaveStatus === 'saved' && (
                    <span className="text-emerald-700 flex items-center space-x-1 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Auto-saved</span>
                    </span>
                  )}
                </div>
              </div>

              {currentQuestion.question_type === 'multiple_choice' && currentQuestion.choices?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.choices.map((choice, idx) => {
                    const chosen = answerDraft === choice;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!isTimerRunning}
                        onClick={() => handleSelectChoice(choice)}
                        style={chosen ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                        className={`flex items-center space-x-3 p-3 rounded-xl border-2 text-left transition-all font-bold text-sm sm:text-base ${
                          chosen
                            ? 'text-white shadow-sm'
                            : isTimerRunning
                            ? 'bg-[#faf8f5] hover:bg-white border-[#dcd5cc] hover:border-[#b89b4a] text-[#2b1b1d]'
                            : 'bg-[#f4f1ec] border-[#e5dfd6] text-[#8a7c7e] cursor-not-allowed'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          chosen ? 'bg-white/20 text-white' : 'bg-[#e8e1d8] text-[#2b1b1d]'
                        }`}>
                          {letters[idx] || idx + 1}
                        </span>
                        <span className="truncate">{choice}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  ref={inputRef}
                  rows={2}
                  disabled={!isTimerRunning}
                  value={answerDraft}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  onBlur={handleFlushOnBlur}
                  placeholder={
                    status === 'QUESTION_DISPLAYED'
                      ? 'Input is locked while the quizmaster reads the question...'
                      : status === 'TIMER_RUNNING'
                      ? 'Type your answer here — automatically saves and locks when time expires.'
                      : 'Time is up. Your typed answer has been locked.'
                  }
                  className={`w-full flex-1 min-h-[72px] rounded-xl p-3.5 text-base sm:text-lg font-bold transition-all border-2 resize-none ${
                    isTimerRunning
                      ? 'bg-white border-[#3e1b20] text-[#2b1b1d] focus:outline-none focus:ring-2 focus:ring-[#b89b4a]/40'
                      : 'bg-[#f4f1ec] border-[#e2dcd4] text-[#756769] cursor-not-allowed'
                  }`}
                />
              )}

              <p className="text-xs text-[#6e6062] shrink-0">
                {isTimerRunning
                  ? 'No submit button needed — whatever is typed here automatically locks as your final answer at 0s.'
                  : status === 'QUESTION_DISPLAYED'
                  ? 'Listen carefully — typing unlocks as soon as the host triggers Answer Now.'
                  : 'Your answer is locked. Please view the main display screen for results.'}
              </p>
            </div>
          </>
        ) : (
          <div className="bg-white border border-[#ddd6cd] rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <div className="text-sm font-bold" style={{ color: primaryColor }}>
              {config.event_name || 'IT Skills Olympics'}
            </div>
            <div className="w-12 h-[2px] mx-auto" style={{ backgroundColor: accentColor }} />
            <h3 className="text-2xl font-extrabold text-[#2b1b1d]">
              {status === 'SHOW_ROUND_RESULTS'
                ? 'Round Results Displayed on Main Screen'
                : status === 'SHOW_LEADERBOARD'
                ? 'Leaderboard Displayed on Main Screen'
                : 'Waiting for Next Question'}
            </h3>
            <p className="text-[#6e6062] text-sm max-w-md mx-auto">
              Keep this window open. The next question will appear automatically as soon as the host flashes it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
