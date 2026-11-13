// Creation steps, in order. Adding a step means adding it here and rendering its
// component in CharacterEditor.svelte; nothing else needs to change.
export const creationSteps = [{ id: 'species', label: 'Species' }] as const;

export type CreationStepId = (typeof creationSteps)[number]['id'];
