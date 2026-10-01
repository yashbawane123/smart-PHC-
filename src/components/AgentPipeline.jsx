import React, { useState, useEffect, useRef } from 'react';
import { agentBus } from '../utils/agentBus';
import { 
  FileText, Search, Clock, Calendar, Bell, ClipboardCheck, 
  CheckCircle, Loader2, UserCheck, Terminal, ChevronDown, ChevronUp
} from 'lucide-react';

const AGENT_NODES = [
  { id: 'doc', keyName: 'Document Agent', icon: FileText, title: 'Document Agent', desc: 'Receives reports, prescriptions & notes' },
  { id: 'extract', keyName: 'Extraction Agent', icon: Search, title: 'Extraction Agent', desc: 'Pulls facts & separates assumptions (AI)' },
  { id: 'timeline', keyName: 'Timeline Agent', icon: Clock, title: 'Timeline Agent', desc: 'Builds chronological patient history' },
  { id: 'appointment', keyName: 'Appointment Agent', icon: Calendar, title: 'Appointment Agent', desc: 'Checks upcoming visits & missing docs' },
  { id: 'followup', keyName: 'Follow-up Agent', icon: Bell, title: 'Follow-up Agent', desc: 'Tracks reminders & due dates' },
  { id: 'summary', keyName: 'Summary Agent', icon: ClipboardCheck, title: 'Summary Agent', desc: 'Creates doctor briefing (human-verified)' }
];

export default function AgentPipeline({ compact = false }) {
  const [nodeStates, setNodeStates] = useState({
    doc: 'done',
    extract: 'done',
    timeline: 'done',
    appointment: 'done',
    followup: 'done',
    summary: 'done'
  });

  const [logs, setLogs] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logContainerRef = useRef(null);

  useEffect(() => {
    // Load history
    setLogs(agentBus.getHistory());

    const unsubscribe = agentBus.subscribe((evt) => {
      setLogs(prev => [...prev.slice(-29), evt]);

      // Update node state animation based on incoming agent event
      const agentKeyMap = {
        'Document Agent': 'doc',
        'Extraction Agent': 'extract',
        'Timeline Agent': 'timeline',
        'Appointment Agent': 'appointment',
        'Follow-up Agent': 'followup',
        'Summary Agent': 'summary'
      };

      const nodeId = agentKeyMap[evt.agentName];
      if (nodeId) {
        if (evt.message.toLowerCase().includes('started') || evt.message.toLowerCase().includes('calling') || evt.message.toLowerCase().includes('received')) {
          setNodeStates(prev => ({ ...prev, [nodeId]: 'active' }));
        } else {
          setNodeStates(prev => ({ ...prev, [nodeId]: 'done' }));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Compact Mode (for DoctorBriefing header)
  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg)', padding: '6px 14px', borderRadius: '12px', border: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          Contributing Agents:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {AGENT_NODES.map((node) => {
            const IconComponent = node.icon;
            return (
              <div
                key={node.id}
                title={`${node.title}: ${node.desc}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--color-surface)',
                  padding: '3px 8px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--color-text-main)'
                }}
              >
                <IconComponent size={13} color="var(--color-primary)" />
                <span>{node.title.split(' ')[0]}</span>
                <CheckCircle size={11} color="var(--color-safe)" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '20px 24px', border: '2px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            🤖
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Care Navigation Agent — Live Pipeline</span>
              <span style={{ background: 'var(--color-safe-bg)', color: 'var(--color-safe-dark)', fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>
                6 Active Nodes
              </span>
            </h3>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
              Real-time multi-agent orchestration stream & event console
            </p>
          </div>
        </div>

        <button type="button" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
          {isCollapsed ? <ChevronDown size={22} /> : <ChevronUp size={22} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Horizontal / Vertical Pipeline Stream */}
          <div className="pipeline-node-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', position: 'relative', paddingTop: '10px' }}>
            {AGENT_NODES.map((node, index) => {
              const IconComp = node.icon;
              const state = nodeStates[node.id] || 'done';
              const isActive = state === 'active';
              const isDone = state === 'done';

              return (
                <div
                  key={node.id}
                  style={{
                    background: isActive ? 'var(--color-primary-light)' : isDone ? '#ECFDF5' : 'var(--color-bg)',
                    border: isActive ? '2px solid var(--color-primary)' : isDone ? '2px solid #A7F3D0' : '1.5px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '6px',
                    position: 'relative',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isActive ? '0 0 15px rgba(2, 132, 199, 0.3)' : 'none'
                  }}
                >
                  {/* Node Icon */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: isActive ? 'var(--color-primary)' : isDone ? 'var(--color-safe)' : '#94A3B8',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {isActive ? (
                      <Loader2 size={20} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <IconComp size={20} />
                    )}
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 900, color: isActive ? 'var(--color-primary-dark)' : isDone ? 'var(--color-safe-dark)' : 'var(--color-text-main)', lineHeight: 1.2 }}>
                      {node.title}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '2px', lineHeight: 1.2 }}>
                      {node.desc}
                    </div>
                  </div>

                  {/* Node Status Badge */}
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '999px',
                      marginTop: '2px',
                      background: isActive ? 'var(--color-primary)' : isDone ? 'var(--color-safe)' : '#CBD5E1',
                      color: 'white'
                    }}
                  >
                    {isActive ? 'working...' : isDone ? '✓ ready' : 'idle'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Agent Console Log Panel */}
          <div style={{ background: '#0F172A', borderRadius: '16px', padding: '14px 18px', border: '1px solid #334155', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '12px', fontWeight: 800, fontFamily: 'monospace' }}>
                <Terminal size={14} color="#38BDF8" />
                <span>LIVE AGENT EVENT LOG CONSOLE</span>
              </div>
              <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>Auto-scrolling (Last 30)</span>
            </div>

            <div
              ref={logContainerRef}
              style={{
                maxHeight: '140px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '12px',
                lineHeight: 1.4
              }}
            >
              {logs.length === 0 ? (
                <div style={{ color: '#64748B', fontStyle: 'italic' }}>Waiting for agent events...</div>
              ) : (
                logs.map(log => {
                  const isHumanOverride = log.agentName === 'Human Override';
                  const isAssumption = log.message.toLowerCase().includes('assumption') || (log.metadata && log.metadata.isAssumption);
                  const isError = log.message.toLowerCase().includes('error') || log.message.toLowerCase().includes('failed');

                  const color = isHumanOverride ? '#34D399' : isAssumption ? '#FCD34D' : isError ? '#F87171' : '#38BDF8';

                  return (
                    <div key={log.id} style={{ color, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: '#64748B', flexShrink: 0 }}>{log.timestamp}</span>
                      <strong style={{ color: isHumanOverride ? '#34D399' : isAssumption ? '#F59E0B' : '#60A5FA', flexShrink: 0 }}>
                        [{log.agentName}]
                      </strong>
                      <span style={{ fontWeight: isHumanOverride ? 800 : 500 }}>
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Responsive media styling for pipeline grid */}
      <style>{`
        @media (max-width: 900px) {
          .pipeline-node-container {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
