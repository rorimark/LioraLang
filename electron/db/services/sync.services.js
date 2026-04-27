import { getDatabase } from "../db.js";
import {
  createDeckSyncId,
  getProfileRuntimeState,
  GUEST_PROFILE_SCOPE,
  mergeSyncRuntimeState,
  normalizeProfileScope,
  normalizeSyncRuntimeState,
  SYNC_RUNTIME_STATE_KEY,
} from "../../../packages/shared/src/core/usecases/sync/index.js";

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toPositiveInteger = (value, fallback = 0) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.trunc(numericValue);
};

const toIsoTimestamp = (value = Date.now()) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const parseJsonObject = (value) => {
  if (typeof value !== "string") {
    return {};
  }

  try {
    const parsedValue = JSON.parse(value);
    return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
      ? parsedValue
      : {};
  } catch {
    return {};
  }
};

const serializeJson = (value) => {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
};

const readRuntimeState = (db = getDatabase()) => {
  const row = db
    .prepare(
      `
        SELECT value
        FROM app_settings
        WHERE key = ?
      `,
    )
    .get(SYNC_RUNTIME_STATE_KEY);

  return normalizeSyncRuntimeState(parseJsonObject(row?.value));
};

const writeRuntimeState = (nextRuntimeState, db = getDatabase()) => {
  const normalizedRuntimeState = normalizeSyncRuntimeState(nextRuntimeState);

  db.prepare(
    `
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `,
  ).run(SYNC_RUNTIME_STATE_KEY, serializeJson(normalizedRuntimeState));

  return normalizedRuntimeState;
};

const updateRuntimeState = (patch, db = getDatabase()) => {
  const currentRuntimeState = readRuntimeState(db);
  const nextRuntimeState = mergeSyncRuntimeState(currentRuntimeState, patch);
  return writeRuntimeState(nextRuntimeState, db);
};

const toReplayCardRecord = (logRow, profileScope) => {
  const payload = parseJsonObject(logRow?.payload_json);
  const nextCard = payload?.nextCard && typeof payload.nextCard === "object" ? payload.nextCard : null;
  const wordId = Number(logRow?.word_id);
  const deckId = Number(logRow?.deck_id);

  if (!nextCard || !Number.isInteger(wordId) || wordId <= 0 || !Number.isInteger(deckId) || deckId <= 0) {
    return null;
  }

  return {
    wordId,
    state: toCleanString(nextCard.state) || "new",
    learningStep: toPositiveInteger(nextCard.learningStep, 0),
    dueAt: toCleanString(nextCard.dueAt) || null,
    intervalDays: toPositiveInteger(nextCard.intervalDays, 1),
    easeFactor: Number(nextCard.easeFactor) || 2.5,
    reps: toPositiveInteger(nextCard.reps, 0),
    lapses: toPositiveInteger(nextCard.lapses, 0),
    lastReviewedAt: toCleanString(logRow?.reviewed_at) || toIsoTimestamp(),
    profileScope,
  };
};

