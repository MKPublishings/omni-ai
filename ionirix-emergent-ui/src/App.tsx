import { useState } from 'react';
import { OnboardingShell } from '@/components/onboarding';
import { IonButton } from '@/components/primitives';
import { DashboardShell, EditorialShell } from '@/components/workspace';
import '@/styles/tokens.css';
import '@/styles/glass.css';
import '@/styles/animations.css';
import '@/styles/emergent.css';

type SurfaceView = 'onboarding' | 'dashboard' | 'editorial';

const surfaceSpotlights: Record<SurfaceView, { eyebrow: string; title: string; summary: string; bullets: string[] }> = {
  onboarding: {
    eyebrow: 'Live Onboarding Runtime',
    title: 'Schema-directed onboarding that now hands calibrated replay artifacts forward.',
    summary: 'Use the onboarding surface to generate calibration history, then move into dashboard or editorial to inspect replay previews, comparison drift, and manifest-backed exports.',
    bullets: ['Adaptive reflow is active across step content and preview zones', 'Calibration history feeds replay preview tooling in downstream surfaces', 'Surface switching preserves the site-level context while each module keeps its own runtime state'],
  },
  dashboard: {
    eyebrow: 'Replay Control Layer',
    title: 'Dashboard now foregrounds comparison reset, drift filtering, and manifest-backed preview exports.',
    summary: 'The command center already renders the new replay workflow. This frame now calls it out explicitly so the site reflects the latest operator tooling immediately.',
    bullets: ['Comparison reset keeps the accepted preview while clearing staged review state', 'Drift summary cards and semantic badges both drive comparison filtering', 'Copied replay artifacts now include manifest metadata for schema and export context'],
  },
  editorial: {
    eyebrow: 'Editorial Restore Layer',
    title: 'Editorial restore flows now expose the same replay comparison intelligence as dashboard.',
    summary: 'The editorial surface highlights route drift, normalization posture, and portable restore artifacts so the UI reads like a finished system instead of a placeholder shell.',
    bullets: ['Restore preview comparison persists per surface and origin', 'Drift cards collapse the review surface to the exact semantic delta you need', 'Artifact manifests make copied previews understandable outside the app'],
  },
};

export default function App() {
  const [activeSurface, setActiveSurface] = useState<SurfaceView>('onboarding');
  const spotlight = surfaceSpotlights[activeSurface];

  return (
    <div className="app-shell">
      <header className="site-hero">
        <div className="site-hero__copy">
          <p className="eyebrow">Ionirix Emergent-UI Workspace</p>
          <h1>Operator-facing replay tooling is now visible in the live site shell.</h1>
          <p className="workspace-copy">
            The runtime already supported comparison reset, drift summaries, semantic filtering, and manifest-backed exports.
            The site frame now advertises those capabilities directly so surface changes are obvious without reading raw JSON or internal docs.
          </p>
        </div>
        <div className="site-hero__status-grid" aria-label="Workspace status">
          <article className="site-status-card">
            <span className="eyebrow">Replay Artifacts</span>
            <strong className="metric-value">Manifested</strong>
            <span>Compact and full preview copies now travel with schema and drift context.</span>
          </article>
          <article className="site-status-card">
            <span className="eyebrow">Comparison Flow</span>
            <strong className="metric-value">Resettable</strong>
            <span>Operators can clear staged review posture without losing the accepted preview.</span>
          </article>
          <article className="site-status-card">
            <span className="eyebrow">Drift Review</span>
            <strong className="metric-value">Actionable</strong>
            <span>Summary cards and semantic badges now point at the same filtered comparison state.</span>
          </article>
        </div>
      </header>
      <nav className="surface-switcher" aria-label="Surface switcher">
        <IonButton
          label="Onboarding"
          onClick={() => setActiveSurface('onboarding')}
          variant={activeSurface === 'onboarding' ? 'primary' : 'ghost'}
        />
        <IonButton
          label="Dashboard"
          onClick={() => setActiveSurface('dashboard')}
          variant={activeSurface === 'dashboard' ? 'primary' : 'ghost'}
        />
        <IonButton
          label="Editorial"
          onClick={() => setActiveSurface('editorial')}
          variant={activeSurface === 'editorial' ? 'primary' : 'ghost'}
        />
      </nav>
      <section className="surface-spotlight" aria-label="Active surface spotlight">
        <div>
          <p className="eyebrow">{spotlight.eyebrow}</p>
          <h2>{spotlight.title}</h2>
          <p className="workspace-copy">{spotlight.summary}</p>
        </div>
        <div className="surface-spotlight__list">
          {spotlight.bullets.map((bullet) => (
            <article key={bullet} className="surface-spotlight__item">
              <span className="surface-spotlight__marker" aria-hidden="true" />
              <p>{bullet}</p>
            </article>
          ))}
        </div>
      </section>
      <main className="site-surface-frame">
        {activeSurface === 'onboarding' ? <OnboardingShell /> : null}
        {activeSurface === 'dashboard' ? <DashboardShell /> : null}
        {activeSurface === 'editorial' ? <EditorialShell /> : null}
      </main>
    </div>
  );
}