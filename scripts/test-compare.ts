// Offline tests for the species comparison logic.
import assert from 'node:assert/strict';
import { buildComparison } from '../src/lib/compare';

let failed = 0;
const results: string[] = [];
function test(name: string, fn: () => void) {
  try {
    fn();
    results.push(`ok   ${name}`);
  } catch (e) {
    failed++;
    results.push(`FAIL ${name}\n     ${(e as Error).message}`);
  }
}

const trait = (name: string) => ({ type: 'entries', name, entries: [`${name} text`] });
const entity = (id: string, name: string, source: string, edition: '2014' | '2024', json: Record<string, unknown>) => ({ id, type: 'race', name, source, edition, json: { name, source, ...json } }) as any;

// Shapes copied from the real Volo's, Eberron and Monsters of the Multiverse Bugbears.
const vgm = entity('race|bugbear|vgm', 'Bugbear', 'VGM', '2014', {
  size: ['M'], speed: 30, ability: [{ str: 2, dex: 1 }], darkvision: 60,
  skillProficiencies: [{ stealth: true }], languageProficiencies: [{ common: true, goblin: true }],
  entries: [trait('Age'), trait('Size'), trait('Darkvision'), trait('Long-Limbed'), trait('Powerful Build'), trait('Sneaky'), trait('Surprise Attack'), trait('Languages')]
});
const mpmm = entity('race|bugbear|mpmm', 'Bugbear', 'MPMM', '2014', {
  size: ['M'], speed: { walk: 30 }, creatureTypes: ['humanoid'], darkvision: 60, skillProficiencies: [{ stealth: true }],
  entries: [trait('Creature Type'), trait('Darkvision'), trait('Fey Ancestry'), trait('Long-Limbed'), trait('Powerful Build'), trait('Sneaky'), trait('Surprise Attack')]
});
const sources: Record<string, string> = { VGM: "Volo's Guide to Monsters", MPMM: 'Monsters of the Multiverse' };

test('columns carry source, source name and edition', () => {
  const c = buildComparison([vgm, mpmm], (s) => sources[s] ?? s);
  assert.deepEqual(c.columns.map((x) => [x.id, x.source, x.sourceName, x.edition]), [
    ['race|bugbear|vgm', 'VGM', "Volo's Guide to Monsters", '2014'],
    ['race|bugbear|mpmm', 'MPMM', 'Monsters of the Multiverse', '2014']
  ]);
});

test('facts line up per version and flag only the rows that differ', () => {
  const rows = Object.fromEntries(buildComparison([vgm, mpmm]).facts.map((r) => [r.label, r]));
  assert.deepEqual(rows['Size'].values, ['Medium', 'Medium']);
  assert.equal(rows['Size'].differs, false);
  assert.deepEqual(rows['Speed'].values, ['30 ft.', '30 ft.']); // number and { walk } compare equal
  assert.equal(rows['Speed'].differs, false);
  assert.deepEqual(rows['Ability scores'].values, ['Strength +2, Dexterity +1', '\u2014']);
  assert.equal(rows['Ability scores'].differs, true);
  assert.deepEqual(rows['Creature type'].values, ['\u2014', 'Humanoid']);
  assert.deepEqual(rows['Languages'].values, ['Common, Goblin', '\u2014']);
  assert.deepEqual(rows['Skills'].values, ['Stealth', 'Stealth']);
  assert.equal(rows['Darkvision'].differs, false);
});

test('rows that are empty for every version are left out', () => {
  const labels = buildComparison([vgm, mpmm]).facts.map((r) => r.label);
  assert.ok(!labels.includes('Resistances'));
  assert.ok(!labels.includes('Feat'));
});

test('traits are matched by name; fact-like and flavour entries are skipped', () => {
  const t = buildComparison([vgm, mpmm]).traits;
  assert.deepEqual(t.map((x) => x.name), ['Long-Limbed', 'Powerful Build', 'Sneaky', 'Surprise Attack', 'Fey Ancestry']);
  const fey = t.find((x) => x.key === 'fey ancestry')!;
  assert.deepEqual(fey.present, [false, true]);
  assert.equal(fey.differs, true);
  assert.equal(fey.entries[0], undefined);
  assert.equal((fey.entries[1] as any).name, 'Fey Ancestry');
  assert.equal(t.find((x) => x.key === 'sneaky')!.differs, false);
});

test('ability choices are described in words', () => {
  const flex = entity('race|x|mpmm', 'X', 'MPMM', '2014', { ability: [{ cha: 2, choose: { from: ['str', 'dex', 'con', 'int', 'wis'], count: 2 } }] });
  const weighted = entity('race|y|tce', 'Y', 'TCE', '2014', { ability: [{ choose: { weighted: { from: ['str', 'dex', 'con', 'int', 'wis', 'cha'], weights: [2, 1] } } }] });
  const some = entity('race|z|phb', 'Z', 'PHB', '2014', { ability: [{ str: 1, choose: { from: ['dex', 'wis'], amount: 1 } }, { con: 2 }] });
  const row = buildComparison([flex, weighted, some]).facts.find((r) => r.label === 'Ability scores')!;
  assert.equal(row.values[0], 'Charisma +2, +1 to 2 scores (Strength/Dexterity/Constitution/Intelligence/Wisdom)');
  assert.equal(row.values[1], '+2, +1 to scores of your choice');
  assert.equal(row.values[2], 'Strength +1, +1 to 1 score (Dexterity/Wisdom) or Constitution +2');
});

