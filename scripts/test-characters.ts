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
const species = await import('../src/lib/characters/species');
const options = await import('../src/lib/characters/options');
const { SKILLS } = await import('../src/lib/characters/skills');
const { countCharacters } = await import('../src/lib/characters/repository');

const elf = { name: 'Elf', ref: 'race|elf|phb' };
const highElf = { name: 'High', ref: 'subrace|high|phb|elf|phb' };
const human = { name: 'Human', ref: 'race|human|phb' };

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

await test('characterSummary shows species, classes and ruleset', () => {
  const c = model.newCharacter({ name: 'Gus', ruleset: '2014' });
  assert.equal(model.characterSummary(c), 'No class yet · 2014 rules');
  c.choices.species = elf;
  c.choices.classes = [{ class: { name: 'Cleric' }, level: 2 }, { class: { name: 'Wizard' }, level: 1 }];
  assert.equal(model.characterSummary(c), 'Elf · Cleric 2 / Wizard 1 · 2014 rules');
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
  const choices = { ...c.choices, classes: [{ class: { name: 'Wizard', ref: 'class|wizard|xphb' }, level: 3 }], spells: [{ name: 'Fireball', ref: 'spell|fireball|xphb' }] };
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
  await assert.rejects(service.updateCharacter(c.id, { choices: { ...c.choices, abilityScores: { ...c.choices.abilityScores, str: 99 } } }), service.CharacterError);
  await assert.rejects(service.updateCharacter('missing-id', {}), /not found/);
});

await test('create rejects an empty name', async () => {
  await assert.rejects(service.createCharacter({ name: '   ', ruleset: '2024' }), service.CharacterError);
});

await test('manual and homebrew entries are accepted and stored as typed', async () => {
  const c = await service.createCharacter({ name: 'Kit', ruleset: '2024' });
  const u = await service.updateCharacter(c.id, {
    choices: {
      ...c.choices,
      species: { name: 'Star Wisp' },
      background: { name: 'Lighthouse Keeper' },
      classes: [{ class: { name: 'Gloomstalker' }, subclass: { name: 'Umbral Path' }, level: 4 }],
      feats: [{ name: 'Moon Touched' }],
      skills: ['stealth', 'arcana']
    },
    equipment: [{ name: 'Lantern of Echoes', quantity: 1, notes: 'homebrew' }]
  });
  assert.equal(u.choices.species?.ref, undefined);
  const stored = await service.getById(c.id);
  assert.equal(stored?.choices.classes[0].subclass?.name, 'Umbral Path');
  assert.deepEqual(stored?.choices.skills, ['stealth', 'arcana']);
});

await test('normalizing trims text and drops blank rows instead of failing', async () => {
  const c = await service.createCharacter({ name: 'Lio', ruleset: '2024' });
  const u = await service.updateCharacter(c.id, {
    choices: {
      ...c.choices,
      species: { name: '  Elf  ', ref: 'race|elf|xphb' },
      background: { name: '   ' },
      classes: [{ class: { name: '' }, level: 1 }, { class: { name: ' Rogue ' }, subclass: { name: '' }, level: 2 }],
      feats: [{ name: '' }, { name: 'Alert ' }]
    },
    equipment: [{ name: '', quantity: 1 }, { name: ' Rope ', quantity: 1, notes: '  ' }]
  });
  assert.equal(u.choices.species?.name, 'Elf');
  assert.equal('background' in u.choices, false);
  assert.deepEqual(u.choices.classes, [{ class: { name: 'Rogue' }, level: 2 }]);
  assert.deepEqual(u.choices.feats, [{ name: 'Alert' }]);
  assert.deepEqual(u.equipment, [{ name: 'Rope', quantity: 1 }]);
});

await test('withName keeps a book pick until its text is edited', () => {
  assert.equal(model.withName(elf, 'Elf'), elf);
  assert.deepEqual(model.withName(elf, 'Elf of the Mist'), { name: 'Elf of the Mist' });
  assert.equal(model.withName(elf, '   '), undefined);
  assert.deepEqual(model.withName(undefined, 'Genasi'), { name: 'Genasi' });
});

