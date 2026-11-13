// Offline tests for the character domain, repository and DB upgrade. No network needed.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import Dexie from 'dexie';

let failed = 0;
const results: string[] = [];
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    results.push(`ok   ${name}`);
  } catch (e) {
    failed++;
    results.push(`FAIL ${name}\n     ${(e as Error).message}`);
  }
}

// An existing v1 install: entities already synced before characters existed.
const old = new Dexie('tome-sheet');
old.version(1).stores({ meta: 'key', entities: 'id, type, source, edition, name, level' });
await old.table('entities').put({ id: 'spell|fireball|xphb', type: 'spell', name: 'Fireball', source: 'XPHB', edition: '2024', json: {} });
await old.table('meta').put({ key: 'version', value: '2.41.0' });
old.close();

const { db } = await import('../src/lib/db');
const model = await import('../src/lib/characters/model');
const service = await import('../src/lib/characters/service');
const { countCharacters } = await import('../src/lib/characters/repository');

await test('upgrading a v1 database keeps book data and meta', async () => {
  assert.equal(await db.entities.count(), 1);
  assert.equal((await db.meta.get('version'))?.value, '2.41.0');
  assert.equal(await countCharacters(), 0);
});

await test('newCharacter produces a valid character with defaults', () => {
  const c = model.newCharacter({ name: '  Mira  ', ruleset: '2024' });
  assert.deepEqual(model.validateCharacter(c), []);
  assert.equal(c.details.name, 'Mira');
  assert.equal(c.schemaVersion, model.CHARACTER_SCHEMA_VERSION);
  assert.equal(c.createdAt, c.updatedAt);
  assert.equal(model.totalLevel(c), 0);
});

await test('characterSummary describes ruleset and level', () => {
  const c = model.newCharacter({ name: 'Gus', ruleset: '2014' });
  assert.equal(model.characterSummary(c), '2014 rules · Not built yet');
  c.choices.classes = [{ class: 'class|cleric|phb', level: 2 }];
  assert.equal(model.characterSummary(c), '2014 rules · Level 2');
});

await test('create, get and list (most recently updated first)', async () => {
  const a = await service.createCharacter({ name: 'Aldo', ruleset: '2014', now: new Date('2026-01-01T00:00:00Z') });
  const b = await service.createCharacter({ name: 'Brin', ruleset: '2024', now: new Date('2026-01-02T00:00:00Z') });
  assert.equal((await service.getById(a.id))?.details.name, 'Aldo');
  assert.deepEqual((await service.listAll()).map((c) => c.id), [b.id, a.id]);
  await service.updateCharacter(a.id, { details: { ...a.details, notes: 'edited' } }, new Date('2026-01-03T00:00:00Z'));
  assert.deepEqual((await service.listAll()).map((c) => c.id), [a.id, b.id]);
});

await test('update replaces sections, keeps id and createdAt, bumps updatedAt', async () => {
  const c = await service.createCharacter({ name: 'Cora', ruleset: '2024', now: new Date('2026-02-01T00:00:00Z') });
  const choices = { ...c.choices, classes: [{ class: 'class|wizard|xphb', level: 3 }], spells: ['spell|fireball|xphb'] };
  const u = await service.updateCharacter(c.id, { choices, equipment: [{ name: 'Quarterstaff', quantity: 1 }] }, new Date('2026-02-02T00:00:00Z'));
  assert.equal(u.id, c.id);
  assert.equal(u.createdAt, c.createdAt);
  assert.equal(u.updatedAt, '2026-02-02T00:00:00.000Z');
  assert.equal(model.totalLevel(u), 3);
  assert.deepEqual((await service.getById(c.id))?.equipment, [{ name: 'Quarterstaff', quantity: 1 }]);
});

await test('update rejects invalid data and leaves the stored character unchanged', async () => {
  const c = await service.createCharacter({ name: 'Dex', ruleset: '2014' });
  await assert.rejects(service.updateCharacter(c.id, { equipment: [{ name: 'Rope', quantity: -2 }] }), service.CharacterError);
  assert.deepEqual((await service.getById(c.id))?.equipment, []);
  await assert.rejects(service.updateCharacter('missing-id', {}), /not found/);
});

await test('create rejects an empty name', async () => {
  await assert.rejects(service.createCharacter({ name: '   ', ruleset: '2024' }), service.CharacterError);
});

await test('remove deletes only that character', async () => {
  const before = await countCharacters();
  const c = await service.createCharacter({ name: 'Eli', ruleset: '2024' });
  await service.removeCharacter(c.id);
  assert.equal(await service.getById(c.id), undefined);
  assert.equal(await countCharacters(), before);
});

await test('validateCharacter rejects malformed and newer-version records', () => {
  const ok = model.newCharacter({ name: 'Fay', ruleset: '2024' });
  const clone = () => structuredClone(ok) as any;
  assert.ok(model.validateCharacter(null).length);
  assert.ok(model.validateCharacter('x').length);
  const cases: [string, (c: any) => void][] = [
    ['missing id', (c) => delete c.id],
    ['bad ruleset', (c) => (c.details.ruleset = '2025')],
    ['ability 0', (c) => (c.choices.abilityScores.str = 0)],
    ['ability 31', (c) => (c.choices.abilityScores.dex = 31)],
    ['fractional level', (c) => (c.choices.classes = [{ class: 'class|rogue|xphb', level: 1.5 }])],
    ['level 21', (c) => (c.choices.classes = [{ class: 'class|rogue|xphb', level: 21 }])],
    ['skills not strings', (c) => (c.choices.skills = [1])],
    ['bad timestamp', (c) => (c.updatedAt = 'yesterday')],
    ['newer schema', (c) => (c.schemaVersion = model.CHARACTER_SCHEMA_VERSION + 1)],
    ['bad history', (c) => (c.progression.history = [{ level: 0, at: 'x' }])]
  ];
  for (const [label, mutate] of cases) {
    const c = clone();
    mutate(c);
    assert.ok(model.validateCharacter(c).length > 0, `expected "${label}" to be rejected`);
  }
});

await test('syncing book data does not touch characters', async () => {
  const before = await countCharacters();
  assert.ok(before > 0);
  // Mirrors the sync in data.svelte.ts: only the entities store is replaced.
  await db.transaction('rw', db.entities, db.meta, async () => {
    await db.entities.clear();
    await db.entities.bulkPut([{ id: 'x', type: 'spell', name: 'X', source: 'XPHB', edition: '2024', json: {} }]);
  });
  assert.equal(await countCharacters(), before);
});

console.log(results.join('\n'));
console.log(failed ? `\n${failed} test(s) failed` : `\nall ${results.length} tests passed`);
process.exit(failed ? 1 : 0);
