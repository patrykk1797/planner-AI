import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const runs = pgTable('runs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid)
    .notNull(),
  title: text('title'),
  sourceApp: text('source_app'),
  date: text('date').notNull(),
  distanceKm: text('distance_km').notNull(),
  durationMin: integer('duration_min').notNull(),
  avgPace: text('avg_pace').notNull(),
  avgHr: integer('avg_hr').notNull(),
  maxHr: integer('max_hr'),
  avgCadence: integer('avg_cadence').notNull(),
  gctMs: integer('gct_ms'),
  verticalOscillationCm: text('vertical_oscillation_cm'),
  groundContactBalancePercent: text('ground_contact_balance_percent'),
  verticalRatioPercent: text('vertical_ratio_percent'),
  shoeName: text('shoe_name'),
  notes: text('notes'),
  coachFeedback: text('coach_feedback'),
  elevationGainM: integer('elevation_gain_m'),
  calories: integer('calories'),
  powerW: integer('power_w'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .references(() => users.uid)
    .primaryKey(),
  name: text('name'),
  city: text('city'),
  weight: text('weight'),
  targetWeight: text('target_weight'),
  time5k: text('time_5k'),
  vo2max: text('vo2max'),
  hrMax: integer('hr_max'),
  rhr: integer('rhr'),
  weeklyKm: integer('weekly_km'),
  targetGoal: text('target_goal'),
  stateJson: text('state_json'),
  accentColor: text('accent_color'),
  theme: text('theme'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const oauthTokens = pgTable('oauth_tokens', {
  id: text('id').primaryKey(), // Format: `${userId}_${provider}`
  userId: text('user_id')
    .references(() => users.uid)
    .notNull(),
  provider: text('provider').notNull(), // 'strava' | 'polar' | 'garmin' | 'komoot' | 'huawei'
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: integer('expires_at'), // Unix epoch seconds
  scope: text('scope'),
  athleteId: text('athlete_id'),
  athleteData: text('athlete_data'), // JSON serialized athlete metadata
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  runs: many(runs),
  oauthTokens: many(oauthTokens),
  profile: one(profiles, {
    fields: [users.uid],
    references: [profiles.userId],
  }),
}));

export const runsRelations = relations(runs, ({ one }) => ({
  user: one(users, {
    fields: [runs.userId],
    references: [users.uid],
  }),
}));

export const oauthTokensRelations = relations(oauthTokens, ({ one }) => ({
  user: one(users, {
    fields: [oauthTokens.userId],
    references: [users.uid],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.uid],
  }),
}));

