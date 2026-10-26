import crypto from 'crypto';
import { db } from './index.ts';
import { users, profiles, runs, oauthTokens } from './schema.ts';
import { eq, desc, or, and } from 'drizzle-orm';

function getOAuthEncryptionKey(): Buffer {
  const secret =
    process.env.OAUTH_ENCRYPTION_KEY ||
    process.env.OAUTH_STATE_SECRET ||
    'treda-oauth-aes256-gcm-key-v1';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptOAuthSecret(plainText: string): string {
  if (!plainText || plainText.startsWith('enc:v1:')) return plainText;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getOAuthEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptOAuthSecret(cipherText: string | null | undefined): string | null {
  if (!cipherText) return null;
  if (!cipherText.startsWith('enc:v1:')) return cipherText;
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) return cipherText;
    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const encrypted = Buffer.from(parts[4], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', getOAuthEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Failed to decrypt OAuth token:', err);
    return null;
  }
}

export async function getOrCreateUser(uid: string, email: string, name?: string, avatar?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        name: name || email.split('@')[0],
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(name ? { name } : {}),
          ...(avatar ? { avatar } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to get or create user in Cloud SQL:', error);
    throw new Error('Database user sync failed', { cause: error });
  }
}

export async function getUserRuns(uid: string) {
  try {
    const list = await db.select().from(runs).where(eq(runs.userId, uid)).orderBy(desc(runs.createdAt));
    return list.map((item) => ({
      ...item,
      id: item.id.startsWith(`${uid}_`) ? item.id.slice(uid.length + 1) : item.id,
    }));
  } catch (error) {
    console.error('Failed to get user runs from Cloud SQL:', error);
    throw new Error('Database runs query failed', { cause: error });
  }
}

export async function saveUserRun(uid: string, runData: any) {
  try {
    const rawId = runData.id || `run-${Date.now()}`;
    const runId = rawId.startsWith(`${uid}_`) ? rawId : `${uid}_${rawId}`;

    const values = {
      id: runId,
      userId: uid,
      title: runData.title || 'Bieg treningowy',
      sourceApp: runData.sourceApp || 'manual',
      date: runData.date || new Date().toISOString().split('T')[0],
      distanceKm: String(runData.distanceKm),
      durationMin: Math.round(Number(runData.durationMin) || 30),
      avgPace: runData.avgPace || '5:30',
      avgHr: Math.round(Number(runData.avgHr) || 150),
      maxHr: runData.maxHr != null ? Math.round(Number(runData.maxHr)) : null,
      avgCadence: Math.round(Number(runData.avgCadence) || 175),
      gctMs: runData.gctMs != null ? Math.round(Number(runData.gctMs)) : null,
      verticalOscillationCm: runData.verticalOscillationCm ? String(runData.verticalOscillationCm) : null,
      groundContactBalancePercent: runData.groundContactBalancePercent || null,
      verticalRatioPercent: runData.verticalRatioPercent ? String(runData.verticalRatioPercent) : null,
      shoeName: runData.shoeName || null,
      notes: runData.notes || null,
      coachFeedback: runData.coachFeedback || null,
      elevationGainM: runData.elevationGainM != null ? Math.round(Number(runData.elevationGainM)) : null,
      calories: runData.calories != null ? Math.round(Number(runData.calories)) : null,
      powerW: runData.powerW != null ? Math.round(Number(runData.powerW)) : null,
    };

    const result = await db.insert(runs)
      .values(values)
      .onConflictDoUpdate({
        target: runs.id,
        set: {
          title: values.title,
          sourceApp: values.sourceApp,
          date: values.date,
          distanceKm: values.distanceKm,
          durationMin: values.durationMin,
          avgPace: values.avgPace,
          avgHr: values.avgHr,
          maxHr: values.maxHr,
          avgCadence: values.avgCadence,
          gctMs: values.gctMs,
          verticalOscillationCm: values.verticalOscillationCm,
          groundContactBalancePercent: values.groundContactBalancePercent,
          verticalRatioPercent: values.verticalRatioPercent,
          shoeName: values.shoeName,
          notes: values.notes,
          coachFeedback: values.coachFeedback,
          elevationGainM: values.elevationGainM,
          calories: values.calories,
          powerW: values.powerW,
        },
      })
      .returning();

    const saved = result[0];
    return {
      ...saved,
      id: saved.id.startsWith(`${uid}_`) ? saved.id.slice(uid.length + 1) : saved.id,
    };
  } catch (error) {
    console.error('Failed to save user run to Cloud SQL:', error);
    throw new Error('Database run insert failed', { cause: error });
  }
}

