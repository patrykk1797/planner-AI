import { db } from './index.ts';
import { users, profiles, runs } from './schema.ts';
import { eq, desc } from 'drizzle-orm';

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
      durationMin: Number(runData.durationMin),
      avgPace: runData.avgPace || '5:30',
      avgHr: Number(runData.avgHr) || 150,
      maxHr: runData.maxHr ? Number(runData.maxHr) : null,
      avgCadence: Number(runData.avgCadence) || 175,
      gctMs: runData.gctMs ? Number(runData.gctMs) : null,
      verticalOscillationCm: runData.verticalOscillationCm ? String(runData.verticalOscillationCm) : null,
      groundContactBalancePercent: runData.groundContactBalancePercent || null,
      verticalRatioPercent: runData.verticalRatioPercent ? String(runData.verticalRatioPercent) : null,
      shoeName: runData.shoeName || null,
      notes: runData.notes || null,
      coachFeedback: runData.coachFeedback || null,
      elevationGainM: runData.elevationGainM ? Number(runData.elevationGainM) : null,
      calories: runData.calories ? Number(runData.calories) : null,
      powerW: runData.powerW ? Number(runData.powerW) : null,
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

export async function saveUserProfile(uid: string, profileData: any) {
  try {
    const result = await db.insert(profiles)
      .values({
        userId: uid,
        name: profileData.name || null,
        city: profileData.city || null,
        weight: profileData.weight ? String(profileData.weight) : null,
        targetWeight: profileData.targetWeight ? String(profileData.targetWeight) : null,
        time5k: profileData.time5k || null,
        vo2max: profileData.vo2max ? String(profileData.vo2max) : null,
        hrMax: profileData.hrMax ? Number(profileData.hrMax) : null,
        rhr: profileData.rhr ? Number(profileData.rhr) : null,
        weeklyKm: profileData.weeklyKm ? Number(profileData.weeklyKm) : null,
        targetGoal: profileData.targetGoal || null,
        accentColor: profileData.accentColor || null,
        theme: profileData.theme || null,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          name: profileData.name || null,
          city: profileData.city || null,
          weight: profileData.weight ? String(profileData.weight) : null,
          targetWeight: profileData.targetWeight ? String(profileData.targetWeight) : null,
          time5k: profileData.time5k || null,
          vo2max: profileData.vo2max ? String(profileData.vo2max) : null,
          hrMax: profileData.hrMax ? Number(profileData.hrMax) : null,
          rhr: profileData.rhr ? Number(profileData.rhr) : null,
          weeklyKm: profileData.weeklyKm ? Number(profileData.weeklyKm) : null,
          targetGoal: profileData.targetGoal || null,
          accentColor: profileData.accentColor || null,
          theme: profileData.theme || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to save user profile to Cloud SQL:', error);
    throw new Error('Database profile update failed', { cause: error });
  }
}
