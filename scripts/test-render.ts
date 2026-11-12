import 'fake-indexeddb/auto';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { render } from 'svelte/server';

const vite = await createServer({ configFile: false, plugins: [svelte({ compilerOptions: { dev: false } })], optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p: string) => vite.ssrLoadModule(p);
const { db } = await load('/src/lib/db.ts');
const { fetchAndBuild, DEFAULT_MIRROR } = await load('/src/lib/pipeline.ts');
const catalog = await load('/src/lib/catalog.ts');
const fmt = await load('/src/lib/format.ts');
const Entries = (await load('/src/lib/Entries.svelte')).default;

const { entities, list, indexJson, sourceNames } = await fetchAndBuild(DEFAULT_MIRROR);
await db.entities.bulkPut(entities);
await db.meta.bulkPut([{ key: 'entityList', value: list }, { key: 'searchIndex', value: indexJson }, { key: 'sourceNames', value: sourceNames }]);
await catalog.ensureCatalog();

const unsupported = new Map<string, number>();
const origWarn = console.warn;
console.warn = (...a: any[]) => { if (String(a[0]).startsWith('Unsupported')) unsupported.set(String(a[1]), (unsupported.get(String(a[1])) ?? 0) + 1); };

const html = (e: any) => render(Entries, { props: { entry: e.json.entries ?? e.json.entry, edition: e.edition } }).body;
const text = (h: string) => h.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const by = (id: string) => entities.find((e: any) => e.id === id)!;

for (const id of ['spell|fireball|xphb', 'spell|magic missile|phb', 'background|acolyte|xphb', 'feat|alert|xphb', 'condition|blinded|xphb', 'race|elf|phb']) {
  const e = by(id); const h = html(e);
  console.log(`\n== ${id}  (${h.length} chars html, ${(h.match(/class="[^"]*ref/g) ?? []).length} links)`);
  console.log(text(h).slice(0, 320));
}
console.log('\n== spell facts');
for (const id of ['spell|fireball|xphb', 'spell|fireball|phb', 'spell|shield|phb', 'spell|detect magic|phb', 'spell|prestidigitation|phb', 'spell|mage hand|xphb']) {
  const e = by(id); const j = e.json;
  console.log(e.name.padEnd(16), e.source.padEnd(5), fmt.levelSchool(j), '|', fmt.castingTime(j.time), '|', fmt.spellRange(j.range), '|', fmt.spellComponents(j.components).slice(0, 40), '|', fmt.spellDuration(j.duration));
}

// run every entity's body through the renderer to find unsupported entry types and crashes
let crashes = 0; const crashEx: string[] = [];
for (const e of entities) {
  try { render(Entries, { props: { entry: e.json.entries ?? e.json.entry, edition: e.edition } }); }
  catch (err) { crashes++; if (crashEx.length < 3) crashEx.push(`${e.id}: ${(err as Error).message}`); }
}
console.warn = origWarn;
console.log('\nrendered', entities.length, 'entities | crashes:', crashes, crashEx);
console.log('unsupported entry types:', Object.fromEntries(unsupported));

// class and subclass feature wiring
const cls = by('class|wizard|xphb'); const refs = fmt.classFeatureRefs(cls.json);
const found = await db.entities.bulkGet(refs.map((r: any) => r.id));
console.log('\nWizard XPHB features referenced:', refs.length, '| found in data:', found.filter(Boolean).length, '| e.g.', found.filter(Boolean).slice(0, 3).map((f: any) => `L${f.level} ${f.name}`).join(', '));
const sc = by('subclass|evoker|xphb|evoker|wizard|xphb'); 
const srefs = sc ? fmt.subclassFeatureRefs(sc.json) : [];
const sfound = await db.entities.bulkGet(srefs.map((r: any) => r.id));
console.log('Evoker features referenced:', srefs.length, '| found:', sfound.filter(Boolean).length);
const totalBad = [];
for (const c of entities.filter((e: any) => e.type === 'class')) { const r = fmt.classFeatureRefs(c.json); const f = await db.entities.bulkGet(r.map((x: any) => x.id)); const miss = f.filter((x: any) => !x).length; if (miss) totalBad.push(`${c.name}[${c.source}] ${miss}/${r.length}`); }
console.log('classes with unresolved feature refs:', totalBad.length, totalBad.slice(0, 8));
await vite.close();
