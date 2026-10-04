/**
 * The one entry point the app uses for sports data. Adapters run in
 * parallel; any one failing degrades its leagues, never the whole list.
 */
import { log } from '../log';
import { fetchEspnEvents } from './espn/adapter';
import { fetchMlbEvents } from './mlb/adapter';
import type { AdapterResult } from './types';

export type { AdapterResult, FeedHealth } from './types';

export async function fetchAllEvents(now: Date = new Date()): Promise<AdapterResult> {
  const adapters = [
    { name: 'espn', run: fetchEspnEvents },
    { name: 'mlb', run: fetchMlbEvents },
  ];
  const results = await Promise.allSettled(adapters.map((a) => a.run(now)));
  const merged: AdapterResult = { events: [], feeds: [] };
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      // Adapters report feed errors themselves; reaching here is a bug.
      log.error('sports.adapter_crashed', {
        adapter: adapters[i]?.name,
        error: r.reason instanceof Error ? r.reason.stack : String(r.reason),
      });
      return;
    }
    merged.events.push(...r.value.events);
    merged.feeds.push(...r.value.feeds);
  });
  return merged;
}
