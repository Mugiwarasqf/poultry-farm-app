/**
 * Poultry vaccine catalogue.
 *
 * Each vaccine carries the route it is given by, because the route decides
 * what a farmer needs to record: a drinking-water vaccine needs water-prep
 * guidance, an injection needs the site, a wing-web stab needs a "take" check.
 * `typicalAge` is the common timing in Nigerian layer/broiler programmes
 * (hatchery and feed-mill schedule cards) — guidance only; the farmer's vet
 * or hatchery schedule wins.
 *
 * `birds` limits a vaccine to certain bird types; omitted means any chicken
 * type. `laysEggsOnly` marks vaccines only given to egg-laying flocks.
 */

export const ROUTES = {
  water: {
    label: 'Drinking water',
    tip: 'Withhold water for 1–2 hours first so birds are thirsty. Use clean, non-chlorinated water with skimmed milk as a stabiliser, and make sure it is all drunk within 2 hours.',
  },
  eye_drop: {
    label: 'Eye / nose drop',
    tip: 'One drop per bird into the eye or nostril. Wait until the drop is absorbed before releasing the bird.',
  },
  injection: {
    label: 'Injection',
    tip: 'Use a clean needle and change it regularly. Keep the vaccine cold and use the vial within 2 hours of opening.',
  },
  wing_web: {
    label: 'Wing-web stab',
    tip: 'Stab the skin of the wing web, avoiding feathers and blood vessels. Check for a small scab ("take") 7–10 days later.',
  },
  spray: {
    label: 'Spray',
    tip: 'Coarse spray over the birds with ventilation off for 15–20 minutes, then back on.',
  },
};

const CHICKENS = ['layer', 'broiler', 'cockerel', 'noiler', 'chick'];

export const VACCINES = [
  { id: 'mareks', name: "Marek's Disease", route: 'injection', site: 'Under the skin of the neck (SC)', typicalAge: 'Day 1, usually done at the hatchery', birds: [...CHICKENS, 'turkey'] },
  { id: 'nd_hb1', name: 'Newcastle HB1 / I-2 (first dose)', route: 'eye_drop', typicalAge: 'Days 1–7', birds: CHICKENS },
  { id: 'ib', name: 'Infectious Bronchitis (IB)', route: 'eye_drop', typicalAge: 'Days 1–7, often combined with ND', birds: CHICKENS },
  { id: 'gumboro', name: 'Gumboro (IBD)', route: 'water', typicalAge: 'Days 10–14, repeat at days 18–24', birds: CHICKENS },
  { id: 'nd_lasota', name: 'Newcastle LaSota', route: 'water', typicalAge: 'Week 3, repeat every 6–8 weeks in layers', birds: [...CHICKENS, 'turkey', 'guinea_fowl'] },
  { id: 'fowl_pox', name: 'Fowl Pox', route: 'wing_web', typicalAge: 'Weeks 6–10', birds: [...CHICKENS, 'turkey', 'guinea_fowl'] },
  { id: 'nd_komarov', name: 'Newcastle Komarov', route: 'injection', site: 'Breast or thigh muscle (IM)', typicalAge: 'Week 8 onwards', birds: [...CHICKENS, 'turkey', 'guinea_fowl'] },
  { id: 'fowl_typhoid', name: 'Fowl Typhoid', route: 'injection', site: 'Breast muscle (IM) or under the neck skin', typicalAge: 'Weeks 8–10', birds: ['layer', 'cockerel', 'noiler', 'chick'] },
  { id: 'coryza', name: 'Infectious Coryza', route: 'injection', site: 'Breast muscle (IM) or under the neck skin', typicalAge: 'Weeks 8–12', birds: ['layer', 'cockerel', 'noiler', 'chick'] },
  { id: 'eds', name: 'Egg Drop Syndrome (EDS)', route: 'injection', site: 'Breast muscle (IM)', typicalAge: 'Weeks 16–18, before laying starts', birds: ['layer'], laysEggsOnly: true },
  { id: 'duck_plague', name: 'Duck Plague (DVE)', route: 'injection', site: 'Breast or thigh muscle (IM)', typicalAge: 'Week 3 onwards, booster yearly', birds: ['duck'] },
  { id: 'other', name: 'Other vaccine', route: null, typicalAge: null },
];

export const DOSE_NUMBERS = ['1st dose', '2nd dose', 'Booster'];
export const DOSES_PER_VIAL = [100, 200, 500, 1000, 2000];
export const REMINDER_OPTIONS = ['Day of', '1 day before', '3 days before', '5 days before', '7 days before'];

/** Vaccines that apply to a bird type. Unknown/blank type sees them all. */
export function vaccinesFor(birdType) {
  const type = (birdType || '').toLowerCase();
  if (!type) return VACCINES;
  return VACCINES.filter((v) => !v.birds || v.birds.includes(type) || v.id === 'other');
}

export function findVaccine(name) {
  return VACCINES.find((v) => v.name === name) || null;
}
