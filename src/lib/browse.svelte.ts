export const CATEGORIES = [
  { id: 'spells', label: 'Spells', types: ['spell'] },
  { id: 'classes', label: 'Classes', types: ['class', 'subclass'] },
  { id: 'species', label: 'Species', types: ['race', 'subrace'] },
  { id: 'backgrounds', label: 'Backgrounds', types: ['background'] },
  { id: 'feats', label: 'Feats', types: ['feat'] },
  { id: 'items', label: 'Items', types: ['item', 'itemGroup', 'baseitem', 'magicvariant'] },
  { id: 'rules', label: 'Rules', types: ['variantrule', 'action', 'condition', 'disease', 'status', 'skill', 'sense'] },
  { id: 'options', label: 'Options', types: ['optionalfeature'] },
  { id: 'features', label: 'Features', types: ['classFeature', 'subclassFeature'] },
  { id: 'all', label: 'Everything', types: [] as string[] }
];

// Lives at module level so the search and filters survive opening an entry and coming back.
export const bs = $state({
  query: '',
  category: 'spells',
  edition: 'all' as 'all' | '2014' | '2024',
  source: '',
  level: '',
  school: '',
  className: '',
  limit: 50
});

export function resetFilters() {
  bs.source = '';
  bs.level = '';
  bs.school = '';
  bs.className = '';
  bs.limit = 50;
}
