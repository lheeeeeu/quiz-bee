import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { TimerDisplay } from '../common/TimerDisplay';
import { sound } from '../../services/sound';

export function MainDisplayScreen({ state, isConnected }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundOn, setSoundOn] = useState(sound.enabled);

  const config = state?.config || {};
  const session = state?.session;
  const currentQuestion = state?.currentQuestion;
  const teams = state?.teams || [];
  const categories = state?.categories || [];
  const leaderboard = state?.leaderboard || [];
  const status = session?.status || 'IDLE';
  const roundMatrix = (status === 'SHOW_RESULTS' && currentQuestion?.category_id && state?.roundMatrices?.[currentQuestion.category_id])
    ? state.roundMatrices[currentQuestion.category_id]
    : state?.roundMatrix;

  const primaryColor = config.primary_color || '#3e1b20';
  const accentColor = config.accent_color || '#b89b4a';
  const isDark = config.display_theme === 'dark';
  const participantLabel = config.participant_label || 'School / University';

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (status === 'SHOW_LEADERBOARD') {
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.6 },
        colors: [primaryColor, accentColor, '#ffffff']
      });
    }
  }, [status, primaryColor, accentColor]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  const toggleSound = () => {
    setSoundOn(sound.toggleSound());
  };

  const activeCategory = currentQuestion?.category
    || categories.find(c => c.id === session?.active_category_id)
    || categories[0];

  const activeTeams = teams.filter(t => t.is_active);
  const bgClass = isDark ? 'bg-[#191315] text-stone-100' : 'bg-[#f6f4ef] text-[#2b1b1d]';
  const mutedText = isDark ? 'text-stone-400' : 'text-[#6e6062]';
  const borderColor = isDark ? 'border-stone-700' : 'border-[#d8d2ca]';
  const cardBg = isDark ? 'bg-[#231b1d]' : 'bg-white';
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Dynamic compact sizing so tables ALWAYS fit inside 100vh without vertical scrolling
  const getTableDensity = (rowCount) => {
    if (rowCount > 14) return { cellPy: 'py-1', text: 'text-[11px] sm:text-xs', headerPy: 'py-1.5' };
    if (rowCount > 10) return { cellPy: 'py-1.5', text: 'text-xs sm:text-sm', headerPy: 'py-2' };
    return { cellPy: 'py-2 lg:py-2.5', text: 'text-xs sm:text-sm lg:text-[15px]', headerPy: 'py-2 lg:py-2.5' };
  };

  const matrixDensity = getTableDensity(roundMatrix?.rows?.length || 10);
  const leaderboardDensity = getTableDensity(leaderboard.length || 10);

  return (
    /* STRICT 100vh FIT-TO-SCREEN — ZERO VERTICAL SCROLLBARS */
    <div className={`relative h-screen w-screen overflow-hidden flex flex-col select-none transition-colors duration-300 ${bgClass}`}>
      {/* Thin Formal Top Header Strip */}
      <div
        className="w-full px-5 sm:px-8 py-2 flex items-center justify-between text-white shadow-sm shrink-0"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex items-center space-x-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border border-white/30"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: accentColor }}
          >
            QB
          </div>
          <div className="text-xs sm:text-sm tracking-wide flex items-center space-x-2">
            <span className="font-bold text-white/95">
              {config.event_name || 'IT Skills Olympics'}
            </span>
            {config.event_category && (
              <>
                <span className="text-white/40">/</span>
                <span className="text-white/80 font-medium">{config.event_category}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-white/70">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span className="hidden sm:inline">{config.event_subtitle || 'Live Projection'}</span>
        </div>
      </div>

      {/* MAIN PROJECTOR STAGE (Strictly constrained to remaining viewport height) */}
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center px-6 sm:px-10 lg:px-14 py-4 pb-12 overflow-hidden">

        {/* STATE 1: STANDBY / IDLE — FIT TO SCREEN */}
        {status === 'IDLE' && (
          <div className="max-w-5xl w-full flex flex-col items-center justify-center text-center space-y-5 animate-fade-in">
            <div className="space-y-2">
              <div className="text-base sm:text-lg font-bold tracking-wide" style={{ color: isDark ? '#f5efe6' : primaryColor }}>
                {config.event_name || 'IT Skills Olympics'}
              </div>
              <div className="w-16 h-[2px] mx-auto" style={{ backgroundColor: accentColor }} />
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight pt-1">
                {config.event_category || 'Quiz Bee'}
              </h1>
              <p className={`text-sm sm:text-base max-w-2xl mx-auto ${mutedText}`}>
                {config.event_subtitle || 'Official Competition Stage'} · Waiting for the host to begin.
              </p>
            </div>

            {activeCategory && (
              <div className="inline-flex items-center space-x-3 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold" style={{ borderColor: accentColor }}>
                <span>Upcoming:</span>
                <span className="font-bold" style={{ color: isDark ? accentColor : primaryColor }}>
                  {activeCategory.name}
                </span>
                <span className={mutedText}>·</span>
                <span className={mutedText}>{activeCategory.default_points} pts / question</span>
                <span className={mutedText}>·</span>
                <span className={mutedText}>{activeCategory.default_timer_seconds}s timer</span>
              </div>
            )}

            <div className="w-full pt-2">
              <div className={`text-[11px] uppercase tracking-[0.2em] font-bold mb-3 ${mutedText}`}>
                Participating {participantLabel}s ({activeTeams.length})
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-4xl mx-auto text-left">
                {activeTeams.map((team, idx) => (
                  <div
                    key={team.id}
                    className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg border ${borderColor} ${cardBg}`}
                  >
                    <span
                      className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {team.seat_number || idx + 1}
                    </span>
                    <span className="font-semibold text-xs sm:text-sm truncate">{team.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATE 2, 3, 4: QUESTION ONLY — READING / ANSWER NOW / TIME UP (Matches Reference Photos 2 & 3) */}
        {(status === 'QUESTION_DISPLAYED' || status === 'TIMER_RUNNING' || status === 'TIMER_EXPIRED') && currentQuestion && (
          <div className="max-w-5xl w-full flex flex-col items-center justify-center text-center animate-fade-in">
            {/* Round Header + Gold Divider + Question Number + Phase/Timer */}
            <div className="space-y-2 mb-6 sm:mb-10 shrink-0">
              <div
                className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight"
                style={{ color: isDark ? '#f5efe6' : primaryColor }}
              >
                {currentQuestion.category?.name || 'Quiz Round'}
              </div>

              <div className="w-16 h-[2px] mx-auto" style={{ backgroundColor: accentColor }} />

              <div className={`text-sm sm:text-base lg:text-lg font-medium pt-0.5 ${mutedText}`}>
                Question {currentQuestion.question_number || 1}
              </div>

              <div className="pt-0.5 min-h-[52px] flex items-center justify-center">
                {status === 'QUESTION_DISPLAYED' && (
                  <div className={`text-base sm:text-lg lg:text-xl font-medium ${mutedText}`}>
                    Reading question · Waiting for Answer Now
                  </div>
                )}

                {status === 'TIMER_RUNNING' && (
                  <TimerDisplay session={session} variant="stage" dark={isDark} />
                )}

                {status === 'TIMER_EXPIRED' && (
                  <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-red-900/10 border border-red-800/30 text-red-800 dark:text-red-300 text-base sm:text-lg font-bold">
                    <span>Time is up · Answers locked</span>
                  </div>
                )}
              </div>
            </div>

            {/* HUGE CRISP QUESTION TEXT ONLY — Auto-scales cleanly inside viewport */}
            <h1
              className="font-bold tracking-tight leading-[1.2] max-w-5xl"
              style={{
                fontSize: currentQuestion.question_text.length > 140
                  ? 'clamp(1.75rem, 3.2vw, 3rem)'
                  : currentQuestion.question_text.length > 80
                    ? 'clamp(2rem, 3.8vw, 3.5rem)'
                    : 'clamp(2.25rem, 4.4vw, 4rem)'
              }}
            >
              {currentQuestion.question_text}
            </h1>

            {/* Optional Image Attachment (constrained so it never overflows) */}
            {currentQuestion.image_url && (
              <div className={`mt-5 rounded-xl overflow-hidden border ${borderColor} max-h-[30vh] shadow-sm bg-white`}>
                <img
                  src={currentQuestion.image_url}
                  alt="Question Figure"
                  className="max-h-[30vh] w-auto object-contain mx-auto"
                />
              </div>
            )}

            {/* Optional Multiple Choice Options */}
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.choices?.length > 0 && (
              <div className="mt-7 grid grid-cols-2 gap-3 w-full max-w-4xl text-left">
                {currentQuestion.choices.map((choice, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center space-x-3 px-5 py-3 rounded-xl border ${borderColor} ${cardBg} shadow-sm`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm text-white shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {letters[idx] || idx + 1}
                    </span>
                    <span className="text-lg sm:text-xl font-semibold truncate">{choice}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATE 5 & 6: OFFICIAL ANSWER REVEAL & ROUND RESULTS MATRIX TABLE — STRICT FIT-TO-SCREEN (Reference Photo 2) */}
        {(status === 'SHOW_RESULTS' || status === 'SHOW_ROUND_RESULTS') && roundMatrix && (
          <div className="max-w-6xl w-full flex flex-col justify-center space-y-3 animate-fade-in">
            <div className="text-center space-y-1 shrink-0">
              <div
                className="text-xs sm:text-sm font-semibold"
                style={{ color: isDark ? '#f5efe6' : primaryColor }}
              >
                {roundMatrix.category.name}
              </div>
              <div className="w-14 h-[2px] mx-auto" style={{ backgroundColor: accentColor }} />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                {roundMatrix.category.name} results
              </h1>

              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                1 = correct, 0 = wrong or no answer. Blank = not revealed or not played. Totals include instructor's decisions.
              </p>
            </div>

            <div className={`w-full border ${borderColor} shadow-sm ${cardBg}`}>
              <table className={`w-full border-collapse tabular-nums ${matrixDensity.text}`}>
                <thead>
                  <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                    <th rowSpan={2} className={`${matrixDensity.headerPy} px-2.5 text-center font-semibold border-r border-white/15 w-12`}>
                      No.
                    </th>
                    <th rowSpan={2} className={`${matrixDensity.headerPy} px-4 text-center font-semibold border-r border-white/15`}>
                      {participantLabel}
                    </th>
                    <th
                      colSpan={roundMatrix.columns.length + 1 + (roundMatrix.showPreviousColumn ? 1 : 0)}
                      className="py-1.5 px-2 text-center font-bold tracking-wide border-b border-white/15"
                    >
                      {roundMatrix.category.name}
                    </th>
                  </tr>
                  <tr className="text-white/95" style={{ backgroundColor: primaryColor }}>
                    {roundMatrix.showPreviousColumn && (
                      <th className="py-1.5 px-2 text-center font-semibold border-r border-white/15">Prev</th>
                    )}
                    {roundMatrix.columns.map(col => {
                      const isCurrentCol = status === 'SHOW_RESULTS' && currentQuestion?.id && col.questionId === currentQuestion.id;
                      return (
                        <th
                          key={col.label}
                          className={`py-1.5 px-1.5 text-center font-semibold border-r border-white/15 ${isCurrentCol ? 'bg-white/20 text-[#f7e3a1] font-extrabold' : ''
                            }`}
                        >
                          {col.label}
                        </th>
                      );
                    })}
                    <th className="py-1.5 px-3 text-center font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-stone-700' : 'divide-[#dfd9d1]'}`}>
                  {roundMatrix.rows.map((row, rowIdx) => (
                    <tr
                      key={row.team_id}
                      className={rowIdx % 2 === 1 ? (isDark ? 'bg-white/[0.03]' : 'bg-[#f8f6f2]') : ''}
                    >
                      <td className={`${matrixDensity.cellPy} px-2.5 text-center border-r ${borderColor} ${mutedText}`}>
                        {row.seat_number}
                      </td>
                      <td className={`${matrixDensity.cellPy} px-4 font-semibold text-left border-r ${borderColor} truncate max-w-[280px]`}>
                        {row.team_name}
                      </td>
                      {roundMatrix.showPreviousColumn && (
                        <td className={`${matrixDensity.cellPy} px-2 text-center border-r ${borderColor} font-semibold ${mutedText}`}>
                          {row.previous_points}
                        </td>
                      )}
                      {row.cells.map((cell, cIdx) => {
                        const isCurrentCol = status === 'SHOW_RESULTS' && currentQuestion?.id && cell.questionId === currentQuestion.id;
                        return (
                          <td
                            key={cIdx}
                            className={`${matrixDensity.cellPy} px-1.5 text-center border-r ${borderColor} ${isCurrentCol
                              ? isDark
                                ? 'bg-amber-500/15 font-extrabold text-white'
                                : 'bg-[#f7efe0] font-extrabold text-[#2b1b1d]'
                              : cell.value === 1
                                ? isDark ? 'text-white font-bold' : 'text-[#2b1b1d] font-bold'
                                : mutedText
                              }`}
                          >
                            {cell.value === null ? '' : cell.value}
                          </td>
                        );
                      })}
                      <td className={`${matrixDensity.cellPy} px-3 text-center font-extrabold`}>
                        {row.total_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className={`text-center text-[11px] sm:text-xs shrink-0 ${mutedText}`}>
              {roundMatrix.isRoundComplete
                ? `${roundMatrix.category.name} complete. ${config.round_complete_note || 'Results are locked while the host prepares the next round.'}`
                : `${roundMatrix.category.name} in progress (${roundMatrix.revealedCount} of ${roundMatrix.totalConfiguredQuestions} questions revealed). Totals include instructor's decisions.`}
            </p>
          </div>
        )}

        {/* STATE 7: OVERALL LEADERBOARD / STANDINGS — STRICT FIT-TO-SCREEN */}
        {status === 'SHOW_LEADERBOARD' && (
          <div className="max-w-6xl w-full flex flex-col justify-center space-y-3 animate-fade-in">
            <div className="text-center space-y-1 shrink-0">
              <div className="text-xs sm:text-sm font-semibold" style={{ color: isDark ? '#f5efe6' : primaryColor }}>
                {config.event_name || 'IT Skills Olympics'}
              </div>
              <div className="w-14 h-[2px] mx-auto" style={{ backgroundColor: accentColor }} />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Overall Leaderboard
              </h1>
              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                Cumulative standings across all rounds. Totals include instructor's decisions.
              </p>
            </div>

            <div className={`w-full border ${borderColor} shadow-sm ${cardBg}`}>
              <table className={`w-full border-collapse tabular-nums ${leaderboardDensity.text}`}>
                <thead>
                  <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                    <th className={`${leaderboardDensity.headerPy} px-3 text-center font-semibold border-r border-white/15 w-16`}>Rank</th>
                    <th className={`${leaderboardDensity.headerPy} px-2.5 text-center font-semibold border-r border-white/15 w-12`}>No.</th>
                    <th className={`${leaderboardDensity.headerPy} px-4 text-left font-semibold border-r border-white/15`}>{participantLabel}</th>
                    {categories.map(cat => (
                      <th key={cat.id} className={`${leaderboardDensity.headerPy} px-2.5 text-center font-semibold border-r border-white/15 whitespace-nowrap`}>
                        {cat.name.replace(/\s*Round$/i, '')}
                      </th>
                    ))}
                    <th className={`${leaderboardDensity.headerPy} px-4 text-center font-bold`}>Total</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-stone-700' : 'divide-[#dfd9d1]'}`}>
                  {leaderboard.map((row, idx) => (
                    <tr
                      key={row.team_id}
                      className={
                        row.rank === 1
                          ? isDark ? 'bg-amber-500/15' : 'bg-[#f4ebd4]'
                          : idx % 2 === 1
                            ? isDark ? 'bg-white/[0.03]' : 'bg-[#f8f6f2]'
                            : ''
                      }
                    >
                      <td className={`${leaderboardDensity.cellPy} px-3 text-center font-extrabold border-r ${borderColor}`}>
                        {row.rank === 1 ? '1st' : row.rank === 2 ? '2nd' : row.rank === 3 ? '3rd' : row.rank}
                      </td>
                      <td className={`${leaderboardDensity.cellPy} px-2.5 text-center border-r ${borderColor} ${mutedText}`}>
                        {row.seat_number}
                      </td>
                      <td className={`${leaderboardDensity.cellPy} px-4 font-bold text-left border-r ${borderColor} truncate max-w-[300px]`}>
                        {row.team_name}
                      </td>
                      {categories.map(cat => (
                        <td key={cat.id} className={`${leaderboardDensity.cellPy} px-2.5 text-center border-r ${borderColor}`}>
                          {row.round_totals?.[cat.id] ?? 0}
                        </td>
                      ))}
                      <td
                        className={`${leaderboardDensity.cellPy} px-4 text-center font-black`}
                        style={row.rank <= 3 && !isDark ? { color: primaryColor } : undefined}
                      >
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

      {/* Subtle Bottom-Right Projector Utility Controls (Clean — No Admin Link) */}
      <div className="fixed bottom-3 right-4 z-30 flex items-center space-x-2">
        <button
          onClick={toggleSound}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-all opacity-75 hover:opacity-100 ${isDark
            ? 'bg-stone-900/80 border-stone-700 text-stone-300 hover:bg-stone-800'
            : 'bg-white/85 border-[#d6cfc7] text-[#5e5153] hover:bg-white'
            }`}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundOn ? 'Sound on' : 'Muted'}</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-all opacity-75 hover:opacity-100 ${isDark
            ? 'bg-stone-900/80 border-stone-700 text-stone-300 hover:bg-stone-800'
            : 'bg-white/85 border-[#d6cfc7] text-[#5e5153] hover:bg-white'
            }`}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </button>
      </div>
    </div>
  );
}
