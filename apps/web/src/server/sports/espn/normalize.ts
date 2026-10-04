/**
 * ESPN scoreboard payload → SportsEvent[]. Pure functions; no I/O.
 *
 * ESPN hides three shapes behind one endpoint format:
 *   TEAM        two `team` competitors (NFL, NBA, soccer…)
 *   INDIVIDUAL  two `athlete` competitors (tennis match, fight card)
 *   TOURNAMENT  a field of athletes (golf, an F1 session)
 * Tennis tournaments are flattened into singles matches and F1 weekends into
 * sessions, because those are what a bar actually puts on a TV.
 */
import type { BroadcastInput, Competitor, LeagueId, RawEventStatus, SportsEvent } from '@sbtv/core';
import { tagsForTeams } from '../tags';
import type { EspnEndpoint } from './endpoints';
import {
  Event,
  Scoreboard,
  type EspnCompetition,
  type EspnCompetitor,
  type EspnEvent,
  type EspnStatus,
} from './schema';

const TENNIS_LOOKBACK_MS = 24 * 3_600_000;
const RACING_LOOKBACK_MS = 12 * 3_600_000;
const TOURNAMENT_LEADERS = 5;

export interface NormalizeResult {
  events: SportsEvent[];
  /** Events that failed validation and were skipped. */
  invalid: number;
}

/**
 * Status precedence (PRD §5): terminal names > completed flag > mid-game
 * names > generic state.
 */
export function mapEspnStatus(status: EspnStatus | undefined): RawEventStatus {
  const name = status?.type?.name?.toUpperCase() ?? '';
  if (name.includes('POSTPONED')) return 'POSTPONED';
  if (name.includes('CANCELED') || name.includes('CANCELLED') || name.includes('ABANDONED')) {
    return 'CANCELED';
  }
  if (name.includes('FINAL') || name.includes('FULL_TIME') || name.includes('RETIRED')) {
    return 'FINAL';
  }
  if (status?.type?.completed) return 'FINAL';
  if (name.includes('HALFTIME')) return 'HALFTIME';
  if (name.includes('DELAY') || name.includes('SUSPENDED')) return 'DELAYED';
  switch (status?.type?.state) {
    case 'in':
      return 'LIVE';
    case 'post':
      return 'FINAL';
    default:
      return 'SCHEDULED';
  }
}

function statusDetail(status: EspnStatus | undefined): string {
  const t = status?.type;
  return t?.shortDetail ?? t?.detail ?? t?.description ?? '';
}

/** geoBroadcasts preferred; legacy `broadcasts` as fallback. Radio dropped. */
export function extractBroadcasts(comps: readonly EspnCompetition[]): BroadcastInput[] {
  const raw: BroadcastInput[] = [];
  for (const c of comps) {
    if (c.geoBroadcasts && c.geoBroadcasts.length > 0) {
      for (const g of c.geoBroadcasts) {
        const name = g.media?.shortName?.trim();
        if (!name || g.type?.shortName?.toUpperCase() === 'RADIO') continue;
        raw.push({ name, market: toMarket(g.market?.type) });
      }
    } else {
      for (const b of c.broadcasts ?? []) {
        for (const n of b.names ?? []) {
          if (n.trim()) raw.push({ name: n.trim(), market: toMarket(b.market) });
        }
      }
    }
  }
  // Dedupe by name; a national listing beats a regional one.
  const byName = new Map<string, BroadcastInput>();
  for (const b of raw) {
    const key = b.name.toUpperCase();
    const existing = byName.get(key);
    if (!existing || (b.market === 'NATIONAL' && existing.market !== 'NATIONAL')) {
      byName.set(key, b);
    }
  }
  return [...byName.values()];
}

function toMarket(value: string | undefined): BroadcastInput['market'] {
  switch (value?.toLowerCase()) {
    case 'home':
      return 'HOME';
    case 'away':
      return 'AWAY';
    default:
      return 'NATIONAL';
  }
}

function scoreOf(c: EspnCompetitor): string | undefined {
  if (typeof c.score === 'string') return c.score === '' ? undefined : c.score;
  return c.score?.displayValue;
}

function periodScores(c: EspnCompetitor): string[] | undefined {
  const scores = c.linescores?.map(
    (l) => l.displayValue ?? (l.value !== undefined ? String(l.value) : ''),
  );
  return scores && scores.length > 0 ? scores : undefined;
}

