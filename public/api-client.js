/**
 * @module api-client
 * @spec: rest-api-wrapper
 * 
 * REST API client for communicating with backend workers.
 */

class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.sessionId = this.getOrCreateSessionId();
  }

  getOrCreateSessionId() {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  async request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': this.sessionId,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`[ApiClient] ${method} ${path}:`, err);
      throw err;
    }
  }

  // Memory endpoints
  async getMemory(id) {
    return this.request('GET', `/memory/${id}`);
  }

  async listMemory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/memory?${query}`);
  }

  async createMemory(data) {
    return this.request('POST', '/memory', data);
  }

  async updateMemory(id, data) {
    return this.request('PUT', `/memory/${id}`, data);
  }

  async deleteMemory(id) {
    return this.request('DELETE', `/memory/${id}`);
  }

  async getMemoryCategories() {
    return this.request('GET', '/memory/categories');
  }

  // Tools endpoints
  async listTools() {
    return this.request('GET', '/tools');
  }

  async executeTool(name, input) {
    return this.request('POST', '/tools/execute', { toolName: name, input });
  }

  async validateTool(name, input) {
    return this.request('POST', '/tools/validate', { toolName: name, input });
  }

  async getToolSchema(name) {
    return this.request('GET', `/tools/${name}/schema`);
  }

  async getToolLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/tools/logs?${query}`);
  }

  // Specs endpoints
  async listSpecs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/specs?${query}`);
  }

  async getSpec(slug) {
    return this.request('GET', `/specs/${slug}`);
  }

  async searchSpecs(query) {
    const params = new URLSearchParams({ q: query }).toString();
    return this.request('GET', `/specs/search?${params}`);
  }

  async getSpecVersions(slug) {
    return this.request('GET', `/specs/${slug}/versions`);
  }

  // Simulation endpoints
  async initSimulation(mode, config) {
    return this.request('POST', '/simulation/init', { mode, config });
  }

  async stepSimulation(simulationId) {
    return this.request('POST', '/simulation/step', { simulationId });
  }

  async getSimulationState(id) {
    const query = new URLSearchParams({ id }).toString();
    return this.request('GET', `/simulation/state?${query}`);
  }

  async getSimulationHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/simulation/history?${query}`);
  }

  // System endpoints
  async getHealth() {
    return this.request('GET', '/system/health');
  }

  async getStatus() {
    return this.request('GET', '/system/status');
  }

  async getMetrics(window = '5min') {
    const query = new URLSearchParams({ window }).toString();
    return this.request('GET', `/system/metrics?${query}`);
  }

  async getEvents(limit = 50) {
    const query = new URLSearchParams({ limit }).toString();
    return this.request('GET', `/system/events?${query}`);
  }
}

export default new ApiClient();
