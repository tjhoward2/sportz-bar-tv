import { describe, expect, it } from 'vitest';
import { tagsForTeams } from './tags';

describe('tagsForTeams', () => {
  it('tags Pacific Northwest teams by full name', () => {
    expect(tagsForTeams(['Portland Trail Blazers', 'Utah Jazz'])).toEqual(['LOCAL']);
    expect(tagsForTeams(['Oregon Ducks'])).toEqual(['LOCAL']);
  });

  it('does not tag on a shared nickname', () => {
    expect(tagsForTeams(['Anaheim Ducks', 'Boston Bruins'])).toEqual([]);
  });
});
