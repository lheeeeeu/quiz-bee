import { io } from 'socket.io-client';
import { apiUrl, getSocketBaseUrl, IS_API_CONFIGURED, API_CONFIG_ERROR } from './api';

class SocketService {
  constructor() {
    this.socket = null;
    this.serverTimeOffset = 0; // serverTime - localTime
    this.listeners = new Set();
  }

  connect() {
    if (this.socket) return this.socket;

    if (!IS_API_CONFIGURED) {
      console.error('[Socket] Skipping WebSocket connection:', API_CONFIG_ERROR);
      this.notifyListeners('connection_error', { message: API_CONFIG_ERROR });
      return null;
    }

    const socketUrl = getSocketBaseUrl();
    if (!socketUrl) return null;

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 25000
    });

    this.socket.on('connect', () => {
      console.log('⚡ Connected to Quiz Bee Real-Time Server:', socketUrl, 'ID:', this.socket.id);
      this.syncServerTime();
      this.notifyListeners('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ Disconnected from server:', reason);
      this.notifyListeners('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️ WebSocket connection error:', err.message);
      this.notifyListeners('connection_error', { message: err.message });
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnecting to server (attempt ${attempt})...`);
    });

    this.socket.io.on('reconnect', () => {
      console.log('✅ Reconnected to Quiz Bee Real-Time Server');
      this.syncServerTime();
    });

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
    if (!IS_API_CONFIGURED) return;
    try {
      const start = Date.now();
      const res = await fetch(apiUrl('/api/time'));
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
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
