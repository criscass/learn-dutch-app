import { db, DEFAULT_PROFILE } from './database';
import hotelMaintenancePack from '../data/packs/hotel-maintenance.json';
import { getShortLangCode } from '../config/languages';

export const BUILT_IN_PACKS = {
  'hotel-maintenance': hotelMaintenancePack
};

/**
 * Ensures the database is initialized with a default user profile
 * and seeds the initial job pack if no sentences exist yet.
 */
export async function initializeDatabase() {
  let profile = await db.user_profile.get('default');
  if (!profile) {
    profile = { ...DEFAULT_PROFILE };
    await db.user_profile.put(profile);
  }

  const sentenceCount = await db.sentences.count();
  if (sentenceCount === 0) {
    await seedPack(profile.active_pack_id || 'hotel-maintenance', profile.source_lang);
    await refreshDailyQueue(profile.daily_goal_count || 5, true);
  } else {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentQueueCount = await db.sentences.where('in_daily_queue').equals(1).count();
    if (currentQueueCount === 0 || profile.last_queue_date !== todayStr) {
      await refreshDailyQueue(profile.daily_goal_count || 5, false);
    }
  }

  return profile;
}

/**
 * Seeds sentences from a pack into Dexie without overwriting user progress on existing IDs.
 */
export async function seedPack(packId, sourceLang = 'en-US') {
  const pack = BUILT_IN_PACKS[packId];
  if (!pack) {
    throw new Error(`Pack "${packId}" not found.`);
  }

  const shortLang = getShortLangCode(sourceLang);
  const now = new Date().toISOString();

  const existingIds = new Set(await db.sentences.where('pack_id').equals(packId).primaryKeys());

  const newSentences = pack.sentences
    .filter((s) => !existingIds.has(s.id))
    .map((s, index) => ({
      id: s.id,
      pack_id: packId,
      source_text: s.translations?.[shortLang] || s.translations?.en || '',
      translations: s.translations || {},
      target_text: s.target_text,
      category: s.category || 'General',
      checkpoint_id: s.checkpoint_id || 'any',
      times_spoken_irl: 0,
      mastery_level: 0,
      in_daily_queue: index < 5 ? 1 : 0,
      last_practiced: null,
      created_at: now,
      notes: s.notes || ''
    }));

  if (newSentences.length > 0) {
    await db.sentences.bulkPut(newSentences);
  }
}

/**
 * Updates the active source language in the user profile and refreshes `source_text`
 * on all sentences that have a translation for that language.
 */
export async function switchSourceLanguage(newSourceLang) {
  const shortLang = getShortLangCode(newSourceLang);
  await db.user_profile.update('default', { source_lang: newSourceLang });

  const allSentences = await db.sentences.toArray();
  const updated = allSentences.map((s) => {
    if (s.translations && s.translations[shortLang]) {
      return {
        ...s,
        source_text: s.translations[shortLang]
      };
    }
    return s;
  });

  await db.sentences.bulkPut(updated);
}

/**
 * Curates the Daily Queue (Default 5 sentences: 2 New, 2 Working, 1 Review).
 */
export async function refreshDailyQueue(goalCount = 5, forceNewSelection = false) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const profile = await db.user_profile.get('default');

  if (!forceNewSelection && profile?.last_queue_date === todayStr) {
    const existingQueue = await db.sentences.where('in_daily_queue').equals(1).count();
    if (existingQueue > 0) return;
  }

  const allSentences = await db.sentences.toArray();
  if (allSentences.length === 0) return;

  // Clear current queue flags
  const cleared = allSentences.map((s) => ({ ...s, in_daily_queue: 0 }));

  // Bucket sentences:
  // Working: spoken 1 or 2 times in real life (not yet mastered)
  const workingPool = cleared.filter((s) => s.times_spoken_irl > 0 && s.times_spoken_irl < 3);
  // New: spoken 0 times in real life
  const newPool = cleared.filter((s) => s.times_spoken_irl === 0);
  // Review: mastered (spoken >= 3 times)
  const reviewPool = cleared.filter((s) => s.times_spoken_irl >= 3);

  const selectedIds = new Set();

  const pickRandom = (pool, count) => {
    const available = pool.filter((s) => !selectedIds.has(s.id));
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    shuffled.slice(0, count).forEach((s) => selectedIds.add(s.id));
  };

  const targetWorking = Math.min(2, Math.ceil(goalCount * 0.4));
  const targetReview = reviewPool.length > 0 ? Math.min(1, Math.floor(goalCount * 0.2)) : 0;
  const targetNew = Math.max(1, goalCount - targetWorking - targetReview);

  pickRandom(workingPool, targetWorking);
  pickRandom(reviewPool, targetReview);
  pickRandom(newPool, targetNew);

  // Fill any remaining slots up to goalCount from New -> Working -> Review
  if (selectedIds.size < goalCount) {
    pickRandom(newPool, goalCount - selectedIds.size);
  }
  if (selectedIds.size < goalCount) {
    pickRandom(workingPool, goalCount - selectedIds.size);
  }
  if (selectedIds.size < goalCount) {
    pickRandom(reviewPool, goalCount - selectedIds.size);
  }

  const finalSentences = cleared.map((s) => ({
    ...s,
    in_daily_queue: selectedIds.has(s.id) ? 1 : 0
  }));

  await db.sentences.bulkPut(finalSentences);
  await db.user_profile.update('default', { last_queue_date: todayStr });
}

/**
 * Logs that a user spoke a sentence to a real person during their workday.
 * 3 real-world spoken logs = Mastered!
 */
export async function logSpokenInRealLife(sentenceId) {
  const sentence = await db.sentences.get(sentenceId);
  if (!sentence) return null;

  const newCount = (sentence.times_spoken_irl || 0) + 1;
  const newMastery = Math.min(5, newCount >= 3 ? 5 : newCount);

  await db.sentences.update(sentenceId, {
    times_spoken_irl: newCount,
    mastery_level: newMastery,
    last_practiced: new Date().toISOString()
  });

  return { newCount, isMastered: newCount >= 3 };
}

/**
 * Decrements spoken count (in case of accidental tap).
 */
export async function undoSpokenInRealLife(sentenceId) {
  const sentence = await db.sentences.get(sentenceId);
  if (!sentence || (sentence.times_spoken_irl || 0) <= 0) return null;

  const newCount = Math.max(0, sentence.times_spoken_irl - 1);
  const newMastery = newCount >= 3 ? 5 : newCount;

  await db.sentences.update(sentenceId, {
    times_spoken_irl: newCount,
    mastery_level: newMastery
  });

  return { newCount, isMastered: newCount >= 3 };
}
