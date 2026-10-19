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
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

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

/**
 * Creates a new sentence or updates an existing sentence in Dexie.
 * If `captureId` is provided, marks that quick capture as processed in the same transaction.
 */
export async function saveSentence(sentenceInput, captureId = null) {
  const profile = (await db.user_profile.get('default')) || DEFAULT_PROFILE;
  const shortLang = getShortLangCode(profile.source_lang);
  const now = new Date().toISOString();

  const id =
    sentenceInput.id ||
    `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const existing = sentenceInput.id ? await db.sentences.get(sentenceInput.id) : null;

  const targetText = (sentenceInput.target_text || '').trim();
  const sourceText = (sentenceInput.source_text || '').trim();

  if (!targetText || !sourceText) {
    throw new Error('Both the Dutch sentence and translation are required.');
  }

  const mergedTranslations = {
    ...(existing?.translations || {}),
    ...(sentenceInput.translations || {}),
    [shortLang]: sourceText
  };

  // If user didn't have 'en' fallback set yet and is in 'en', or if new card, ensure fallback exists
  if (!mergedTranslations.en && shortLang === 'en') {
    mergedTranslations.en = sourceText;
  }

  const record = {
    id,
    pack_id: existing?.pack_id || sentenceInput.pack_id || 'custom',
    target_text: targetText,
    source_text: sourceText,
    translations: mergedTranslations,
    category: (sentenceInput.category || 'General').trim() || 'General',
    checkpoint_id: sentenceInput.checkpoint_id || existing?.checkpoint_id || 'any',
    notes: (sentenceInput.notes ?? existing?.notes ?? '').trim(),
    times_spoken_irl: existing?.times_spoken_irl ?? sentenceInput.times_spoken_irl ?? 0,
    mastery_level: existing?.mastery_level ?? sentenceInput.mastery_level ?? 0,
    in_daily_queue:
      typeof sentenceInput.in_daily_queue === 'number'
        ? sentenceInput.in_daily_queue
        : existing?.in_daily_queue ?? 0,
    last_practiced: existing?.last_practiced ?? null,
    created_at: existing?.created_at || now
  };

  await db.transaction('rw', db.sentences, db.quick_captures, async () => {
    await db.sentences.put(record);
    if (captureId) {
      await db.quick_captures.update(captureId, {
        processed: true,
        converted_sentence_id: id
      });
    }
  });

  return record;
}

/**
 * Deletes a sentence card from the local database.
 */
export async function deleteSentence(sentenceId) {
  if (!sentenceId) return;
  await db.sentences.delete(sentenceId);
}

/**
 * Toggles whether a sentence is pinned in Today's Daily Queue.
 */
export async function toggleDailyQueueMembership(sentenceId) {
  const sentence = await db.sentences.get(sentenceId);
  if (!sentence) return null;
  const nextFlag = sentence.in_daily_queue === 1 ? 0 : 1;
  await db.sentences.update(sentenceId, { in_daily_queue: nextFlag });
  return nextFlag === 1;
}

/**
 * Logs a fast 10-second Quick Capture note during a shift.
 */
export async function addQuickCapture(rawText) {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return null;

  const capture = {
    id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    raw_text: trimmed,
    created_at: new Date().toISOString(),
    processed: false
  };

  await db.quick_captures.put(capture);
  return capture;
}

/**
 * Deletes a quick capture note by ID.
 */
export async function deleteQuickCapture(captureId) {
  if (!captureId) return;
  await db.quick_captures.delete(captureId);
}

/**
 * Updates the processed status of a quick capture note.
 */
export async function setQuickCaptureProcessed(captureId, processed = true) {
  if (!captureId) return;
  await db.quick_captures.update(captureId, { processed: Boolean(processed) });
}

/**
 * Exports the entire local Dexie database (user_profile, sentences, quick_captures)
 * into a structured JSON object and triggers a downloadable .json backup file.
 */
export async function exportDatabaseAsJson() {
  const [userProfile, sentences, quickCaptures] = await Promise.all([
    db.user_profile.toArray(),
    db.sentences.toArray(),
    db.quick_captures.toArray()
  ]);

  const backupPayload = {
    app: 'DutchWorkdayCompanion',
    schema_version: 1,
    exported_at: new Date().toISOString(),
    data: {
      user_profile: userProfile,
      sentences,
      quick_captures: quickCaptures
    }
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `dutch-workday-backup-${dateStr}.json`;

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    filename,
    sentencesCount: sentences.length,
    capturesCount: quickCaptures.length
  };
}

/**
 * Imports data from a JSON backup file (or custom pack JSON) into Dexie.
 * @param {string|object} rawInput - Parsed JSON object or raw JSON string
 * @param {object} options - { mode: 'merge' | 'replace' }
 */
export async function importDatabaseFromJson(rawInput, options = { mode: 'merge' }) {
  const parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid JSON file format.');
  }

  // Support both full database backup format ({ data: { user_profile, sentences, quick_captures } })
  // and standalone job pack format ({ pack_id, sentences: [...] })
  const isFullBackup = Boolean(parsed.data && Array.isArray(parsed.data.sentences));
  const isJobPack = Boolean(!isFullBackup && Array.isArray(parsed.sentences));

  if (!isFullBackup && !isJobPack) {
    throw new Error('Unrecognized JSON structure. Expected a Dutch Workday backup or sentence pack.');
  }

  const mode = options?.mode || 'merge';
  let sentencesImported = 0;
  let capturesImported = 0;
  let profileRestored = false;

  await db.transaction('rw', db.user_profile, db.sentences, db.quick_captures, async () => {
    if (mode === 'replace' && isFullBackup) {
      await Promise.all([
        db.user_profile.clear(),
        db.sentences.clear(),
        db.quick_captures.clear()
      ]);
    }

    if (isFullBackup) {
      const { user_profile: profiles = [], sentences = [], quick_captures: captures = [] } = parsed.data;

      if (Array.isArray(profiles) && profiles.length > 0) {
        await db.user_profile.bulkPut(profiles);
        profileRestored = true;
      }

      if (Array.isArray(sentences) && sentences.length > 0) {
        if (mode === 'merge') {
          // When merging, preserve the higher spoken count / mastery if a sentence exists locally
          const existingMap = new Map(
            (await db.sentences.toArray()).map((s) => [s.id, s])
          );
          const mergedSentences = sentences.map((incoming) => {
            const existing = existingMap.get(incoming.id);
            if (!existing) return incoming;
            const bestSpoken = Math.max(
              existing.times_spoken_irl || 0,
              incoming.times_spoken_irl || 0
            );
            const bestMastery = Math.max(
              existing.mastery_level || 0,
              incoming.mastery_level || 0,
              bestSpoken >= 3 ? 5 : bestSpoken
            );
            return {
              ...existing,
              ...incoming,
              times_spoken_irl: bestSpoken,
              mastery_level: bestMastery,
              last_practiced:
                incoming.last_practiced && existing.last_practiced
                  ? incoming.last_practiced > existing.last_practiced
                    ? incoming.last_practiced
                    : existing.last_practiced
                  : incoming.last_practiced || existing.last_practiced
            };
          });
          await db.sentences.bulkPut(mergedSentences);
        } else {
          await db.sentences.bulkPut(sentences);
        }
        sentencesImported = sentences.length;
      }

      if (Array.isArray(captures) && captures.length > 0) {
        await db.quick_captures.bulkPut(captures);
        capturesImported = captures.length;
      }
    } else if (isJobPack) {
      const profile = (await db.user_profile.get('default')) || DEFAULT_PROFILE;
      const shortLang = getShortLangCode(profile.source_lang);
      const packId = parsed.pack_id || 'custom-pack';
      const now = new Date().toISOString();

      const existingMap = new Map(
        (await db.sentences.toArray()).map((s) => [s.id, s])
      );

      const formattedSentences = parsed.sentences.map((s, idx) => {
        const id = s.id || `${packId}-${idx + 1}`;
        const existing = existingMap.get(id);
        return {
          id,
          pack_id: s.pack_id || packId,
          source_text:
            s.source_text || s.translations?.[shortLang] || s.translations?.en || '',
          translations: s.translations || {},
          target_text: s.target_text,
          category: s.category || 'General',
          checkpoint_id: s.checkpoint_id || 'any',
          times_spoken_irl: existing?.times_spoken_irl ?? s.times_spoken_irl ?? 0,
          mastery_level: existing?.mastery_level ?? s.mastery_level ?? 0,
          in_daily_queue: existing?.in_daily_queue ?? 0,
          last_practiced: existing?.last_practiced ?? s.last_practiced ?? null,
          created_at: existing?.created_at ?? s.created_at ?? now,
          notes: s.notes || existing?.notes || ''
        };
      });

      await db.sentences.bulkPut(formattedSentences);
      sentencesImported = formattedSentences.length;
    }
  });

  // Ensure daily queue has items after import
  const queueCount = await db.sentences.where('in_daily_queue').equals(1).count();
  if (queueCount === 0) {
    const profile = await db.user_profile.get('default');
    await refreshDailyQueue(profile?.daily_goal_count || 5, true);
  }

  return {
    sentencesImported,
    capturesImported,
    profileRestored,
    mode
  };
}