export async function deleteUserRun(uid: string, rawRunId: string) {
  try {
    const runId = rawRunId.startsWith(`${uid}_`) ? rawRunId : `${uid}_${rawRunId}`;
    await db
      .delete(runs)
      .where(and(eq(runs.userId, uid), or(eq(runs.id, rawRunId), eq(runs.id, runId))));
    return true;
  } catch (error) {
    console.error('Failed to delete user run from Cloud SQL:', error);
    throw new Error('Database run delete failed', { cause: error });
  }
}

function extractCleanTargetGoal(rawGoal: any): string {
  if (!rawGoal) return 'Budowa bazy tlenowej';
  if (typeof rawGoal === 'string') {
    if (rawGoal.startsWith('{')) {
      try {
        const parsed = JSON.parse(rawGoal);
        if (typeof parsed.targetGoal === 'string' && !parsed.targetGoal.startsWith('{')) {
          return parsed.targetGoal;
        }
      } catch {}
      return 'Budowa bazy tlenowej';
    }
    return rawGoal;
  }
  return 'Budowa bazy tlenowej';
}

export async function saveUserProfile(uid: string, profileData: any) {
  try {
    // Fetch existing profile first to avoid overwriting existing columns with null
    const existingList = await db.select().from(profiles).where(eq(profiles.userId, uid));
    const existing = existingList[0];

    const rawGoal = profileData.targetGoal !== undefined
      ? profileData.targetGoal
      : (existing?.targetGoal || 'Budowa bazy tlenowej');

    const cleanGoal = extractCleanTargetGoal(rawGoal);
    const stateJsonVal = profileData.stateJson !== undefined
      ? (typeof profileData.stateJson === 'string' ? profileData.stateJson : JSON.stringify(profileData.stateJson))
      : (existing?.stateJson || (typeof rawGoal === 'string' && rawGoal.startsWith('{') ? rawGoal : null));

    const name = profileData.name !== undefined ? profileData.name : (existing?.name || null);
    const city = profileData.city !== undefined ? profileData.city : (existing?.city || null);
    const weight = profileData.weight !== undefined ? String(profileData.weight) : (existing?.weight || null);
    const targetWeight = profileData.targetWeight !== undefined ? String(profileData.targetWeight) : (existing?.targetWeight || null);
    const time5k = profileData.time5k !== undefined ? profileData.time5k : (existing?.time5k || null);
    const vo2max = profileData.vo2max !== undefined ? String(profileData.vo2max) : (existing?.vo2max || null);
    const hrMax = profileData.hrMax !== undefined ? Number(profileData.hrMax) : (existing?.hrMax || null);
    const rhr = profileData.rhr !== undefined ? Number(profileData.rhr) : (existing?.rhr || null);
    const weeklyKm = profileData.weeklyKm !== undefined ? Number(profileData.weeklyKm) : (existing?.weeklyKm || null);
    const accentColor = profileData.accentColor !== undefined ? profileData.accentColor : (existing?.accentColor || null);
    const theme = profileData.theme !== undefined ? profileData.theme : (existing?.theme || null);

    const valuesObj = {
      userId: uid,
      name,
      city,
      weight,
      targetWeight,
      time5k,
      vo2max,
      hrMax,
      rhr,
      weeklyKm,
      targetGoal: cleanGoal,
      stateJson: stateJsonVal,
      accentColor,
      theme,
      updatedAt: new Date(),
    };

    const result = await db.insert(profiles)
      .values(valuesObj)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          name: valuesObj.name,
          city: valuesObj.city,
          weight: valuesObj.weight,
          targetWeight: valuesObj.targetWeight,
          time5k: valuesObj.time5k,
          vo2max: valuesObj.vo2max,
          hrMax: valuesObj.hrMax,
          rhr: valuesObj.rhr,
          weeklyKm: valuesObj.weeklyKm,
          targetGoal: valuesObj.targetGoal,
          stateJson: valuesObj.stateJson,
          accentColor: valuesObj.accentColor,
          theme: valuesObj.theme,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error: any) {
    console.error('Failed to save user profile to Cloud SQL:', error);
    throw new Error('Database profile update failed', { cause: error });
  }
}

