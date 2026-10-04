// Mirrors the web design tokens (apps/web/src/app/globals.css, PRD §15).
// Keep the two in sync; every color carries meaning.
export const colors = {
  bg: '#0B0F14',
  surface: '#131A22',
  surface2: '#1B2430',
  line: '#26313D',
  text: '#F7FAFC',
  muted: '#8A97A6',
  live: '#EF4444',
  suggested: '#F59E0B',
  confirmed: '#22C55E',
  overridden: '#3B82F6',
  cleared: '#64748B',
} as const;

export const radii = { xl: 14, xxl: 20 } as const;

/** Minimum touch target (bar environment). */
export const TAP = 48;
