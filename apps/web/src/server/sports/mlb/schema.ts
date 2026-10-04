import { z } from 'zod';

const Team = z.object({
  id: z.number(),
  name: z.string(),
  teamName: z.string().optional(),
  abbreviation: z.string().optional(),
});

const Side = z.object({
  team: Team,
  score: z.number().optional(),
  isWinner: z.boolean().optional(),
  leagueRecord: z.object({ wins: z.number(), losses: z.number() }).optional(),
});

const Inning = z.object({
  num: z.number(),
  home: z.object({ runs: z.number().optional() }).optional(),
  away: z.object({ runs: z.number().optional() }).optional(),
});

export const Game = z.object({
  gamePk: z.number(),
  gameDate: z.string(),
  gameType: z.string().optional(),
  seriesDescription: z.string().optional(),
  status: z.object({
    abstractGameState: z.string().optional(),
    detailedState: z.string().optional(),
  }),
  teams: z.object({ away: Side, home: Side }),
  venue: z.object({ name: z.string().optional() }).optional(),
  broadcasts: z
    .array(
      z.object({
        name: z.string(),
        type: z.string().optional(),
        isNational: z.boolean().optional(),
        homeAway: z.string().optional(),
      }),
    )
    .optional(),
  linescore: z
    .object({
      currentInning: z.number().optional(),
      inningState: z.string().optional(),
      innings: z.array(Inning).optional(),
    })
    .optional(),
});

export const Schedule = z.object({
  dates: z.array(z.object({ games: z.array(z.unknown()).default([]) })).default([]),
});

export type MlbGame = z.infer<typeof Game>;
