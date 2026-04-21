import { GlassCard } from '@/components/surfaces';

const cards = [
  { title: 'Comparison reset', value: 'Live', note: 'Clear staged replay review state without discarding the accepted preview artifact.' },
  { title: 'Drift filters', value: '6', note: 'Summary cards and semantic badges both route into the same semantic comparison filter.' },
  { title: 'Export manifest', value: 'Attached', note: 'Copied compact and full replay artifacts include schema revision, compatibility, and drift posture.' },
];

const workflow = [
  {
    eyebrow: 'Review posture',
    title: 'Keep the accepted preview stable',
    copy: 'Operators can now reset only the comparison layer, leaving the accepted replay artifact intact while starting a fresh diff review.',
  },
  {
    eyebrow: 'Semantic focus',
    title: 'Drift summaries are clickable',
    copy: 'Target, compatibility, route, normalization, and remap drift are exposed as direct UI entry points rather than passive summary text.',
  },
  {
    eyebrow: 'Portable export',
    title: 'Artifacts explain themselves outside the app',
    copy: 'Manifest metadata travels with copied JSON so replay previews retain surface, revision, and severity context after export.',
  },
];

export function DashboardWorkspacePanel() {
  return (
    <div className="dashboard-workspace-panel">
      <GlassCard className="dashboard-workspace-panel__hero" depth={2}>
        <p className="eyebrow">Workspace Panel</p>
        <h2>Dashboard replay operations are now visible as a first-class workflow.</h2>
        <p>
          This panel no longer reads like a generic placeholder. It describes the exact operator tools now available in the command center:
          comparison reset, actionable drift review, and manifest-backed replay exports.
        </p>
      </GlassCard>
      <div className="module-grid">
        {cards.map((card) => (
          <GlassCard key={card.title} className="metric-card" depth={1}>
            <p className="eyebrow">Dashboard Signal</p>
            <h3>{card.title}</h3>
            <strong className="metric-value">{card.value}</strong>
            <p>{card.note}</p>
          </GlassCard>
        ))}
      </div>
      <div className="dashboard-workspace-panel__workflow">
        {workflow.map((entry) => (
          <GlassCard key={entry.title} className="dashboard-workspace-panel__callout" depth={1}>
            <p className="eyebrow">{entry.eyebrow}</p>
            <h3>{entry.title}</h3>
            <p>{entry.copy}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}