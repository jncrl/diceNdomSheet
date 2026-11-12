import type { Obj } from './resolve';

export type Edition = '2014' | '2024';

const CUTOFF = '2024-09-01'; // 2024 Player's Handbook released 2024-09-17

/**
 * 5etools tags some entities with edition "one" (2024) or "classic" (2014), but not spells or feats.
 * Order of evidence: the entity's own tag, then the majority tag across its source, then the
 * book's publication date, then 2014.
 */
export function makeEditionResolver(tagged: { source: string; edition?: string }[], books: Obj[]) {
  const published = new Map<string, string>();
  for (const b of books) {
    const src = b.source ?? b.id;
    if (src && b.published) published.set(src, String(b.published));
  }

  const tally = new Map<string, { one: number; classic: number }>();
  for (const t of tagged) {
    if (t.edition !== 'one' && t.edition !== 'classic') continue;
    const row = tally.get(t.source) ?? { one: 0, classic: 0 };
    if (t.edition === 'one') row.one++;
    else row.classic++;
    tally.set(t.source, row);
  }

  const bySource = new Map<string, Edition>();
  const sourceEdition = (src: string): Edition => {
    const cached = bySource.get(src);
    if (cached) return cached;
    let ed: Edition = '2014';
    const row = tally.get(src);
    const pub = published.get(src);
    if (row && row.one !== row.classic) ed = row.one > row.classic ? '2024' : '2014';
    else if (pub) ed = pub >= CUTOFF ? '2024' : '2014';
    bySource.set(src, ed);
    return ed;
  };

  return (e: { source: string; edition?: string }): Edition =>
    e.edition === 'one' ? '2024' : e.edition === 'classic' ? '2014' : sourceEdition(e.source);
}
