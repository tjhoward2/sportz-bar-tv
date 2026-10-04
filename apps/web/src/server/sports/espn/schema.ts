/**
 * Runtime schemas for the parts of ESPN's scoreboard payload we read.
 * Unknown fields are stripped; almost everything is optional because the
 * API is unofficial and shapes vary by sport. Each event is validated on
 * its own so one malformed event can't sink a whole league.
 */
import { z } from 'zod';

const Status = z.object({
  type: z
    .object({
      name: z.string().optional(),
      state: z.string().optional(),
      completed: z.boolean().optional(),
      description: z.string().optional(),
      detail: z.string().optional(),
      shortDetail: z.string().optional(),
    })
    .optional(),
});

const Linescore = z.object({
  value: z.number().optional(),
  displayValue: z.string().optional(),
});

const Team = z.object({
  id: z.string().optional(),
  displayName: z.string().optional(),
  shortDisplayName: z.string().optional(),
  abbreviation: z.string().optional(),
  logo: z.string().optional(),
});

const Athlete = z.object({
  displayName: z.string().optional(),
  shortName: z.string().optional(),
});

const Competitor = z.object({
  id: z.string(),
  homeAway: z.string().optional(),
  winner: z.boolean().optional(),
  order: z.number().optional(),
  score: z.union([z.string(), z.object({ displayValue: z.string().optional() })]).optional(),
  team: Team.optional(),
  athlete: Athlete.optional(),
  records: z.array(z.object({ summary: z.string().optional() })).optional(),
  linescores: z.array(Linescore).optional(),
});

const GeoBroadcast = z.object({
  type: z.object({ shortName: z.string().optional() }).optional(),
  market: z.object({ type: z.string().optional() }).optional(),
  media: z.object({ shortName: z.string().optional() }).optional(),
});

const LegacyBroadcast = z.object({
  market: z.string().optional(),
  names: z.array(z.string()).optional(),
});

export const Competition = z.object({
  id: z.string(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  status: Status.optional(),
  competitors: z.array(Competitor).default([]),
  geoBroadcasts: z.array(GeoBroadcast).optional(),
  broadcasts: z.array(LegacyBroadcast).optional(),
  venue: z
    .object({
      fullName: z.string().optional(),
      address: z.object({ city: z.string().optional(), state: z.string().optional() }).optional(),
    })
    .optional(),
  notes: z
    .array(z.object({ headline: z.string().optional(), text: z.string().optional() }))
    .optional(),
  series: z.object({ summary: z.string().optional() }).optional(),
  type: z.object({ abbreviation: z.string().optional(), text: z.string().optional() }).optional(),
  round: z.object({ displayName: z.string().optional() }).optional(),
  situation: z
    .object({ lastPlay: z.object({ text: z.string().optional() }).optional() })
    .optional(),
});

export const Event = z.object({
  id: z.string(),
  date: z.string(),
  name: z.string().default(''),
  shortName: z.string().optional(),
  major: z.boolean().optional(),
  status: Status.optional(),
  competitions: z.array(Competition).optional(),
  groupings: z
    .array(
      z.object({
        grouping: z.object({ displayName: z.string().optional() }).optional(),
        competitions: z.array(Competition).default([]),
      }),
    )
    .optional(),
});

export const Scoreboard = z.object({
  events: z.array(z.unknown()).default([]),
});

export type EspnStatus = z.infer<typeof Status>;
export type EspnCompetition = z.infer<typeof Competition>;
export type EspnCompetitor = z.infer<typeof Competitor>;
export type EspnEvent = z.infer<typeof Event>;
