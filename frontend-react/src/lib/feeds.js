/**
 * Feed catalogue and the farm's feed store.
 *
 * Feed is bought for the farm (a purchase adds bags to the store) and used by
 * batches (a usage entry takes bags out). A "stock line" is one kind of feed
 * in the store: feed type + brand + bag size, because 10 bags of Chikun layer
 * mash and 10 bags of Top Feeds layer mash are not interchangeable stock and
 * usually cost different amounts.
 *
 * gPerBirdDay is a rough daily intake for that stage, used only to show
 * "about how much this batch should eat" next to the usage form. It is a
 * guide from common Nigerian feed-mill charts, not a target, and is left out
 * where intake varies too much to be useful.
 */

import { FEED_BAG_KG } from './batch';
import { toIso } from './supplements';

export const FEED_TYPES = [
  { id: 'chick_mash', label: 'Chick / Starter mash', stage: 'Weeks 0–8', birds: ['layer', 'cockerel', 'noiler', 'chick'], gPerBirdDay: 30 },
  { id: 'grower_mash', label: 'Grower mash', stage: 'Weeks 9–16', birds: ['layer', 'cockerel', 'noiler', 'chick', 'duck', 'guinea_fowl'], gPerBirdDay: 70 },
  { id: 'pre_layer', label: 'Pre-layer / Developer', stage: 'Weeks 16–20, before first egg', birds: ['layer'], gPerBirdDay: 90 },
  { id: 'layer_mash', label: 'Layer mash', stage: 'From first egg', birds: ['layer'], gPerBirdDay: 115 },
  { id: 'broiler_starter', label: 'Broiler starter', stage: 'Weeks 0–3', birds: ['broiler'], gPerBirdDay: 45 },
  { id: 'broiler_finisher', label: 'Broiler finisher', stage: 'Week 4 to sale', birds: ['broiler'], gPerBirdDay: 150 },
  { id: 'turkey_feed', label: 'Turkey starter / grower', stage: 'Turkeys', birds: ['turkey'] },
  { id: 'concentrate', label: 'Concentrate', stage: 'For mixing your own feed' },
  { id: 'other', label: 'Other feed' },
];

export const FEED_BRANDS = ['Chikun', 'Top Feeds', 'Hybrid', 'Vital Feed', 'Ultima', 'Amo', 'Animal Care', 'New Hope', 'Own mix'];

export function findFeedType(label) {
  return FEED_TYPES.find((t) => t.label.toLowerCase() === (label || '').trim().toLowerCase()) || null;
}

/** Whole weeks old a batch is today, counting its age at placement. */
export function batchAgeWeeks(batch) {
  if (!batch?.startDate) return Number(batch?.initialAgeWeeks) || 0;
  const days = Math.max(0, Math.floor((Date.now() - new Date(batch.startDate)) / 86400000));
  return Math.floor(days / 7) + (Number(batch.initialAgeWeeks) || 0);
}

/** The feed a batch of this type and age would normally be on. */
export function recommendedFeedId(batch) {
  const type = (batch?.type || '').toLowerCase();
  const weeks = batchAgeWeeks(batch);
  if (type === 'broiler') return weeks < 4 ? 'broiler_starter' : 'broiler_finisher';
  if (type === 'layer') {
    if (weeks < 9) return 'chick_mash';
    if (weeks < 16) return 'grower_mash';
    if (weeks < 20) return 'pre_layer';
    return 'layer_mash';
  }
  if (['cockerel', 'noiler', 'chick'].includes(type)) return weeks < 9 ? 'chick_mash' : 'grower_mash';
  if (type === 'turkey') return 'turkey_feed';
  return null;
}

/** Roughly how many bags a day this batch eats of this feed, or null. */
export function expectedBagsPerDay(batch, feedTypeLabel, bagSizeKg = FEED_BAG_KG) {
  const grams = findFeedType(feedTypeLabel)?.gPerBirdDay;
  const birds = Number(batch?.birdCount) || 0;
  if (!grams || !birds) return null;
  return (birds * grams) / 1000 / (Number(bagSizeKg) || FEED_BAG_KG);
}

const norm = (s) => (s || '').trim().toLowerCase();

export function stockKey({ feedType, brand, bagSizeKg }) {
  return `${norm(feedType)}|${norm(brand)}|${Number(bagSizeKg) || FEED_BAG_KG}`;
}

function usageBags(log) {
  if (log.bags != null) return Number(log.bags) || 0;
  return (Number(log.amountKg) || 0) / (Number(log.bagSizeKg) || FEED_BAG_KG);
}

/**
 * Stock on hand per stock line.
 *
 * Returns { lines, untracked }:
 *  lines     — one per feed type + brand + bag size that was ever bought,
 *              with bought / used / left bags, average price per bag, stock
 *              value, recent daily use and days left at that rate.
 *  untracked — usage entries that don't match anything bought (logged before
 *              the store existed, or recorded as "not from the store"), kept
 *              out of the stock maths so they can't push it negative.
 */
export function computeFeedStock(purchases = [], usage = []) {
  const today = toIso(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoIso = toIso(weekAgo);

  const lines = new Map();
  purchases.forEach((p) => {
    const key = stockKey(p);
    if (!lines.has(key)) {
      lines.set(key, {
        key,
        feedType: p.feedType,
        brand: p.brand || '',
        bagSizeKg: Number(p.bagSizeKg) || FEED_BAG_KG,
        bought: 0,
        used: 0,
        pricedBags: 0,
        spent: 0,
        usedLastWeek: 0,
        lastBought: '',
        bestBefore: '',
      });
    }
    const line = lines.get(key);
    const bags = Number(p.bags) || 0;
    line.bought += bags;
    if (Number(p.pricePerBagNaira) > 0) {
      line.pricedBags += bags;
      line.spent += bags * Number(p.pricePerBagNaira);
    }
    if (!line.lastBought || p.date > line.lastBought) line.lastBought = p.date;
    // The soonest best-before that hasn't passed is the one to watch.
    if (p.bestBefore && p.bestBefore >= today && (!line.bestBefore || p.bestBefore < line.bestBefore)) {
      line.bestBefore = p.bestBefore;
    }
  });

  const untracked = [];
  usage.forEach((u) => {
    const line = lines.get(stockKey(u));
    if (!line) {
      untracked.push(u);
      return;
    }
    const bags = usageBags(u);
    line.used += bags;
    if (u.date && u.date > weekAgoIso && u.date <= today) line.usedLastWeek += bags;
  });

  const result = [...lines.values()].map((line) => {
    const left = Math.round((line.bought - line.used) * 100) / 100;
    const avgPrice = line.pricedBags ? line.spent / line.pricedBags : null;
    const perDay = line.usedLastWeek / 7;
    const daysLeft = perDay > 0 ? Math.floor(Math.max(left, 0) / perDay) : null;
    const status = left <= 0 ? 'out' : (daysLeft != null && daysLeft <= 7) || left <= 2 ? 'low' : 'ok';
    return {
      ...line,
      left,
      avgPrice,
      value: avgPrice ? Math.max(left, 0) * avgPrice : 0,
      perDay,
      daysLeft,
      status,
      label: [line.feedType, line.brand].filter(Boolean).join(' · '),
    };
  });

  // Lines still in stock first, then by name.
  result.sort((a, b) => (b.left > 0) - (a.left > 0) || a.label.localeCompare(b.label));
  return { lines: result, untracked };
}

export function formatNaira(n) {
  return `₦${Math.round(Number(n) || 0).toLocaleString()}`;
}
