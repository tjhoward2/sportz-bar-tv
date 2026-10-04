import { SPORT_IDS, SPORTS } from '@sbtv/core';

// Placeholder home page. Proves the web app renders and imports shared code;
// replaced by the real dashboard in Phase 5.
export default function HomePage() {
  return (
    <main className="mx-auto max-w-app px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Sportz Bar TV</h1>
      <p className="mt-2 text-muted">Foundation build. The dashboard arrives in Phase 5.</p>
      <ul className="mt-8 flex flex-wrap gap-2" aria-label="Supported sports">
        {SPORT_IDS.map((id) => (
          <li
            key={id}
            className="tap flex items-center gap-2 rounded-xl border border-line bg-surface px-4 shadow-card"
          >
            <span aria-hidden>{SPORTS[id].emoji}</span>
            {SPORTS[id].label}
          </li>
        ))}
      </ul>
    </main>
  );
}
