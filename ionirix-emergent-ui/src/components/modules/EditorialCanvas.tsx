import { GlassCard } from '@/components/surfaces';

const editorialModules = [
  {
    title: 'Restore comparison',
    body: 'Editorial restore previews now persist candidate-versus-stored comparison posture so the review context survives surface switches and refreshes.',
  },
  {
    title: 'Drift navigation',
    body: 'Drift summary cards jump straight into route, normalization, compatibility, and remap deltas, which makes the editorial side feel operational instead of illustrative.',
  },
  {
    title: 'Manifested output',
    body: 'Copied restore artifacts now include an explicit manifest header, making downstream review possible without reopening the workspace.',
  },
];

export function EditorialCanvas() {
  return (
    <GlassCard className="editorial-canvas" depth={2}>
      <p className="eyebrow">Editorial Module</p>
      <h2>Canvas</h2>
      <div className="editorial-stack">
        <section>
          <h3>Lead</h3>
          <p>Editorial restore flows now surface the same replay-comparison intelligence as dashboard, including resettable review state and manifest-backed exports.</p>
        </section>
        <section>
          <h3>Structure</h3>
          <p>Schema-backed zones, typed events, and adaptive behaviors still coordinate the editing surface, but the visible UI now explains how restore artifacts move through review.</p>
        </section>
        <section>
          <h3>Notes</h3>
          <p>Use this module as the editorial body surface referenced by the workspace plan, with the new restore workflow now called out explicitly in the live site.</p>
        </section>
      </div>
      <div className="editorial-canvas__grid">
        {editorialModules.map((module) => (
          <article key={module.title} className="editorial-canvas__card">
            <p className="eyebrow">Editorial Signal</p>
            <h3>{module.title}</h3>
            <p>{module.body}</p>
          </article>
        ))}
      </div>
    </GlassCard>
  );
}