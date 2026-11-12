import { fetchAndBuild, fetchRemoteVersion, DEFAULT_MIRROR } from '../src/lib/pipeline';

const t0 = Date.now();
console.log('remote version:', await fetchRemoteVersion(DEFAULT_MIRROR));
let last = 0;
const { entities, report } = await fetchAndBuild(DEFAULT_MIRROR, (p) => {
  if (p.done - last >= 25 || p.done === p.total) { last = p.done; console.log(`  ${p.label} ${p.done}/${p.total}`); }
});
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log('entities:', report.entities, '| copies:', report.copies, '| unresolved:', report.unresolved, '| duplicates:', report.duplicates, '| skipped:', report.skipped);
console.log('failed files:', report.failedFiles);
console.log('unsupported mods:', report.unsupported);
console.table(report.counts);

const find = (type: string, name: string, source: string) => entities.find((e) => e.type === type && e.name === name && e.source === source);
for (const [t, n, s] of [['spell','Fireball','PHB'],['spell','Fireball','XPHB'],['race','Elf','PHB'],['race','Elf','XPHB'],['feat','Alert','XPHB'],['background','Acolyte','XPHB'],['class','Wizard','XPHB'],['class','Wizard','PHB']] as const) {
  const e = find(t, n, s);
  console.log(t.padEnd(10), n.padEnd(10), s.padEnd(5), e ? `edition=${e.edition}` : 'MISSING');
}
const unresolved = entities.filter((e) => e.json._unresolved).slice(0, 5).map((e) => e.id);
console.log('sample unresolved:', unresolved);
const srcEd = new Map<string, Set<string>>();
for (const e of entities) { if (!srcEd.has(e.source)) srcEd.set(e.source, new Set()); srcEd.get(e.source)!.add(e.edition); }
console.log('sources spanning both editions:', [...srcEd].filter(([, s]) => s.size > 1).map(([k]) => k));
console.log('2024 sources:', [...srcEd].filter(([, s]) => s.has('2024')).map(([k]) => k).join(' '));