export async function saveFullUserData(uid: string, rawData: any) {
  try {
    const data =
      rawData && typeof rawData === 'object' && rawData.userData
        ? { ...rawData, ...rawData.userData }
        : rawData || {};

    // 1. Fetch existing full state first so partial updates preserve other fields
    const existingFull = await getFullUserData(uid).catch(() => null);

    const profileObj = {
      ...(existingFull?.profile || {}),
      ...(data.profile || {}),
    };

    const mergedShoes = Array.isArray(data.shoes)
      ? data.shoes
      : (existingFull?.shoes || []);

    const mergedPlan = Array.isArray(data.plan)
      ? data.plan
      : (existingFull?.plan || []);

    const mergedPbs = Array.isArray(data.personalBests)
      ? data.personalBests
      : (existingFull?.personalBests || []);

    const mergedRaces = Array.isArray(data.races)
      ? data.races
      : (existingFull?.races || []);

    const mergedWeeklyFocus = data.weeklyFocus !== undefined
      ? data.weeklyFocus
      : (existingFull?.weeklyFocus || null);

    const mergedPlanSummary = data.planSummary !== undefined
      ? data.planSummary
      : (existingFull?.planSummary || null);

    const mergedSettings = data.settings || existingFull?.settings || null;
    const mergedAccount = data.account || existingFull?.account || null;

    const cleanGoal = extractCleanTargetGoal(profileObj.targetGoal);
    profileObj.targetGoal = cleanGoal;

    // Store full state JSON payload inside dedicated state_json column
    const fullStatePayload = JSON.stringify({
      targetGoal: cleanGoal,
      profile: profileObj,
      shoes: mergedShoes,
      plan: mergedPlan,
      personalBests: mergedPbs,
      races: mergedRaces,
      weeklyFocus: mergedWeeklyFocus,
      planSummary: mergedPlanSummary,
      settings: mergedSettings,
      account: mergedAccount,
    });

    await saveUserProfile(uid, {
      ...profileObj,
      targetGoal: cleanGoal,
      stateJson: fullStatePayload,
    });

    // Save individual runs to runs table
    if (Array.isArray(data.runs) && data.runs.length > 0) {
      for (const run of data.runs) {
        await saveUserRun(uid, run).catch((e) => console.error('Error saving run in batch:', e));
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to save full user data to Cloud SQL:', error);
    return false;
  }
}

export async function getFullUserData(uid: string) {
  try {
    // Fetch profile
    const profileRecords = await db.select().from(profiles).where(eq(profiles.userId, uid));
    const userProfile = profileRecords[0];

    // Fetch runs from runs table
    const runsList = await getUserRuns(uid);

    let parsedState: any = {};
    let realTargetGoal = extractCleanTargetGoal(userProfile?.targetGoal);

    const rawJsonSource =
      userProfile?.stateJson ||
      (userProfile?.targetGoal && userProfile.targetGoal.startsWith('{') ? userProfile.targetGoal : null);

    if (rawJsonSource) {
      try {
        parsedState = JSON.parse(rawJsonSource);
        if (parsedState.targetGoal) {
          realTargetGoal = extractCleanTargetGoal(parsedState.targetGoal);
        }
      } catch (e) {
        console.error('Error parsing profile stateJson:', e);
      }
    }

    const mergedRuns = runsList.length > 0 ? runsList : (parsedState.runs || []);

    const loadedProfile = parsedState.profile || (userProfile ? {
      name: userProfile.name,
      city: userProfile.city,
      weight: Number(userProfile.weight) || 70,
      targetWeight: Number(userProfile.targetWeight) || 68,
      time5k: userProfile.time5k || '25:00',
      vo2max: Number(userProfile.vo2max) || 48,
      hrMax: userProfile.hrMax || 185,
      rhr: userProfile.rhr || 60,
      weeklyKm: userProfile.weeklyKm || 35,
      targetGoal: realTargetGoal,
      accentColor: userProfile.accentColor || 'orange',
      theme: userProfile.theme || 'dark',
    } : null);

    if (loadedProfile) {
      loadedProfile.targetGoal = realTargetGoal;
    }

    return {
      profile: loadedProfile,
      runs: mergedRuns,
      shoes: parsedState.shoes || [],
      plan: parsedState.plan || [],
      personalBests: parsedState.personalBests || [],
      races: parsedState.races || [],
      weeklyFocus: parsedState.weeklyFocus || null,
      planSummary: parsedState.planSummary || null,
      settings: parsedState.settings || null,
      account: parsedState.account || null,
    };
  } catch (error) {
    console.error('Failed to get full user data from Cloud SQL:', error);
    return null;
  }
}

export async function getAllDatabaseUsersWithStats() {
  try {
    const [allUsers, allProfiles, allRuns] = await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)),
      db.select().from(profiles),
      db.select().from(runs),
    ]);

    const profileMap = new Map<string, typeof allProfiles[0]>();
    for (const p of allProfiles) {
      profileMap.set(p.userId, p);
    }

    const runsByUser = new Map<string, typeof allRuns>();
    let totalDbDistanceKm = 0;
    for (const r of allRuns) {
      const dist = parseFloat(String(r.distanceKm)) || 0;
      totalDbDistanceKm += dist;
      const list = runsByUser.get(r.userId) || [];
      list.push(r);
      runsByUser.set(r.userId, list);
    }

    // Collect all unique UIDs across users and profiles tables
    const allUids = new Set<string>();
    for (const u of allUsers) allUids.add(u.uid);
    for (const p of allProfiles) allUids.add(p.userId);

    const userRowMap = new Map<string, typeof allUsers[0]>();
    for (const u of allUsers) {
      userRowMap.set(u.uid, u);
    }

    let totalDbProUsers = 0;
    let totalDbShoes = 0;
    let totalDbBamboos = 0;

    const usersList = Array.from(allUids).map((uid) => {
      const uRow = userRowMap.get(uid);
      const pRow = profileMap.get(uid);
      const uRuns = runsByUser.get(uid) || [];

      let parsedState: any = {};
      let realTargetGoal = extractCleanTargetGoal(pRow?.targetGoal);
      const rawJsonSource =
        pRow?.stateJson ||
        (pRow?.targetGoal && pRow.targetGoal.startsWith('{') ? pRow.targetGoal : null);

      if (rawJsonSource) {
        try {
          parsedState = JSON.parse(rawJsonSource);
          if (parsedState.targetGoal) {
            realTargetGoal = extractCleanTargetGoal(parsedState.targetGoal);
          }
        } catch {}
      }

      const prof = parsedState.profile || {};
      const acc = parsedState.account || {};
      const settings = parsedState.settings || {};
      const shoesArr = Array.isArray(parsedState.shoes) ? parsedState.shoes : [];
      const pbsArr = Array.isArray(parsedState.personalBests) ? parsedState.personalBests : [];
      const normalizedRuns = (uRuns.length > 0 ? uRuns : (Array.isArray(parsedState.runs) ? parsedState.runs : [])).map((r: any) => ({
        id: r.id,
        title: r.title || 'Bieg treningowy',
        date: r.date || new Date().toISOString().slice(0, 10),
        distanceKm: parseFloat(String(r.distanceKm)) || 0,
        durationMin: Number(r.durationMin) || 0,
        avgPace: r.avgPace || '5:30',
        avgHr: Number(r.avgHr) || 150,
        avgCadence: Number(r.avgCadence) || 175,
        shoeName: r.shoeName || undefined,
      }));

      const isPro =
        acc.isPro !== undefined
          ? Boolean(acc.isPro)
          : settings.isPro !== undefined
          ? Boolean(settings.isPro)
          : prof.isPro !== undefined
          ? Boolean(prof.isPro)
          : false;

      const bamboos = typeof prof.bamboos === 'number' ? prof.bamboos : 0;
      const userKm = normalizedRuns.reduce((sum: number, r: any) => sum + (Number(r.distanceKm) || 0), 0);

      if (isPro) totalDbProUsers++;
      totalDbShoes += shoesArr.length;
      totalDbBamboos += bamboos;

      return {
        id: uid,
        email: uRow?.email || acc.email || `${uid}@runner.local`,
        name: pRow?.name || prof.name || uRow?.name || acc.name || 'Biegacz',
        avatar: uRow?.avatar || acc.avatar || '',
        provider: acc.provider || 'email',
        createdAt: uRow?.createdAt ? new Date(uRow.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        onboardingCompleted: Boolean(acc.onboardingCompleted ?? true),
        isPro,
        subscriptionTier: (isPro ? 'PRO' : 'LITE') as 'PRO' | 'LITE',
        bamboos,
        targetGoal: typeof realTargetGoal === 'string' ? realTargetGoal : 'Budowa bazy tlenowej',
        city: pRow?.city || prof.city || 'Polska',
        runsCount: normalizedRuns.length,
        totalKm: Math.round(userKm * 10) / 10,
        shoesCount: shoesArr.length,
        weeklyKm: Number(pRow?.weeklyKm || prof.weeklyKm || 0),
        time5k: pRow?.time5k || prof.time5k || undefined,
        vo2max: Number(pRow?.vo2max || prof.vo2max || 0),
        selectedShoeId: prof.selectedShoeId || undefined,
        shoes: shoesArr,
        runs: normalizedRuns,
        personalBests: pbsArr,
        inCloudSql: true,
      };
    });

    return {
      dbConnected: true,
      totalDbUsers: usersList.length,
      totalDbProUsers,
      totalDbRuns: allRuns.length,
      totalDbDistanceKm: Math.round(totalDbDistanceKm * 10) / 10,
      totalDbShoes,
      totalDbBamboos,
      usersList,
    };
  } catch (error) {
    console.error('Failed to get admin stats from Cloud SQL:', error);
    return {
      dbConnected: false,
      totalDbUsers: 0,
      totalDbProUsers: 0,
      totalDbRuns: 0,
      totalDbDistanceKm: 0,
      totalDbShoes: 0,
      totalDbBamboos: 0,
      usersList: [],
    };
  }
}