const meta = (id: string, type: string, name: string, source: string, edition: '2014' | '2024') => ({ id, type, name, source, edition });
const catalog = [
  meta('race|elf|phb', 'race', 'Elf', 'PHB', '2014'),
  meta('race|aarakocra|eepc', 'race', 'Aarakocra', 'EEPC', '2014'),
  meta('race|human|phb', 'race', 'Human', 'PHB', '2014'),
  meta('subrace|high|phb|elf|phb', 'subrace', 'High', 'PHB', '2014'),
  meta('subrace|drow|phb|elf|phb', 'subrace', 'Drow', 'PHB', '2014'),
  meta('subrace|drow|mtf|elf|phb', 'subrace', 'Drow', 'MTF', '2014'),
  meta('race|elf|xphb', 'race', 'Elf', 'XPHB', '2024'),
  meta('race|dwarf|wow', 'race', 'Dwarf', 'WoW', '2024')
];

await test('speciesOptions filters by ruleset and lists core books first', () => {
  assert.deepEqual(species.speciesOptions(catalog, '2014').map((m) => m.id), ['race|elf|phb', 'race|human|phb', 'race|aarakocra|eepc']);
  assert.deepEqual(species.speciesOptions(catalog, '2024').map((m) => m.id), ['race|elf|xphb', 'race|dwarf|wow']);
});

await test('subrace ids map to their parent species', () => {
  assert.equal(species.baseSpeciesId('subrace|drow|phb|elf|phb'), 'race|elf|phb');
  assert.equal(species.baseSpeciesId('race|elf|phb'), null);
  assert.deepEqual(species.subspeciesOptions(catalog, 'race|elf|phb').map((m) => m.id), ['subrace|drow|mtf|elf|phb', 'subrace|drow|phb|elf|phb', 'subrace|high|phb|elf|phb']);
  assert.deepEqual(species.subspeciesOptions(catalog, 'race|elf|xphb'), []);
});

await test('chooseSpecies saves species and subrace, and changing species clears the subrace', async () => {
  const c = await service.createCharacter({ name: 'Hana', ruleset: '2014' });
  const a = await service.chooseSpecies(c.id, elf, highElf);
  assert.deepEqual(a.choices.species, elf);
  assert.deepEqual(a.choices.subspecies, highElf);
  const b = await service.chooseSpecies(c.id, human);
  assert.deepEqual(b.choices.species, human);
  assert.equal(b.choices.subspecies, undefined);
  const cleared = await service.chooseSpecies(c.id);
  assert.equal(cleared.choices.species, undefined);
});

await test('pickableOptions works for backgrounds: ruleset filter, core books first', () => {
  const bg = [
    meta('background|acolyte|phb', 'background', 'Acolyte', 'PHB', '2014'),
    meta('background|archaeologist|toa', 'background', 'Archaeologist', 'ToA', '2014'),
    meta('background|sage|phb', 'background', 'Sage', 'PHB', '2014'),
    meta('background|acolyte|xphb', 'background', 'Acolyte', 'XPHB', '2024'),
    meta('race|elf|phb', 'race', 'Elf', 'PHB', '2014')
  ];
  assert.deepEqual(options.pickableOptions(bg, 'background', '2014').map((m) => m.id), ['background|acolyte|phb', 'background|sage|phb', 'background|archaeologist|toa']);
  assert.deepEqual(options.pickableOptions(bg, 'background', '2024').map((m) => m.id), ['background|acolyte|xphb']);
});

await test('chooseBackground saves, replaces and clears, and keeps other choices', async () => {
  const c = await service.createCharacter({ name: 'Nia', ruleset: '2014' });
  await service.chooseSpecies(c.id, elf);
  const a = await service.chooseBackground(c.id, { name: 'Sage', ref: 'background|sage|phb' });
  assert.deepEqual(a.choices.background, { name: 'Sage', ref: 'background|sage|phb' });
  assert.deepEqual(a.choices.species, elf);
  const b = await service.chooseBackground(c.id, { name: 'Lighthouse Keeper' });
  assert.deepEqual((await service.getById(c.id))?.choices.background, { name: 'Lighthouse Keeper' });
  assert.equal(b.choices.background?.ref, undefined);
  const cleared = await service.chooseBackground(c.id);
  assert.equal('background' in cleared.choices, false);
  assert.deepEqual(cleared.choices.species, elf);
});

