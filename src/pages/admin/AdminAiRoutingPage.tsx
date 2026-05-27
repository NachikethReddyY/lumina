import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Cpu } from 'lucide-react';
import Container from '../../components/Container';
import DashboardLayout from '../../components/DashboardLayout';
import { notificationsApi, type ApiAiDecision } from '../../utils/apiClient';
import { AdminPageHeader, AdminPageShell, PRIORITY_COLOR, luminaVoice } from './dashboardShared';
import '../Dashboard.css';
import '../SuperAdminDashboard.css';

export function AdminAiRoutingPage() {
  const [aiDecisions, setAiDecisions] = useState<ApiAiDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await notificationsApi.aiDecisions();
        const body = await res.json();
        if (!cancelled) setAiDecisions(Array.isArray(body) ? body : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <DashboardLayout><div className="dashboard-content" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <AdminPageShell>
        <Container maxWidth="xl">
          <AdminPageHeader
            title="AI Decisions"
            subtitle="Every ticket routing decision made by Lumina AI or the rule engine — transparent and traceable."
          />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="ai-panel-header">
              <Cpu size={18} className="ai-panel-icon" />
              <div>
                <h2 className="ai-panel-title">Routing log</h2>
                <p className="ai-panel-sub">{aiDecisions.length} decisions on record</p>
              </div>
            </div>

            {aiDecisions.length === 0 ? (
              <div className="empty-state">
                <h3>No routing decisions yet</h3>
                <p>Decisions appear here as tickets are created and routed.</p>
              </div>
            ) : (
              <div className="ai-decisions-list">
                {aiDecisions.map((d) => {
                  const routing = d.routing;
                  const isLuminaAi = routing?.source === 'gemini' || routing?.source === 'lumina_ai';
                  const isFallback = routing?.source === 'rules_fallback';
                  const isExpanded = expandedDecision === d.id;
                  const assigneeRole = d.assigned_to_job_title?.trim()
                    || routing?.decision?.assignee_job_title?.trim()
                    || '';
                  const assignedName = d.assigned_to_name || (routing?.assigned_admin_id ? 'assignment unavailable' : 'unassigned');
                  const assignedLabel = assigneeRole && assignedName !== 'unassigned' && assignedName !== 'assignment unavailable'
                    ? `${assignedName} · ${assigneeRole}`
                    : assignedName;
                  return (
                    <div key={d.id} className={`ai-decision-card ${isLuminaAi ? 'lumina' : isFallback ? 'fallback' : 'rules'}`}>
                      <div className="ai-decision-top" onClick={() => setExpandedDecision(isExpanded ? null : d.id)}>
                        <div className="ai-decision-left">
                          <span className={`ai-source-badge ${isLuminaAi ? 'lumina' : isFallback ? 'fallback' : 'rules'}`}>
                            {isLuminaAi ? '✦ LUMINA AI' : isFallback ? '↺ FALLBACK' : '⚡ RULES'}
                          </span>
                          <span className="ai-ticket-priority" style={{ color: PRIORITY_COLOR[d.priority] }}>
                            {d.priority}
                          </span>
                          <span className="ai-ticket-title">{d.title}</span>
                        </div>
                        <div className="ai-decision-right">
                          <span className="ai-assigned-to">→ {assignedLabel}</span>
                          <span className="ai-decision-date">{new Date(d.created_at).toLocaleDateString()}</span>
                          {isExpanded ? <ChevronUp size={14} className="ai-chevron" /> : <ChevronDown size={14} className="ai-chevron" />}
                        </div>
                      </div>

                      {isExpanded && routing?.reasoning && (
                        <div className="ai-decision-reasoning">
                          <div className="ai-reasoning-label">REASONING</div>
                          <pre className="ai-reasoning-text">{luminaVoice(routing.reasoning)}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </Container>
      </AdminPageShell>
    </DashboardLayout>
  );
}

export default AdminAiRoutingPage;