export async function adminUpdateUserInDb(
  uid: string,
  action: { togglePro?: boolean; addBamboos?: number; resetPlan?: boolean; defaultPlan?: any[] }
) {
  try {
    const existingFull = await getFullUserData(uid);
    if (!existingFull) return false;

    const currentAcc = existingFull.account || { id: uid };
    const currentSettings = existingFull.settings || {};
    const currentProfile = existingFull.profile || {};
    let nextPlan = existingFull.plan || [];

    if (action.togglePro) {
      const currentPro = Boolean(currentAcc.isPro ?? currentSettings.isPro ?? false);
      const nextPro = !currentPro;
      currentAcc.isPro = nextPro;
      currentAcc.subscriptionTier = nextPro ? 'PRO' : 'LITE';
      currentSettings.isPro = nextPro;
      currentSettings.subscriptionTier = nextPro ? 'PRO' : 'LITE';
      currentProfile.isPro = nextPro;
    }

    if (typeof action.addBamboos === 'number') {
      currentProfile.bamboos = (Number(currentProfile.bamboos) || 0) + action.addBamboos;
    }

    if (action.resetPlan && Array.isArray(action.defaultPlan)) {
      nextPlan = action.defaultPlan;
    }

    await saveFullUserData(uid, {
      ...existingFull,
      account: currentAcc,
      settings: currentSettings,
      profile: currentProfile,
      plan: nextPlan,
    });
    return true;
  } catch (error) {
    console.error('Failed to update user via admin action:', error);
    return false;
  }
}

