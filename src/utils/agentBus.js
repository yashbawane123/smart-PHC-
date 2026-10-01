class AgentBus {
  constructor() {
    this.listeners = new Set();
    this.history = [];
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(agentName, message, metadata = {}) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const eventPayload = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      agentName, // 'Document Agent' | 'Extraction Agent' | 'Timeline Agent' | 'Appointment Agent' | 'Follow-up Agent' | 'Summary Agent' | 'Human Override'
      message,
      metadata
    };

    this.history.push(eventPayload);
    if (this.history.length > 30) {
      this.history.shift();
    }

    this.listeners.forEach(fn => fn(eventPayload));
  }

  getHistory() {
    return [...this.history];
  }
}

export const agentBus = new AgentBus();
