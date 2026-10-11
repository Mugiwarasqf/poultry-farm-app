/**
 * Breeds offered in the Create Batch breed dropdown, per bird type (the
 * `value`s in BIRD_TYPES, lib/batch.js). These are the strains commonly sold
 * in Nigeria; anything missing is covered by "Other", where the farmer types
 * the name. Add a breed by adding it to its list here.
 */
export const OTHER_BREED = '__other__';

export const BREEDS = {
  layer: ['ISA Brown', 'Lohmann Brown', 'Hy-Line Brown', 'Bovans Brown', 'Hisex Brown', 'Shaver Brown', 'Dekalb Brown', 'Black Harco'],
  broiler: ['Cobb 500', 'Ross 308', 'Arbor Acres', 'Hubbard', 'Marshall', 'Anak'],
  noiler: ['Noiler (Amo)', 'Kuroiler', 'Sasso', 'FUNAAB Alpha', 'Shika Brown'],
  cockerel: ['Black Harco', 'ISA Brown', 'White cockerel', 'Local (indigenous)'],
  turkey: ['Broad Breasted White', 'Broad Breasted Bronze', 'Local turkey'],
  duck: ['Muscovy', 'Pekin', 'Khaki Campbell', 'Local duck'],
  guinea_fowl: ['Pearl (grey)', 'White', 'Lavender', 'Local guinea fowl'],
  quail: ['Japanese (Coturnix)', 'Jumbo Coturnix', 'Texas A&M (white)'],
};

/** The breeds for a bird type. Custom and legacy types have none, only "Other". */
export function breedsFor(type) {
  return BREEDS[(type || '').toLowerCase()] || [];
}