export async function adminDeleteUserFromDb(uid: string): Promise<boolean> {
  try {
    // 0. Delete user OAuth tokens
    try {
      await db.delete(oauthTokens).where(eq(oauthTokens.userId, uid));
    } catch (e) {
      console.warn('Error deleting oauth_tokens for user:', uid, e);
    }

    // 1. Delete user runs
    try {
      await db.delete(runs).where(eq(runs.userId, uid));
    } catch (e) {
      console.warn('Error deleting runs for user:', uid, e);
    }

    // 2. Delete user profile
    try {
      await db.delete(profiles).where(eq(profiles.userId, uid));
    } catch (e) {
      console.warn('Error deleting profile for user:', uid, e);
    }

    // 3. Delete user record
    try {
      await db.delete(users).where(eq(users.uid, uid));
    } catch (e) {
      console.warn('Error deleting user record:', uid, e);
    }

    return true;
  } catch (error) {
    console.error('Failed to delete user from Cloud SQL:', uid, error);
    return false;
  }
}

export async function findUserByEmail(email: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const matched = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (matched && matched.length > 0) {
      const user = matched[0];
      const fullData = await getFullUserData(user.uid);
      return {
        found: true,
        user,
        userData: fullData,
      };
    }
    return { found: false };
  } catch (error) {
    console.error('Error finding user by email:', error);
    return { found: false };
  }
}