test('2024 style data: creature type, feat, flexible language choice', () => {
  const human = entity('race|human|xphb', 'Human', 'XPHB', '2024', {
    size: ['M', 'S'], speed: 30, creatureTypes: ['humanoid'], skillProficiencies: [{ any: 1 }], languageProficiencies: [{ common: true, anyStandard: 1 }], feats: [{ 'skilled|xphb': true }]
  });
  const rows = Object.fromEntries(buildComparison([human, human]).facts.map((r) => [r.label, r.values[0]]));
  assert.equal(rows['Size'], 'Medium or Small');
  assert.equal(rows['Skills'], '1 of your choice');
  assert.equal(rows['Languages'], 'Common, 1 of your choice');
  assert.equal(rows['Feat'], 'Skilled');
});

// Shapes copied from the real Player's Handbook (2014) and 2024 Player's Handbook Acolytes.
const background = (e: any) => ({ ...e, type: 'background' });
const acolyte14 = background(entity('background|acolyte|phb', 'Acolyte', 'PHB', '2014', {
  skillProficiencies: [{ insight: true, religion: true }], languageProficiencies: [{ anyStandard: 2 }],
  startingEquipment: [
    { _: [{ item: 'holy symbol|phb', displayName: 'holy symbol' }, { special: 'sticks of incense', quantity: 5 }, 'common clothes|phb', { item: 'pouch|phb', containsValue: 1500 }] },
    { a: [{ item: 'book|phb', displayName: 'prayer book' }], b: [{ special: 'prayer wheel' }] }
  ],
  entries: [{ type: 'list', items: [] }, trait('Feature: Shelter of the Faithful'), trait('Suggested Characteristics')]
}));
const acolyte24 = background(entity('background|acolyte|xphb', 'Acolyte', 'XPHB', '2024', {
  skillProficiencies: [{ insight: true, religion: true }], toolProficiencies: [{ "calligrapher's supplies": true }],
  ability: [{ choose: { weighted: { from: ['int', 'wis', 'cha'], weights: [2, 1] } } }, { choose: { weighted: { from: ['int', 'wis', 'cha'], weights: [1, 1, 1] } } }],
  feats: [{ 'magic initiate; cleric|xphb': true }],
  startingEquipment: [{ A: [{ item: 'book|xphb', displayName: 'Book (Prayers)' }, { item: 'parchment|xphb', quantity: 10 }, { value: 800 }], B: [{ value: 5000 }] }],
  entries: [{ type: 'list', items: [] }]
}));

test('backgrounds use their own fact rows, in order', () => {
  const c = buildComparison([acolyte14, acolyte24]);
  assert.deepEqual(c.facts.map((r) => r.label), ['Ability scores', 'Feat', 'Skills', 'Tools', 'Languages', 'Equipment']);
  const rows = Object.fromEntries(c.facts.map((r) => [r.label, r]));
  assert.deepEqual(rows['Ability scores'].values, ['\u2014', '+2, +1 to Intelligence/Wisdom/Charisma or +1, +1, +1 to Intelligence/Wisdom/Charisma']);
  assert.deepEqual(rows['Feat'].values, ['\u2014', 'Magic Initiate; Cleric']);
  assert.equal(rows['Skills'].differs, false);
  assert.deepEqual(rows['Languages'].values, ['2 of your choice', '\u2014']);
  assert.deepEqual(rows['Tools'].values, ['\u2014', "Calligrapher's Supplies"]);
});

test('starting equipment lists fixed items then lettered either/or packages', () => {
  const eq = buildComparison([acolyte14, acolyte24]).facts.find((r) => r.label === 'Equipment')!;
  assert.equal(eq.values[0], 'holy symbol, 5 sticks of incense, common clothes, pouch; (A) prayer book or (B) prayer wheel');
  assert.equal(eq.values[1], '(A) Book (Prayers), 10 parchment, 8 gp or (B) 50 gp');
});

test('background traits keep the feature and skip flavour tables', () => {
  const t = buildComparison([acolyte14, acolyte24]).traits;
  assert.deepEqual(t.map((x) => x.name), ['Feature: Shelter of the Faithful']);
  assert.deepEqual(t[0].present, [true, false]);
});

test('any-choice proficiencies read naturally', () => {
  const crim = entity('background|criminal|phb', 'Criminal', 'PHB', '2014', { toolProficiencies: [{ anyGamingSet: 1, "thieves' tools": true }] });
  const folk = entity('background|folk hero|phb', 'Folk Hero', 'PHB', '2014', { toolProficiencies: [{ anyArtisansTool: 1, 'vehicles (land)': true }] });
  const row = buildComparison([crim, folk].map(background)).facts.find((r) => r.label === 'Tools')!;
  assert.deepEqual(row.values, ["1 gaming set of your choice, Thieves' Tools", '1 artisans tool of your choice, Vehicles (Land)']);
});

console.log(results.join('\n'));
console.log(failed ? `\n${failed} test(s) failed` : `\nall ${results.length} tests passed`);
process.exit(failed ? 1 : 0);
