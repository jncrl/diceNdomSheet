import { fetchAndBuild, DEFAULT_MIRROR } from '../src/lib/pipeline';
import { loadIndex, runSearch, type Filter } from '../src/lib/search';
import { parseInline, linkTarget, stripTags } from '../src/lib/tags';

// tag parser
console.log(stripTags('Roll {@dice 1d20 + 5|a check} vs {@dc 15}: {@b bold {@i nested}} {@spell fireball|phb} {@h}{@damage 8d6} fire.'));
console.log(JSON.stringify(linkTarget('spell', 'fireball|xphb|Fire!')), JSON.stringify(linkTarget('condition', 'Blinded')));

const { list, indexJson, entities } = await fetchAndBuild(DEFAULT_MIRROR);
const ms = loadIndex(indexJson);
const base: Filter = { types: ['spell'], edition: 'all', source: '', level: '', school: '', className: '' };
const show = (label: string, r: any[]) => console.log(label.padEnd(34), r.length, '|', r.slice(0, 4).map((m) => `${m.name} (${m.source})`).join(', '));
show('fireball (all)', runSearch(ms, list, 'fireball', base));
show('fireball (2024)', runSearch(ms, list, 'fireball', { ...base, edition: '2024' }));
show('magic mis (prefix)', runSearch(ms, list, 'magic mis', base));
show('fireball typo "firebal"', runSearch(ms, list, 'firebal', base));
show('text: "regain hit points" 2024', runSearch(ms, list, 'regain hit points', { ...base, edition: '2024' }));
show('wizard lvl3 evocation 2014', runSearch(ms, list, '', { ...base, edition: '2014', level: '3', school: 'V', className: 'Wizard' }));
show('feats 2024 "alert"', runSearch(ms, list, 'alert', { ...base, types: ['feat'], edition: '2024' }));
show('all types: "grappled"', runSearch(ms, list, 'grappled', { ...base, types: [...new Set(list.map((m) => m.type))] }));
const fb = entities.find((e) => e.id === 'spell|fireball|phb')!;
console.log('fireball classes:', fb.classes, '| school', fb.school);
const wiz = list.filter((m) => m.type === 'spell' && m.classes?.includes('Wizard')).length;
console.log('spells learnable by Wizard:', wiz);
console.log('index json MB:', (indexJson.length / 1e6).toFixed(1));

show('lvl3 evocation 2014 (any class)', runSearch(ms, list, '', { ...base, edition: '2014', level: '3', school: 'V' }));
console.log(runSearch(ms, list, '', { ...base, edition: '2014', level: '3', school: 'V' }).map((m) => m.name + '[' + m.source + ':' + (m.classes ?? []).join('/') + ']').join('; '));
