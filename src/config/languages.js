export const SUPPORTED_LANGUAGES = [
  {
    code: 'en-US',
    shortCode: 'en',
    label: 'English',
    flag: '🇬🇧'
  },
  {
    code: 'it-IT',
    shortCode: 'it',
    label: 'Italiano',
    flag: '🇮🇹'
  },
  {
    code: 'es-ES',
    shortCode: 'es',
    label: 'Español',
    flag: '🇪🇸'
  },
  {
    code: 'pl-PL',
    shortCode: 'pl',
    label: 'Polski',
    flag: '🇵🇱'
  }
];

export const TARGET_LANGUAGE = {
  code: 'nl-NL',
  shortCode: 'nl',
  label: 'Nederlands',
  flag: '🇳🇱'
};

export function getShortLangCode(bcp47 = 'en-US') {
  return bcp47.split('-')[0].toLowerCase();
}
