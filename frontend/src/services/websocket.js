/**
 * Thin WebSocket wrapper.
 *
 * Problems in the previous version:
 *  - subscribers were stored in an array and never cleared, so every "Start monitoring"
 *    click added another listener -> duplicated chart points, duplicated alerts, and the
 *    "stop" action still received messages.
 *  - JSON.parse() could throw inside onmessage and silently kill the handler.
 *  - no status reporting, so the UI had no idea whether it was connected, and no
 *    reconnect after a dropped connection.
 */
class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.status = 'idle'; // idle | connecting | open | closed | error
    this.url = null;
    this.manualClose = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
  }

  setStatus(status, detail = null) {
    this.status = status;
    this.statusListeners.forEach((fn) => {
      try {
        fn(status, detail);
      } catch (err) {
        console.error('[ws] status listener failed', err);
      }
    });
  }

  getStatus() {
    return this.status;
  }

  /** Subscribe to connection-status changes. Returns an unsubscribe function. */
  onStatus(listener) {
    this.statusListeners.add(listener);
    listener(this.status, null);
    return () => this.statusListeners.delete(listener);
  }

  connect(url) {
    if (this.ws && this.url === url && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // already connected to the same stream
    }

    this.closeSocket(true);
    this.clearReconnectTimer();

    this.url = url;
    this.manualClose = false;
    this.setStatus('connecting');

    let socket;
    try {
      socket = new WebSocket(url);
    } catch (err) {
      console.error('[ws] could not create socket', err);
      this.setStatus('error', err);
      return;
    }

    this.ws = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('open');
    };

    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.warn('[ws] ignored non-JSON message', event.data);
        return;
      }

      this.listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.error('[ws] listener failed', err);
        }
      });
    };

    socket.onerror = () => {
      // Browsers hide error details; onclose carries the useful signal.
      this.setStatus('error');
    };

    socket.onclose = (event) => {
      const wasManual = this.manualClose;
      this.ws = null;

      if (wasManual) {
        this.setStatus('idle');
        return;
      }

      this.setStatus('closed', event);

      // Don't reconnect if the stream finished normally (server closed after the last step).
      const cleanFinish = event?.code === 1000;
      if (!cleanFinish && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts += 1;
        const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 8000);
        this.reconnectTimer = setTimeout(() => {
          if (this.url) this.connect(this.url);
        }, delay);
      }
    };
  }

  /** Subscribe to data frames. Returns an unsubscribe function. */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  unsubscribe(listener) {
    this.listeners.delete(listener);
  }

  isConnected() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  send(payload) {
    if (!this.isConnected()) return false;
    this.ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    return true;
  }

  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  closeSocket(silent = false) {
    if (!this.ws) return;
    this.manualClose = true;
    try {
      this.ws.close(1000, 'client closed');
    } catch {
      /* ignore */
    }
    this.ws = null;
    if (!silent) this.setStatus('idle');
  }

  /** Full teardown — used by "Pause"/"Reset" and on page unmount. */
  disconnect({ clearListeners = false } = {}) {
    this.clearReconnectTimer();
    this.manualClose = true;
    this.reconnectAttempts = 0;

    if (this.ws) {
      try {
        this.ws.close(1000, 'client closed');
      } catch {
        /* ignore */
      }
      this.ws = null;
    }

    if (clearListeners) {
      this.listeners.clear();
    }

    this.url = null;
    this.setStatus('idle');
  }

  reset() {
    this.disconnect({ clearListeners: true });
  }
}

const websocketService = new WebSocketService();
export default websocketService;