export interface OAuthTokenInput {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scope?: string | null;
  athleteId?: string | null;
  athleteData?: any;
}

export async function saveUserOAuthToken(
  uid: string,
  provider: string,
  tokenData: OAuthTokenInput
) {
  const cleanProvider = provider.trim().toLowerCase();
  const recordId = `${uid}_${cleanProvider}`;
  const athleteJson =
    tokenData.athleteData !== undefined && tokenData.athleteData !== null
      ? typeof tokenData.athleteData === 'string'
        ? tokenData.athleteData
        : JSON.stringify(tokenData.athleteData)
      : null;

  const values = {
    id: recordId,
    userId: uid,
    provider: cleanProvider,
    accessToken: encryptOAuthSecret(tokenData.accessToken),
    refreshToken: tokenData.refreshToken ? encryptOAuthSecret(tokenData.refreshToken) : null,
    expiresAt: tokenData.expiresAt != null ? Math.round(Number(tokenData.expiresAt)) : null,
    scope: tokenData.scope || null,
    athleteId: tokenData.athleteId != null ? String(tokenData.athleteId) : null,
    athleteData: athleteJson,
    updatedAt: new Date(),
  };

  const result = await db
    .insert(oauthTokens)
    .values(values)
    .onConflictDoUpdate({
      target: oauthTokens.id,
      set: {
        accessToken: values.accessToken,
        ...(values.refreshToken ? { refreshToken: values.refreshToken } : {}),
        ...(values.expiresAt != null ? { expiresAt: values.expiresAt } : {}),
        ...(values.scope ? { scope: values.scope } : {}),
        ...(values.athleteId ? { athleteId: values.athleteId } : {}),
        ...(values.athleteData ? { athleteData: values.athleteData } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  const saved = result[0];
  return {
    ...saved,
    accessToken: decryptOAuthSecret(saved.accessToken) || tokenData.accessToken,
    refreshToken: decryptOAuthSecret(saved.refreshToken),
  };
}

export async function getUserOAuthToken(uid: string, provider: string) {
  const cleanProvider = provider.trim().toLowerCase();
  const recordId = `${uid}_${cleanProvider}`;
  const rows = await db
    .select()
    .from(oauthTokens)
    .where(or(eq(oauthTokens.id, recordId), and(eq(oauthTokens.userId, uid), eq(oauthTokens.provider, cleanProvider))));

  if (!rows || rows.length === 0) return null;
  const row = rows[0];
  let parsedAthlete: any = null;
  if (row.athleteData) {
    try {
      parsedAthlete = JSON.parse(row.athleteData);
    } catch {
      parsedAthlete = null;
    }
  }
  return {
    ...row,
    accessToken: decryptOAuthSecret(row.accessToken) || '',
    refreshToken: decryptOAuthSecret(row.refreshToken),
    athlete: parsedAthlete,
  };
}

export async function getUserOAuthConnections(uid: string) {
  const rows = await db.select().from(oauthTokens).where(eq(oauthTokens.userId, uid));
  return rows.map((row) => {
    let parsedAthlete: any = null;
    if (row.athleteData) {
      try {
        parsedAthlete = JSON.parse(row.athleteData);
      } catch {
        parsedAthlete = null;
      }
    }
    return {
      provider: row.provider,
      connected: true,
      athleteId: row.athleteId,
      athlete: parsedAthlete,
      scope: row.scope,
      expiresAt: row.expiresAt,
      updatedAt: row.updatedAt,
    };
  });
}

export async function deleteUserOAuthToken(uid: string, provider: string) {
  const cleanProvider = provider.trim().toLowerCase();
  const recordId = `${uid}_${cleanProvider}`;
  await db
    .delete(oauthTokens)
    .where(or(eq(oauthTokens.id, recordId), and(eq(oauthTokens.userId, uid), eq(oauthTokens.provider, cleanProvider))));
  return true;
}



