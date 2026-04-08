/**
 * @module websocket-client
 * @spec: websocket-real-time-stream
 * 
 * WebSocket client for real-time updates from system/simulation streams.
 */

class WebSocketClient {
  constructor(baseUrl = window.location.origin) {
    this.baseUrl = baseUrl.replace(/^http/, 'ws');
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(path) {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.baseUrl}${path}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log(`[WS] Connected to ${path}`);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const type = data.type || 'message';
            
            // Emit to all listeners for this type
            if (this.listeners.has(type)) {
              this.listeners.get(type).forEach(cb => cb(data));
            }
          } catch (err) {
            console.error('[WS] Parse error:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[WS] Error:', err);
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('[WS] Disconnected');
          this.attemptReconnect(path);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  attemptReconnect(path) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;
      console.log(`[WS] Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(path), delay);
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(callback);
  }

  off(type, callback) {
    if (this.listeners.has(type)) {
      const callbacks = this.listeners.get(type);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] WebSocket not connected');
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default WebSocketClient;
