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
  assert.deepEqual(rows['Ability scores'].values, ['Strength +2, Dexterity +1', '—']);
  assert.equal(rows['Ability scores'].differs, true);
  assert.deepEqual(rows['Creature type'].values, ['—', 'Humanoid']);
  assert.deepEqual(rows['Languages'].values, ['Common, Goblin', '—']);
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
  assert.deepEqual(rows['Ability scores'].values, ['—', '+2, +1 to Intelligence/Wisdom/Charisma or +1, +1, +1 to Intelligence/Wisdom/Charisma']);
  assert.deepEqual(rows['Feat'].values, ['—', 'Magic Initiate; Cleric']);
  assert.equal(rows['Skills'].differs, false);
  assert.deepEqual(rows['Languages'].values, ['2 of your choice', '—']);
  assert.deepEqual(rows['Tools'].values, ['—', "Calligrapher's Supplies"]);
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

// Shapes copied from the real Wizard (2014 and 2024) and a Wizard subclass.
const wizard14 = { ...entity('class|wizard|phb', 'Wizard', 'PHB', '2014', {
  hd: { number: 1, faces: 6 }, proficiency: ['int', 'wis'], spellcastingAbility: 'int', casterProgression: 'full', subclassTitle: 'Arcane Tradition',
  multiclassing: { requirements: { int: 13 } },
  startingProficiencies: { skills: [{ choose: { from: ['arcana', 'history'], count: 2 } }], weapons: ['{@item dagger|phb|daggers}', '{@item quarterstaff|phb|quarterstaffs}'] },
  startingEquipment: { defaultData: [{ a: [{ item: 'quarterstaff|phb' }], b: [{ item: 'dagger|phb' }] }] },
  classFeatures: ['Spellcasting|Wizard||1', 'Arcane Recovery|Wizard||1', { classFeature: 'Arcane Tradition|Wizard||2', gainSubclassFeature: true }, 'Ability Score Improvement|Wizard||4', 'Ability Score Improvement|Wizard||8']
}), type: 'class' };
const wizard24 = { ...entity('class|wizard|xphb', 'Wizard', 'XPHB', '2024', {
  hd: { number: 1, faces: 6 }, proficiency: ['int', 'wis'], spellcastingAbility: 'int', casterProgression: 'full', subclassTitle: 'Wizard Subclass',
  primaryAbility: [{ int: true }], multiclassing: {},
  startingProficiencies: { skills: [{ choose: { from: ['arcana', 'history'], count: 2 } }], weapons: ['simple'], armor: ['light'] },
  classFeatures: ['Spellcasting|Wizard|XPHB|1', 'Ritual Adept|Wizard|XPHB|1', 'Arcane Recovery|Wizard|XPHB|1', { classFeature: 'Wizard Subclass|Wizard|XPHB|3', gainSubclassFeature: true }, 'Ability Score Improvement|Wizard|XPHB|4']
}), type: 'class' };

test('class facts: hit die, saves, proficiencies, spellcasting and multiclassing', () => {
  const rows = Object.fromEntries(buildComparison([wizard14, wizard24]).facts.map((r) => [r.label, r]));
  assert.deepEqual(rows['Hit die'].values, ['d6', 'd6']);
  assert.equal(rows['Hit die'].differs, false);
  assert.deepEqual(rows['Saving throws'].values, ['Intelligence, Wisdom', 'Intelligence, Wisdom']);
  assert.deepEqual(rows['Primary ability'].values, ['—', 'Intelligence']);
  assert.deepEqual(rows['Weapons'].values, ['daggers, quarterstaffs', 'Simple']);
  assert.deepEqual(rows['Armor'].values, ['—', 'Light']);
  assert.deepEqual(rows['Spellcasting'].values, ['Intelligence (full caster)', 'Intelligence (full caster)']);
  assert.deepEqual(rows['Subclass'].values, ['Arcane Tradition', 'Wizard Subclass']);
  assert.deepEqual(rows['Multiclassing'].values, ['Intelligence 13', '—']);
  assert.equal(rows['Equipment'].values[0], '(A) quarterstaff or (B) dagger');
  assert.match(rows['Skills'].values[0], /^choose 2 from Arcana, History$/);
});

test('multiclassing requirements: all of them, or any of them', () => {
  const both = { ...wizard14, json: { ...wizard14.json, multiclassing: { requirements: { str: 13, cha: 13 } } } };
  const either = { ...wizard14, json: { ...wizard14.json, multiclassing: { requirements: { or: [{ str: 13, dex: 13 }] } } } };
  const row = buildComparison([both, either]).facts.find((r) => r.label === 'Multiclassing')!;
  assert.deepEqual(row.values, ['Strength 13, Charisma 13', 'Strength 13 or Dexterity 13']);
});

test('class features are matched by name and show the levels they arrive at', () => {
  const t = Object.fromEntries(buildComparison([wizard14, wizard24]).traits.map((x) => [x.name, x]));
  assert.deepEqual(t['Arcane Recovery'].cells, ['Level 1', 'Level 1']);
  assert.equal(t['Arcane Recovery'].differs, false);
  assert.deepEqual(t['Ability Score Improvement'].cells, ['Level 4, 8', 'Level 4']);
  assert.equal(t['Ability Score Improvement'].differs, true);
  assert.deepEqual(t['Arcane Tradition'].cells, ['Level 2', '—']);
  assert.deepEqual(t['Ritual Adept'].cells, ['—', 'Level 1']);
  assert.ok(t['Ritual Adept'].entries.every((x) => x === undefined));
});

test('subclass comparison shows its class and feature levels', () => {
  const evo = { ...entity('subclass|school of evocation|phb|evocation|wizard|phb', 'School of Evocation', 'PHB', '2014', {
    className: 'Wizard', subclassFeatures: ['School of Evocation|Wizard||Evocation||2', 'Potent Cantrip|Wizard||Evocation||6']
  }), type: 'subclass' };
  const evoker = { ...entity('subclass|evoker|xphb|evoker|wizard|xphb', 'Evoker', 'XPHB', '2024', {
    className: 'Wizard', subclassFeatures: ['Evoker|Wizard|XPHB|Evoker|XPHB|3', 'Potent Cantrip|Wizard|XPHB|Evoker|XPHB|3']
  }), type: 'subclass' };
  const c = buildComparison([evo, evoker]);
  assert.deepEqual(c.facts.map((r) => [r.label, r.values]), [['Class', ['Wizard', 'Wizard']]]);
  assert.deepEqual(c.traits.find((x) => x.name === 'Potent Cantrip')!.cells, ['Level 6', 'Level 3']);
});

console.log(results.join('\n'));
console.log(failed ? `\n${failed} test(s) failed` : `\nall ${results.length} tests passed`);
process.exit(failed ? 1 : 0);