await test('a subrace from a different species is rejected by validation', () => {
  const c = model.newCharacter({ name: 'Ivo', ruleset: '2014' });
  c.choices.species = human;
  c.choices.subspecies = highElf;
  assert.ok(model.validateCharacter(c).length > 0);
  c.choices.species = elf;
  assert.deepEqual(model.validateCharacter(c), []);
});

await test('renaming a book species to a custom one keeps the variant name but drops its book link', async () => {
  const c = await service.createCharacter({ name: 'Jun', ruleset: '2014' });
  await service.chooseSpecies(c.id, elf, highElf);
  const stored = (await service.getById(c.id))!;
  const u = await service.updateCharacter(c.id, { choices: { ...stored.choices, species: model.withName(stored.choices.species, 'Moon Elf') } });
  assert.deepEqual(u.choices.species, { name: 'Moon Elf' });
  assert.deepEqual(u.choices.subspecies, { name: 'High' });
});

await test('a version 1 record is upgraded when read', async () => {
  const legacy = {
    id: 'legacy-1',
    schemaVersion: 1,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-02T00:00:00.000Z',
    details: { name: 'Old Timer', ruleset: '2014' },
    choices: {
      species: 'race|elf|phb',
      subspecies: 'subrace|high|phb|elf|phb',
      background: 'background|sage|phb',
      classes: [{ class: 'class|wizard|phb', subclass: 'subclass|evocation|wizard|phb|evocation', level: 3 }],
      abilityScores: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
      skills: [],
      feats: ['feat|alert|phb'],
      spells: ['spell|fireball|phb']
    },
    equipment: [{ name: 'Spellbook', quantity: 1 }],
    progression: { history: [] }
  };
  await db.characters.put(legacy as any);
  const c = (await service.getById('legacy-1'))!;
  assert.equal(c.schemaVersion, 2);
  assert.deepEqual(c.choices.species, { name: 'Elf', ref: 'race|elf|phb' });
  assert.deepEqual(c.choices.classes[0].class, { name: 'Wizard', ref: 'class|wizard|phb' });
  assert.deepEqual(c.choices.feats, [{ name: 'Alert', ref: 'feat|alert|phb' }]);
  assert.deepEqual(model.validateCharacter(c), []);
  assert.ok((await service.listAll()).some((x) => x.id === 'legacy-1' && x.schemaVersion === 2));
  // saving writes the upgraded shape back
  await service.updateCharacter('legacy-1', {});
  assert.equal(((await db.characters.get('legacy-1')) as any).schemaVersion, 2);
  await service.removeCharacter('legacy-1');
});

await test('remove deletes only that character', async () => {
  const before = await countCharacters();
  const c = await service.createCharacter({ name: 'Eli', ruleset: '2024' });
  await service.removeCharacter(c.id);
  assert.equal(await service.getById(c.id), undefined);
  assert.equal(await countCharacters(), before);
});

await test('the skill list has the 18 standard skills with unique keys', () => {
  assert.equal(SKILLS.length, 18);
  assert.equal(new Set(SKILLS.map((s) => s.key)).size, 18);
  assert.ok(SKILLS.every((s) => model.ABILITIES.includes(s.ability)));
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
    ['fractional level', (c) => (c.choices.classes = [{ class: { name: 'Rogue' }, level: 1.5 }])],
    ['level 21', (c) => (c.choices.classes = [{ class: { name: 'Rogue' }, level: 21 }])],
    ['class as bare string', (c) => (c.choices.classes = [{ class: 'class|rogue|xphb', level: 1 }])],
    ['species as bare string', (c) => (c.choices.species = 'race|elf|phb')],
    ['blank feat name', (c) => (c.choices.feats = [{ name: '' }])],
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