function toCompetitor(c: EspnCompetitor): Competitor {
  const name = c.team?.displayName ?? c.athlete?.displayName ?? 'TBD';
  return {
    id: c.id,
    name,
    shortName: c.team?.shortDisplayName ?? c.athlete?.shortName ?? name,
    abbreviation: c.team?.abbreviation,
    logoUrl: c.team?.logo,
    score: scoreOf(c),
    isHome: c.homeAway === 'home' ? true : c.homeAway === 'away' ? false : undefined,
    isWinner: c.winner,
    record: c.records?.[0]?.summary,
    periodScores: periodScores(c),
  };
}

/** Away first, home second; otherwise feed order. */
function headToHead(comp: EspnCompetition): Competitor[] {
  const list = comp.competitors.map(toCompetitor);
  return list.sort((a, b) => Number(a.isHome ?? false) - Number(b.isHome ?? false));
}

function noteFor(comp: EspnCompetition, ...extra: (string | undefined)[]): string | undefined {
  const parts = [...extra, comp.notes?.[0]?.headline, comp.series?.summary].filter(
    (p): p is string => !!p && p.trim() !== '',
  );
  return parts.length > 0 ? [...new Set(parts)].join(' · ') : undefined;
}

function venueOf(comp: EspnCompetition): SportsEvent['venue'] {
  const v = comp.venue;
  if (!v?.fullName) return undefined;
  return { name: v.fullName, city: v.address?.city, state: v.address?.state };
}

function baseEvent(
  ep: EspnEndpoint,
  league: LeagueId,
  externalId: string,
): Pick<SportsEvent, 'id' | 'source' | 'sport' | 'league'> {
  return { id: `espn:${league}:${externalId}`, source: 'ESPN', sport: ep.sport, league };
}

function teamEvents(ep: EspnEndpoint, e: EspnEvent): SportsEvent[] {
  return (e.competitions ?? []).map((comp) => {
    const rawStatus = mapEspnStatus(comp.status ?? e.status);
    // ESPN reports "0" before kickoff; a pre-game score is noise.
    const competitors = headToHead(comp).map((c) =>
      rawStatus === 'SCHEDULED' ? { ...c, score: undefined } : c,
    );
    const isTeam = comp.competitors.some((c) => c.team);
    const [away, home] = competitors;
    const joiner = isTeam && away?.isHome === false ? ' at ' : ' vs ';
    const name =
      away && home ? `${away.shortName}${joiner}${home.shortName}` : (e.shortName ?? e.name);
    return {
      ...baseEvent(ep, ep.league, comp.id),
      shape: isTeam ? 'TEAM' : 'INDIVIDUAL',
      name,
      startTime: comp.startDate ?? comp.date ?? e.date,
      rawStatus,
      statusDetail: statusDetail(comp.status ?? e.status),
      competitors,
      broadcasts: extractBroadcasts([comp]),
      venue: venueOf(comp),
      note: noteFor(comp),
      lastPlay: comp.situation?.lastPlay?.text,
      tags: tagsForTeams(competitors.map((c) => c.name)),
    } satisfies SportsEvent;
  });
}

function tennisMatches(ep: EspnEndpoint, e: EspnEvent, now: Date): SportsEvent[] {
  const league: LeagueId = e.major ? 'GRAND_SLAM' : ep.league;
  const cutoff = now.getTime() - TENNIS_LOOKBACK_MS;
  // Singles only: doubles competitors arrive without names (shown as "TBD").
  const singles = (e.groupings ?? []).filter(
    (g) => !g.grouping?.displayName?.toLowerCase().includes('doubles'),
  );
  return singles.flatMap((g) =>
    g.competitions
      .filter((comp) => Date.parse(comp.startDate ?? comp.date ?? e.date) >= cutoff)
      .map((comp) => {
        // Set scores ("6 4") as the score; home/away means nothing in tennis.
        const competitors = comp.competitors.map((c) => ({
          ...toCompetitor(c),
          score: periodScores(c)?.join(' '),
          isHome: undefined,
        }));
        const [a, b] = competitors;
        return {
          ...baseEvent(ep, league, comp.id),
          shape: 'INDIVIDUAL',
          name: a && b ? `${a.shortName} vs ${b.shortName}` : e.name,
          startTime: comp.startDate ?? comp.date ?? e.date,
          rawStatus: mapEspnStatus(comp.status),
          statusDetail: statusDetail(comp.status),
          competitors,
          broadcasts: extractBroadcasts([comp]),
          venue: venueOf(comp),
          note: [e.name, g.grouping?.displayName, comp.round?.displayName]
            .filter(Boolean)
            .join(' · '),
          tags: [],
        } satisfies SportsEvent;
      }),
  );
}

