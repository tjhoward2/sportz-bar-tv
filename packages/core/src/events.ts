/**
 * Normalized sports event: the one shape every data adapter produces and
 * every screen consumes. Nothing downstream sees ESPN or StatsAPI payloads.
 */

import type { BroadcastInput } from './broadcasts';
import type { LeagueId, SportId } from './sports';
import type { RawEventStatus } from './status';

export type EventSource = 'ESPN' | 'MLB_STATSAPI';

/**
 * TEAM: two teams (NFL, NBA, soccer). INDIVIDUAL: two athletes (tennis
 * match, fight card main event). TOURNAMENT: a field (golf, F1 session).
 */
export type EventShape = 'TEAM' | 'INDIVIDUAL' | 'TOURNAMENT';

export interface Competitor {
  id: string;
  name: string;
  shortName: string;
  abbreviation?: string;
  logoUrl?: string;
  /** Display score: "24", "-23" (golf), "6-3 4-6" (tennis sets). */
  score?: string;
  isHome?: boolean;
  isWinner?: boolean;
  record?: string;
  /** Per-period scores, oldest first. */
  periodScores?: string[];
}

export interface SportsEvent {
  /** Stable and globally unique, e.g. "espn:NFL:401772936". */
  id: string;
  source: EventSource;
  sport: SportId;
  league: LeagueId;
  shape: EventShape;
  /** "Commanders at Falcons", "Bank of Utah Championship", "Bahrain GP · Race". */
  name: string;
  /** ISO 8601 UTC. */
  startTime: string;
  rawStatus: RawEventStatus;
  /** Feed's human status: "Q3 4:12", "Final/OT", "10/4 - 9:30 AM EDT". */
  statusDetail: string;
  /** TEAM/INDIVIDUAL: away first, home second when known. TOURNAMENT: leaders. */
  competitors: Competitor[];
  broadcasts: BroadcastInput[];
  venue?: { name: string; city?: string; state?: string };
  /** Context line: "ALDS · Game 2", "NFL London Games", "Quarterfinal". */
  note?: string;
  lastPlay?: string;
  /** e.g. "LOCAL" for Oregon / Pacific Northwest teams. */
  tags: string[];
}
