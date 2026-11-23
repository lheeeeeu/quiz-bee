import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.serverTimeOffset = 0; // serverTime - localTime
    this.listeners = new Set();
  }

  connect() {
    if (this.socket) return this.socket;

    // Use current origin in dev (proxied to 3001) or explicit port
    const socketUrl = window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin;
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Quiz Bee Real-Time Server, ID:', this.socket.id);
      this.syncServerTime();
    });

    this.socket.on('disconnect', () => {
      console.warn('⚠️ Disconnected from server');
    });

    // Notify registered UI state listeners
    this.socket.on('game_state_update', (state) => {
      if (state.serverTime) {
        this.serverTimeOffset = state.serverTime - Date.now();
      }
      this.notifyListeners('state_update', state);
    });

    this.socket.on('timer_started', (data) => {
      if (data.serverTime) {
        this.serverTimeOffset = data.serverTime - Date.now();
      }
      this.notifyListeners('timer_started', data);
    });

    this.socket.on('timer_expired', (data) => {
      this.notifyListeners('timer_expired', data);
    });

    this.socket.on('answer_updated', (data) => {
      this.notifyListeners('answer_updated', data);
    });

    this.socket.on('team_presence_changed', (data) => {
      this.notifyListeners('team_presence', data);
    });

    return this.socket;
  }

  async syncServerTime() {
    try {
      const start = Date.now();
      const res = await fetch('/api/time');
      if (res.ok) {
        const data = await res.json();
        const roundTrip = Date.now() - start;
        const estimatedServerNow = data.serverTime + (roundTrip / 2);
        this.serverTimeOffset = estimatedServerNow - Date.now();
      }
    } catch (e) {
      console.warn('Could not sync server time:', e);
    }
  }

  getServerNow() {
    return Date.now() + this.serverTimeOffset;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, payload) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload);
      } catch (e) {
        console.error('Error in socket listener:', e);
      }
    }
  }

  // Host Actions
  hostAction(type, payload = {}) {
    if (this.socket) {
      this.socket.emit('host_action', { type, ...payload });
    }
  }

  // Team Actions
  identifyTeam(teamId) {
    if (this.socket) {
      this.socket.emit('team_identify', { teamId });
    }
  }

  logoutTeam() {
    if (this.socket) {
      this.socket.emit('team_logout');
    }
  }

  draftAnswer(teamId, questionId, answerText) {
    if (this.socket) {
      this.socket.emit('team_draft_answer', { teamId, questionId, answerText });
    }
  }
}

export const socketService = new SocketService();
