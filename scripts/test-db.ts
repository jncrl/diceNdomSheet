import 'fake-indexeddb/auto';
import { db } from '../src/lib/db';
import { fetchAndBuild, DEFAULT_MIRROR } from '../src/lib/pipeline';

const { version, entities, report } = await fetchAndBuild(DEFAULT_MIRROR);
await db.transaction('rw', db.entities, db.meta, async () => {
  await db.entities.clear();
  await db.entities.bulkPut(entities);
  await db.meta.bulkPut([{ key: 'version', value: version }, { key: 'report', value: report }]);
});
console.log('stored entities:', await db.entities.count(), 'of', entities.length);
console.log('2024 spells:', await db.entities.where({ type: 'spell', edition: '2024' }).count());
console.log('level-3 spells:', await db.entities.where({ type: 'spell' }).filter((e) => e.level === 3).count());
const f = await db.entities.get('spell|fireball|xphb');
console.log('fireball xphb:', f?.name, f?.edition, 'level', f?.level, 'has entries:', Array.isArray(f?.json.entries));
console.log('meta version:', (await db.meta.get('version'))?.value);
// re-sync replaces rather than appends
await db.transaction('rw', db.entities, async () => { await db.entities.clear(); await db.entities.bulkPut(entities); });
console.log('after re-sync:', await db.entities.count());
