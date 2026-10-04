/**
 * MLB StatsAPI schedule → SportsEvent[]. ESPN doesn't publish MiLB, so
 * Triple-A comes from here (PRD §6). Pure; no I/O.
 */
import type { BroadcastInput, Competitor, RawEventStatus, SportsEvent } from '@sbtv/core';
import { tagsForTeams } from '../tags';
import { Game, Schedule, type MlbGame } from './schema';

const LOGO_URL = (teamId: number) => `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
const TV_TYPES = new Set(['TV']);

export function mapMlbStatus(status: MlbGame['status']): RawEventStatus {
  const detailed = status.detailedState?.toUpperCase() ?? '';
  if (detailed.includes('POSTPONED')) return 'POSTPONED';
  if (detailed.includes('CANCELLED') || detailed.includes('CANCELED')) return 'CANCELED';
  if (status.abstractGameState === 'Final') return 'FINAL';
  if (detailed.includes('DELAY') || detailed.includes('SUSPENDED')) return 'DELAYED';
  if (status.abstractGameState === 'Live') return 'LIVE';
  return 'SCHEDULED';
}

/** TV only (radio and audio streams dropped); home/away duplicates merged. */
export function extractMlbBroadcasts(game: MlbGame): BroadcastInput[] {
  const byName = new Map<string, BroadcastInput>();
  for (const b of game.broadcasts ?? []) {
    if (!TV_TYPES.has(b.type?.toUpperCase() ?? '')) continue;
    const market: BroadcastInput['market'] = b.isNational
      ? 'NATIONAL'
      : b.homeAway === 'home'
        ? 'HOME'
        : 'AWAY';
    const key = b.name.toUpperCase();
    const existing = byName.get(key);
    if (!existing || (market === 'NATIONAL' && existing.market !== 'NATIONAL')) {
      byName.set(key, { name: b.name, market });
    }
  }
  return [...byName.values()];
}

function side(game: MlbGame, which: 'away' | 'home'): Competitor {
  const s = game.teams[which];
  const runs = game.linescore?.innings?.map((i) => String(i[which]?.runs ?? ''));
  return {
    id: String(s.team.id),
    name: s.team.name,
    shortName: s.team.teamName ?? s.team.name,
    abbreviation: s.team.abbreviation,
    logoUrl: LOGO_URL(s.team.id),
    score: s.score !== undefined ? String(s.score) : undefined,
    isHome: which === 'home',
    isWinner: s.isWinner,
    record: s.leagueRecord ? `${s.leagueRecord.wins}-${s.leagueRecord.losses}` : undefined,
    periodScores: runs && runs.length > 0 ? runs : undefined,
  };
}

function detail(game: MlbGame, status: RawEventStatus): string {
  const state = game.status.detailedState ?? '';
  const ls = game.linescore;
  if (status === 'LIVE' && ls?.inningState && ls.currentInning) {
    return `${ls.inningState} ${ls.currentInning}`;
  }
  return state;
}

export function normalizeSchedule(payload: unknown): { events: SportsEvent[]; invalid: number } {
  const schedule = Schedule.safeParse(payload);
  if (!schedule.success) return { events: [], invalid: 1 };

  const events: SportsEvent[] = [];
  let invalid = 0;
  for (const raw of schedule.data.dates.flatMap((d) => d.games)) {
    const parsed = Game.safeParse(raw);
    if (!parsed.success) {
      invalid++;
      continue;
    }
    const game = parsed.data;
    const rawStatus = mapMlbStatus(game.status);
    const away = side(game, 'away');
    const home = side(game, 'home');
    events.push({
      id: `mlb:AAA:${game.gamePk}`,
      source: 'MLB_STATSAPI',
      sport: 'BASEBALL',
      league: 'AAA',
      shape: 'TEAM',
      name: `${away.shortName} at ${home.shortName}`,
      startTime: game.gameDate,
      rawStatus,
      statusDetail: detail(game, rawStatus),
      competitors: [away, home],
      broadcasts: extractMlbBroadcasts(game),
      venue: game.venue?.name ? { name: game.venue.name } : undefined,
      note: game.gameType && game.gameType !== 'R' ? game.seriesDescription : undefined,
      tags: tagsForTeams([away.name, home.name]),
    });
  }
  return { events, invalid };
}
