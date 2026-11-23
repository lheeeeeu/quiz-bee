import React from 'react';
import { Volume2, VolumeX, Monitor, Shield, Users, LogOut } from 'lucide-react';
import { sound } from '../../services/sound';

export function Header({ currentView, setCurrentView, state, isConnected, isAdminAuthed, onAdminLogout }) {
  const [soundOn, setSoundOn] = React.useState(sound.enabled);

  const toggleSound = () => {
    const newState = sound.toggleSound();
    setSoundOn(newState);
  };

  const config = state?.config;
  const primaryColor = config?.primary_color || '#3e1b20';
  const accentColor = config?.accent_color || '#b89b4a';
  const status = state?.session?.status || 'IDLE';
  const isAdminView = currentView === 'admin' && isAdminAuthed;

  const getStatusBadge = () => {
    switch (status) {
      case 'QUESTION_DISPLAYED':
        return <span className="bg-white/15 text-amber-200 border border-amber-300/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Reading Question</span>;
      case 'TIMER_RUNNING':
        return <span className="bg-amber-400 text-[#2b1b1d] px-2.5 py-0.5 rounded-full text-[11px] font-bold animate-pulse">Answer Now (Live)</span>;
      case 'TIMER_EXPIRED':
        return <span className="bg-red-500/25 text-red-200 border border-red-400/40 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Time Up · Locked</span>;
      case 'SHOW_RESULTS':
        return <span className="bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Answer Revealed</span>;
      case 'SHOW_ROUND_RESULTS':
        return <span className="bg-amber-300/25 text-amber-100 border border-amber-300/40 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Round Results Matrix</span>;
      case 'SHOW_LEADERBOARD':
        return <span className="bg-purple-400/25 text-purple-100 border border-purple-300/40 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">Overall Leaderboard</span>;
      default:
        return <span className="bg-white/10 text-white/75 border border-white/15 px-2.5 py-0.5 rounded-full text-[11px] font-medium">Standby</span>;
    }
  };

  return (
    <header
      className="sticky top-0 z-50 px-4 lg:px-8 py-3 text-white shadow-md"
      style={{ backgroundColor: primaryColor, borderBottom: `2px solid ${accentColor}` }}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-black shadow-inner border border-white/20"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: accentColor }}
          >
            QB
          </div>
          <div>
            <h1 className="font-bold text-sm lg:text-base tracking-tight text-white">
              {config?.event_name || 'IT Skills Olympics'}
              {config?.event_category ? (
                <span className="font-normal text-white/70"> / {config.event_category}</span>
              ) : null}
            </h1>
            <div className="flex items-center space-x-2 text-[11px] text-white/75 mt-0.5">
              <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span>{isConnected ? 'Live Synced' : 'Reconnecting...'}</span>
              <span>·</span>
              {getStatusBadge()}
            </div>
          </div>
        </div>

        {/* Navigation: ONLY shown inside authenticated Admin Portal (Contestants stay strictly isolated!) */}
        {isAdminView ? (
          <nav className="flex items-center bg-black/25 p-1 rounded-xl border border-white/10 text-xs sm:text-sm font-semibold">
            <button
              onClick={() => window.open('/display', '_blank')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
            >
              <Monitor className="w-4 h-4" />
              <span className="hidden sm:inline">Projector ↗</span>
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white text-[#2b1b1d] shadow-sm font-bold"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>

            <button
              onClick={() => window.open('/contestant', '_blank')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Contestant Login ↗</span>
            </button>
          </nav>
        ) : (
          <div className="text-xs font-bold uppercase tracking-widest text-white/80 px-3 py-1 rounded-full bg-white/10 border border-white/15">
            Contestant Portal
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute Sounds' : 'Unmute Sounds'}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              soundOn
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                : 'bg-black/20 border-white/10 text-white/50 hover:text-white/80'
            }`}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{soundOn ? 'Sound on' : 'Muted'}</span>
          </button>

          {isAdminView && onAdminLogout && (
            <button
              onClick={onAdminLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-black/25 hover:bg-black/40 border border-white/15 text-xs font-semibold text-white/90 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
