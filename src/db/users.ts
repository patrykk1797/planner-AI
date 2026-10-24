import { db } from './index.ts';
import { users, profiles, runs } from './schema.ts';
import { eq, desc, or } from 'drizzle-orm';

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
    await db.delete(runs).where(or(eq(runs.id, rawRunId), eq(runs.id, runId)));
    return true;
  } catch (error) {
    console.error('Failed to delete user run from Cloud SQL:', error);
    throw new Error('Database run delete failed', { cause: error });
  }
}

export async function saveUserProfile(uid: string, profileData: any) {
  try {
    // Fetch existing profile first to avoid overwriting existing columns with null
    const existingList = await db.select().from(profiles).where(eq(profiles.userId, uid));
    const existing = existingList[0];

    const rawGoal = profileData.targetGoal !== undefined 
      ? profileData.targetGoal 
      : (existing?.targetGoal || 'Budowa bazy tlenowej');

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
      targetGoal: typeof rawGoal === 'object' ? JSON.stringify(rawGoal) : rawGoal,
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

export async function saveFullUserData(uid: string, data: any) {
  try {
    // 1. Fetch existing full state first so we never wipe existing data during updates!
    const existingFull = await getFullUserData(uid).catch(() => null);

    const profileObj = {
      ...(existingFull?.profile || {}),
      ...(data.profile || {}),
    };

    const mergedShoes = (Array.isArray(data.shoes) && data.shoes.length > 0)
      ? data.shoes
      : (existingFull?.shoes || []);

    const mergedPlan = (Array.isArray(data.plan) && data.plan.length > 0)
      ? data.plan
      : (existingFull?.plan || []);

    const mergedPbs = (Array.isArray(data.personalBests) && data.personalBests.length > 0)
      ? data.personalBests
      : (existingFull?.personalBests || []);

    const mergedSettings = data.settings || existingFull?.settings || null;
    const mergedAccount = data.account || existingFull?.account || null;

    // Store full state JSON payload inside target_goal text column without schema changes
    const fullStatePayload = JSON.stringify({
      targetGoal: profileObj.targetGoal || 'Budowa bazy tlenowej',
      profile: profileObj,
      shoes: mergedShoes,
      plan: mergedPlan,
      personalBests: mergedPbs,
      settings: mergedSettings,
      account: mergedAccount,
    });

    // Save profile with targetGoal holding the JSON state
    await saveUserProfile(uid, {
      ...profileObj,
      targetGoal: fullStatePayload,
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
    let realTargetGoal = userProfile?.targetGoal || 'Budowa bazy tlenowej';

    if (userProfile?.targetGoal && userProfile.targetGoal.startsWith('{')) {
      try {
        parsedState = JSON.parse(userProfile.targetGoal);
        if (parsedState.targetGoal) realTargetGoal = parsedState.targetGoal;
      } catch (e) {
        console.error('Error parsing targetGoal JSON:', e);
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
      let realTargetGoal = pRow?.targetGoal || 'Budowa bazy tlenowej';
      if (pRow?.targetGoal && pRow.targetGoal.startsWith('{')) {
        try {
          parsedState = JSON.parse(pRow.targetGoal);
          if (parsedState.targetGoal) realTargetGoal = parsedState.targetGoal;
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


