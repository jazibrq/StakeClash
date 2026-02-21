export const SHARED_RESOURCES_KEY = 'stakeclash_resources';

export const INITIAL_RESOURCES = {
  ore: 1000,
  gold: 564,
  diamond: 276,
  mana: 821,
} as const;

export const RESOURCE_ICONS: Record<string, string> = {
  ore:     '/images/resources/orelogo.png',
  gold:    '/images/resources/goldlogo.png',
  diamond: '/images/resources/diamondlogo.png',
  mana:    '/images/resources/manalogo.png',
};
