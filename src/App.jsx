import React, { useState, useEffect } from 'react';
import { Shield, Users, Monitor, Lock, ArrowRight } from 'lucide-react';
import { socketService } from './services/socket';
import { apiUrl } from './services/api';
import { Header } from './components/common/Header';
import { HostDashboard } from './components/admin/HostDashboard';
import { MainDisplayScreen } from './components/display/MainDisplayScreen';
import { TeamPortal } from './components/team/TeamPortal';

function resolveRouteFromLocation() {
  const pathname = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.replace('#', '').toLowerCase();

  if (pathname === '/admin' || params.get('view') === 'admin' || hash === 'admin') return 'admin';
  if (pathname === '/display' || pathname === '/projector' || params.get('view') === 'display' || hash === 'display') return 'display';
  if (pathname === '/contestant' || pathname === '/team' || params.get('view') === 'team' || params.get('team') || hash === 'team') return 'team';
  return 'home';
}

export function App() {
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentView, setCurrentView] = useState(() => resolveRouteFromLocation());
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => sessionStorage.getItem('quizbee_admin_authed') === '1');

  useEffect(() => {
    const onPopState = () => setCurrentView(resolveRouteFromLocation());
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  useEffect(() => {
    const socket = socketService.connect();
    if (socket.connected) setIsConnected(true);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    const unsubscribe = socketService.subscribe((event, data) => {
      if (event === 'state_update') {
        setGameState(data);
      }
    });

    fetch(apiUrl('/api/state'))
      .then(res => res.json())
      .then(data => setGameState(data))
      .catch(err => console.warn('REST snapshot fallback warning:', err));

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const cfg = gameState?.config;
    if (cfg?.event_name) {
      document.title = cfg.event_category
        ? `${cfg.event_name} / ${cfg.event_category}`
        : cfg.event_name;
    }
  }, [gameState?.config?.event_name, gameState?.config?.event_category]);

  const navigate = (view) => {
    const pathMap = {
      home: '/',
      admin: '/admin',
      display: '/display',
      team: '/contestant'
    };
    const nextPath = pathMap[view] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setCurrentView(view);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('quizbee_admin_authed');
    setIsAdminAuthed(false);
    navigate('admin');
  };

  // Dedicated full-bleed Projector Display (/display)
  if (currentView === 'display') {
    return (
      <MainDisplayScreen
        state={gameState}
        isConnected={isConnected}
      />
    );
  }

  // Dedicated Portal Selector Landing (/)
  if (currentView === 'home') {
    return (
      <PortalLandingPage
        config={gameState?.config || {}}
        isConnected={isConnected}
        onNavigate={navigate}
      />
    );
  }

  // Dedicated Admin Login Gate (/admin when not signed in)
  if (currentView === 'admin' && !isAdminAuthed) {
    return (
      <AdminLoginPage
        config={gameState?.config || {}}
        onSuccess={() => {
          sessionStorage.setItem('quizbee_admin_authed', '1');
          setIsAdminAuthed(true);
        }}
        onBackHome={() => navigate('home')}
      />
    );
  }

  return (
    <div className={`${currentView === 'team' ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-[#f6f4ef] text-[#2b1b1d] flex flex-col`}>
      <Header
        currentView={currentView}
        setCurrentView={navigate}
        state={gameState}
        isConnected={isConnected}
        isAdminAuthed={isAdminAuthed}
        onAdminLogout={handleAdminLogout}
      />

      <main className={`flex-1 ${currentView === 'team' ? 'min-h-0 overflow-hidden' : ''}`}>
        {currentView === 'admin' && <HostDashboard state={gameState} onSwitchView={navigate} />}
        {currentView === 'team' && <TeamPortal state={gameState} />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------
   PORTAL LANDING PAGE (/) — CLEAN SEPARATE ENTRY POINTS
   ------------------------------------------------------------ */
function PortalLandingPage({ config, isConnected, onNavigate }) {
  const primaryColor = config.primary_color || '#3e1b20';
  const accentColor = config.accent_color || '#b89b4a';

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#2b1b1d] flex flex-col">
      <div
        className="w-full px-6 py-3 flex items-center justify-between text-white shadow-sm"
        style={{ backgroundColor: primaryColor, borderBottom: `2px solid ${accentColor}` }}
      >
        <div className="font-bold text-sm">
          {config.event_name || 'IT Skills Olympics'}
          {config.event_category ? <span className="font-normal text-white/75"> / {config.event_category}</span> : null}
        </div>
        <div className="flex items-center space-x-2 text-xs text-white/80">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span>{isConnected ? 'Live Server Online' : 'Connecting...'}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8 text-center">
          <div className="space-y-2">
            <div className="text-sm font-bold" style={{ color: primaryColor }}>
              {config.event_name || 'IT Skills Olympics'}
            </div>
            <div className="w-16 h-[2px] mx-auto" style={{ backgroundColor: accentColor }} />
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight pt-1">
              {config.event_category || 'Quiz Bee'} Portal
            </h1>
            <p className="text-sm text-[#6e6062] max-w-xl mx-auto">
              Select your designated portal below. Contestant groups sign in using the unique access code generated by the admin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
            <button
              onClick={() => onNavigate('team')}
              className="bg-white hover:bg-[#faf8f5] border-2 border-[#ddd6cd] hover:border-[#3e1b20] rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-extrabold text-[#2b1b1d]">Contestant / Group Login</h2>
                <p className="text-xs text-[#6e6062] leading-relaxed">
                  For participating schools and groups. Sign in with the access code provided by the host.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-[#ece6de]" style={{ color: primaryColor }}>
                <span>/contestant</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => onNavigate('admin')}
              className="bg-white hover:bg-[#faf8f5] border-2 border-[#ddd6cd] hover:border-[#b89b4a] rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-[#b89b4a]">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-extrabold text-[#2b1b1d]">Admin / Host Login</h2>
                <p className="text-xs text-[#6e6062] leading-relaxed">
                  Protected control room to manage rounds, questions, group access codes, judging, and projector flashing.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-[#ece6de] text-[#8f742b]">
                <span>/admin</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button
              onClick={() => onNavigate('display')}
              className="bg-white hover:bg-[#faf8f5] border-2 border-[#ddd6cd] hover:border-[#2b1b1d] rounded-2xl p-6 shadow-sm transition-all flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white bg-[#2b1b1d]">
                  <Monitor className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-extrabold text-[#2b1b1d]">Projector Display</h2>
                <p className="text-xs text-[#6e6062] leading-relaxed">
                  Clean fit-to-screen auditorium projection for questions, live countdown, round results, and leaderboard.
                </p>
              </div>
              <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-[#ece6de] text-[#2b1b1d]">
                <span>/display</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   DEDICATED ADMIN LOGIN PAGE (/admin)
   ------------------------------------------------------------ */
function AdminLoginPage({ config, onSuccess, onBackHome }) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const primaryColor = config.primary_color || '#3e1b20';
  const accentColor = config.accent_color || '#b89b4a';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/admin-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid Admin Passcode.');
      } else {
        onSuccess();
      }
    } catch {
      setError('Unable to reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#2b1b1d] flex flex-col">
      <div
        className="w-full px-6 py-3 flex items-center justify-between text-white shadow-sm"
        style={{ backgroundColor: primaryColor, borderBottom: `2px solid ${accentColor}` }}
      >
        <div className="font-bold text-sm">
          {config.event_name || 'IT Skills Olympics'} / Admin Portal
        </div>
        <button
          onClick={onBackHome}
          className="text-xs font-semibold text-white/80 hover:text-white"
        >
          ← Portal Home
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#ddd6cd] rounded-2xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white mx-auto"
              style={{ backgroundColor: primaryColor }}
            >
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#2b1b1d]">Admin / Host Sign In</h1>
            <p className="text-xs text-[#6e6062]">
              Enter the administrator passcode (configured in <code className="font-mono bg-[#f3efe9] px-1 rounded">.env</code>) to access the Host Dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#5c4f51] mb-1.5">
                Admin Passcode
              </label>
              <input
                type="password"
                autoFocus
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter admin passcode..."
                className="w-full bg-[#faf8f5] border border-[#d6cfc7] rounded-xl px-4 py-3 text-center text-base font-mono font-bold tracking-widest focus:outline-none focus:border-[#3e1b20]"
              />
            </div>

            {error && (
              <div className="text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: primaryColor }}
              className="w-full py-3 rounded-xl text-white font-bold text-sm shadow-sm hover:opacity-95 disabled:opacity-50 transition-all"
            >
              {loading ? 'Verifying...' : 'Sign In to Admin Portal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