function racingSessions(ep: EspnEndpoint, e: EspnEvent, now: Date): SportsEvent[] {
  const cutoff = now.getTime() - RACING_LOOKBACK_MS;
  return (e.competitions ?? [])
    .filter((comp) => Date.parse(comp.startDate ?? comp.date ?? e.date) >= cutoff)
    .map((comp) => {
      const session = comp.type?.abbreviation ?? comp.type?.text ?? 'Session';
      return {
        ...baseEvent(ep, ep.league, comp.id),
        shape: 'TOURNAMENT',
        name: `${e.shortName ?? e.name} · ${session}`,
        startTime: comp.startDate ?? comp.date ?? e.date,
        rawStatus: mapEspnStatus(comp.status),
        statusDetail: statusDetail(comp.status),
        competitors: leaders(comp),
        broadcasts: extractBroadcasts([comp]),
        venue: venueOf(comp),
        note: e.name,
        tags: [],
      } satisfies SportsEvent;
    });
}

function leaders(comp: EspnCompetition): Competitor[] {
  return [...comp.competitors]
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .slice(0, TOURNAMENT_LEADERS)
    .map(toCompetitor);
}

/** Golf: the tournament is the event; status comes from the event level. */
function golfTournament(ep: EspnEndpoint, e: EspnEvent): SportsEvent[] {
  const comp = e.competitions?.[0];
  if (!comp) return [];
  return [
    {
      ...baseEvent(ep, ep.league, e.id),
      shape: 'TOURNAMENT',
      name: e.name,
      startTime: comp.startDate ?? comp.date ?? e.date,
      rawStatus: mapEspnStatus(e.status ?? comp.status),
      statusDetail: statusDetail(e.status ?? comp.status),
      competitors: leaders(comp).map((c) => ({ ...c, periodScores: undefined })),
      broadcasts: extractBroadcasts([comp]),
      venue: venueOf(comp),
      tags: [],
    },
  ];
}

/** Fight card: one event; main event (last bout) as the matchup. */
function fightCard(ep: EspnEndpoint, e: EspnEvent): SportsEvent[] {
  const comps = e.competitions ?? [];
  const main = comps.at(-1);
  if (!main) return [];
  return [
    {
      ...baseEvent(ep, ep.league, e.id),
      shape: 'INDIVIDUAL',
      name: e.name,
      startTime: comps[0]?.startDate ?? comps[0]?.date ?? e.date,
      rawStatus: mapEspnStatus(e.status ?? main.status),
      statusDetail: statusDetail(e.status ?? main.status),
      competitors: headToHead(main),
      broadcasts: extractBroadcasts(comps),
      venue: venueOf(main),
      note: main.type?.abbreviation ? `Main event · ${main.type.abbreviation}` : undefined,
      tags: [],
    },
  ];
}

export function normalizeScoreboard(
  ep: EspnEndpoint,
  payload: unknown,
  now: Date,
): NormalizeResult {
  const board = Scoreboard.safeParse(payload);
  if (!board.success) return { events: [], invalid: 1 };

  const events: SportsEvent[] = [];
  let invalid = 0;
  for (const raw of board.data.events) {
    const parsed = Event.safeParse(raw);
    if (!parsed.success) {
      invalid++;
      continue;
    }
    const e = parsed.data;
    if (ep.sport === 'TENNIS' && e.groupings) events.push(...tennisMatches(ep, e, now));
    else if (ep.sport === 'RACING') events.push(...racingSessions(ep, e, now));
    else if (ep.sport === 'GOLF') events.push(...golfTournament(ep, e));
    else if (ep.sport === 'MMA' || ep.sport === 'BOXING') events.push(...fightCard(ep, e));
    else events.push(...teamEvents(ep, e));
  }
  return { events, invalid };
}