export const activateProgressProfile = (
  profileScope = GUEST_PROFILE_SCOPE,
  options = {},
) => {
  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  const currentRuntimeState = readRuntimeState(db);
  const force = Boolean(options?.force);

  if (
    !force &&
    currentRuntimeState.activeProfileScope === normalizedProfileScope &&
    currentRuntimeState.lastActivatedAt
  ) {
    return currentRuntimeState;
  }

  const reviewLogs = db
    .prepare(
      `
        SELECT
          id,
          word_id,
          deck_id,
          reviewed_at,
          payload_json
        FROM review_logs
        WHERE profile_scope = ?
        ORDER BY reviewed_at ASC, id ASC
      `,
    )
    .all(normalizedProfileScope);

  const latestLogByWordId = new Map();

  reviewLogs.forEach((logRow) => {
    const wordId = Number(logRow?.word_id);

    if (!Number.isInteger(wordId) || wordId <= 0) {
      return;
    }

    latestLogByWordId.set(wordId, logRow);
  });

  const replayCards = [...latestLogByWordId.values()]
    .map((logRow) => toReplayCardRecord(logRow, normalizedProfileScope))
    .filter(Boolean);

  const transaction = db.transaction(() => {
    if (normalizedProfileScope === GUEST_PROFILE_SCOPE && replayCards.length === 0) {
      db.prepare(
        `
          UPDATE review_cards
          SET profile_scope = ?
        `,
      ).run(GUEST_PROFILE_SCOPE);

      writeRuntimeState(
        {
          ...currentRuntimeState,
          activeProfileScope: normalizedProfileScope,
          lastActivatedAt: toIsoTimestamp(),
        },
        db,
      );
      return;
    }

    db.prepare("DELETE FROM review_cards").run();

    const insertCardStatement = db.prepare(
      `
        INSERT INTO review_cards (
          word_id,
          state,
          learning_step,
          due_at,
          interval_days,
          ease_factor,
          reps,
          lapses,
          last_reviewed_at,
          profile_scope
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    replayCards.forEach((card) => {
      insertCardStatement.run(
        card.wordId,
        card.state,
        card.learningStep,
        card.dueAt,
        card.intervalDays,
        card.easeFactor,
        card.reps,
        card.lapses,
        card.lastReviewedAt,
        card.profileScope,
      );
    });

    writeRuntimeState(
      {
        ...currentRuntimeState,
        activeProfileScope: normalizedProfileScope,
        lastActivatedAt: toIsoTimestamp(),
      },
      db,
    );
  });

  transaction();
  return readRuntimeState(db);
};

export const ensureSyncDeviceIdentity = ({
  platform = "desktop",
  deviceName = "Desktop app",
  appVersion = "",
} = {}) => {
  const db = getDatabase();
  const currentRuntimeState = readRuntimeState(db);

  if (currentRuntimeState.deviceId) {
    return updateRuntimeState(
      {
        deviceName,
        platform,
        appVersion,
      },
      db,
    );
  }

  return writeRuntimeState(
    {
      ...currentRuntimeState,
      deviceId: createDeckSyncId(),
      deviceName,
      platform,
      appVersion,
    },
    db,
  );
};

export const getNextDeviceSequence = (profileScope = GUEST_PROFILE_SCOPE) => {
  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  const currentRuntimeState = readRuntimeState(db);
  const currentProfileState = getProfileRuntimeState(currentRuntimeState, normalizedProfileScope);
  const nextValue = currentProfileState.lastDeviceSeq + 1;

  updateRuntimeState(
    {
      profiles: {
        [normalizedProfileScope]: {
          ...currentProfileState,
          lastDeviceSeq: nextValue,
        },
      },
    },
    db,
  );

  return nextValue;
};

export const getSyncRuntimeState = () => {
  return readRuntimeState(getDatabase());
};

export const updateSyncRuntimeState = (patch = {}) => {
  return updateRuntimeState(patch, getDatabase());
};

export const getSyncProfileState = (profileScope = GUEST_PROFILE_SCOPE) => {
  return getProfileRuntimeState(readRuntimeState(getDatabase()), profileScope);
};

export const setSyncProfileState = (profileScope = GUEST_PROFILE_SCOPE, patch = {}) => {
  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  const currentRuntimeState = readRuntimeState(db);
  const currentProfileState = getProfileRuntimeState(currentRuntimeState, normalizedProfileScope);

  return updateRuntimeState(
    {
      profiles: {
        [normalizedProfileScope]: {
          ...currentProfileState,
          ...patch,
        },
      },
    },
    db,
  );
};

export const listPendingProgressEvents = (profileScope = GUEST_PROFILE_SCOPE, limit = 500) => {
  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  const safeLimit = Math.max(1, toPositiveInteger(limit, 500));

  return db
    .prepare(
      `
        SELECT
          id,
          op_id AS opId,
          device_id AS deviceId,
          device_seq AS deviceSeq,
          deck_sync_id AS deckSyncId,
          word_external_id AS wordExternalId,
          reviewed_at AS reviewedAt,
          rating,
          queue_type AS queueType,
          payload_json AS payloadJson
        FROM review_logs
        WHERE profile_scope = ?
          AND op_id IS NOT NULL
          AND TRIM(op_id) <> ''
          AND COALESCE(sync_status, 'pending') <> 'synced'
        ORDER BY reviewed_at ASC, id ASC
        LIMIT ?
      `,
    )
    .all(normalizedProfileScope, safeLimit)
    .map((row) => ({
      id: Number(row.id),
      opId: toCleanString(row.opId).toLowerCase(),
      deviceId: toCleanString(row.deviceId).toLowerCase(),
      deviceSeq: toPositiveInteger(row.deviceSeq, 0),
      deckSyncId: toCleanString(row.deckSyncId).toLowerCase(),
      wordExternalId: toCleanString(row.wordExternalId),
      reviewedAt: toCleanString(row.reviewedAt),
      rating: toCleanString(row.rating),
      queueType: toCleanString(row.queueType),
      payload: parseJsonObject(row.payloadJson),
    }));
};

export const markProgressEventsSynced = (results = []) => {
  const db = getDatabase();
  const resultsByOpId = new Map(
    (Array.isArray(results) ? results : [])
      .map((item) => [toCleanString(item?.opId).toLowerCase(), item])
      .filter(([opId]) => Boolean(opId)),
  );

  if (resultsByOpId.size === 0) {
    return 0;
  }

  const updateStatement = db.prepare(
    `
      UPDATE review_logs
      SET sync_status = 'synced',
          synced_at = ?,
          server_seq = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE op_id = ?
    `,
  );

  const transaction = db.transaction(() => {
    let updatedCount = 0;

    resultsByOpId.forEach((result, opId) => {
      const response = updateStatement.run(
        toIsoTimestamp(result?.createdAt),
        toPositiveInteger(result?.serverSeq, 0),
        opId,
      );

      updatedCount += response.changes || 0;
    });

    return updatedCount;
  });

  return transaction();
};

export const applyRemoteProgressEvents = (profileScope = GUEST_PROFILE_SCOPE, events = []) => {
  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  const safeEvents = Array.isArray(events) ? events : [];

  if (safeEvents.length === 0) {
    return {
      importedCount: 0,
      skippedCount: 0,
      missingCount: 0,
    };
  }

  const existingOpIds = new Set(
    db
      .prepare(
        `
          SELECT op_id AS opId
          FROM review_logs
          WHERE op_id IS NOT NULL AND TRIM(op_id) <> ''
        `,
      )
      .all()
      .map((row) => toCleanString(row.opId).toLowerCase())
      .filter(Boolean),
  );

  const deckIdBySyncId = new Map(
    db
      .prepare(
        `
          SELECT id, sync_id AS syncId
          FROM decks
          WHERE sync_id IS NOT NULL AND TRIM(sync_id) <> ''
        `,
      )
      .all()
      .map((row) => [toCleanString(row.syncId).toLowerCase(), Number(row.id)])
      .filter(([syncId, deckId]) => Boolean(syncId) && Number.isInteger(deckId) && deckId > 0),
  );

  const wordRows = db
    .prepare(
      `
        SELECT id, deck_id AS deckId, external_id AS externalId
        FROM words
      `,
    )
    .all();
  const wordByCompositeKey = new Map(
    wordRows
      .map((row) => {
        const deckId = Number(row.deckId);
        const externalId = toCleanString(row.externalId);

        if (!Number.isInteger(deckId) || deckId <= 0 || !externalId) {
          return null;
        }

        return [`${deckId}::${externalId}`, row];
      })
      .filter(Boolean),
  );

  const insertStatement = db.prepare(
    `
      INSERT INTO review_logs (
        word_id,
        deck_id,
        reviewed_at,
        rating,
        queue_type,
        prev_state,
        next_state,
        prev_interval_days,
        next_interval_days,
        prev_ease_factor,
        next_ease_factor,
        profile_scope,
        op_id,
        device_id,
        device_seq,
        deck_sync_id,
        word_external_id,
        payload_json,
        sync_status,
        synced_at,
        server_seq
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?)
    `,
  );

  const result = {
    importedCount: 0,
    skippedCount: 0,
    missingCount: 0,
  };

  const transaction = db.transaction(() => {
    safeEvents.forEach((event) => {
      const opId = toCleanString(event?.opId).toLowerCase();

      if (!opId) {
        result.skippedCount += 1;
        return;
      }

      if (existingOpIds.has(opId)) {
        result.skippedCount += 1;
        return;
      }

      const deckId = deckIdBySyncId.get(toCleanString(event?.deckSyncId).toLowerCase());

      if (!Number.isInteger(deckId) || deckId <= 0) {
        result.missingCount += 1;
        return;
      }

      const wordRow = wordByCompositeKey.get(`${deckId}::${toCleanString(event?.wordExternalId)}`);

      if (!wordRow?.id) {
        result.missingCount += 1;
        return;
      }

      const payload = event?.payload && typeof event.payload === "object" ? event.payload : {};
      const previousCard = payload?.previousCard && typeof payload.previousCard === "object" ? payload.previousCard : {};
      const nextCard = payload?.nextCard && typeof payload.nextCard === "object" ? payload.nextCard : {};
      insertStatement.run(
        Number(wordRow.id),
        deckId,
        toCleanString(event?.reviewedAt) || toIsoTimestamp(),
        toCleanString(event?.rating),
        toCleanString(event?.queueType),
        toCleanString(previousCard?.state),
        toCleanString(nextCard?.state),
        toPositiveInteger(previousCard?.intervalDays, 0),
        toPositiveInteger(nextCard?.intervalDays, 0),
        Number(previousCard?.easeFactor) || 0,
        Number(nextCard?.easeFactor) || 0,
        normalizedProfileScope,
        opId,
        toCleanString(event?.deviceId).toLowerCase(),
        toPositiveInteger(event?.deviceSeq, 0),
        toCleanString(event?.deckSyncId).toLowerCase(),
        toCleanString(event?.wordExternalId),
        serializeJson(payload),
        toIsoTimestamp(event?.createdAt),
        toPositiveInteger(event?.serverSeq, 0),
      );
      existingOpIds.add(opId);
      result.importedCount += 1;
    });
  });

  transaction();

  if (result.importedCount > 0) {
    activateProgressProfile(normalizedProfileScope, { force: true });
  }

  return result;
};
