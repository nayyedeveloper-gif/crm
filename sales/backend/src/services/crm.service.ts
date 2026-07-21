import { getDb } from '../db/database.js';
import type { FollowUpRecord, RedemptionRecord, CustomerDob } from '../types/index.js';
import crypto from 'crypto';

const generateId = (): string => {
  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
};

// ─── Follow-ups ───

export const getFollowUps = (customerKey?: string): FollowUpRecord[] => {
  const db = getDb();
  if (customerKey) {
    const rows = db.prepare('SELECT * FROM follow_ups WHERE customer_key = ? ORDER BY created_at DESC').all(customerKey);
    return rows.map(rowToFollowUp);
  }
  const rows = db.prepare('SELECT * FROM follow_ups ORDER BY created_at DESC').all();
  return rows.map(rowToFollowUp);
};

export const getFollowUpsByCustomer = (customerKey: string): FollowUpRecord[] => {
  return getFollowUps(customerKey);
};

export const getAllFollowUpsGrouped = (): Record<string, FollowUpRecord[]> => {
  const all = getFollowUps();
  const grouped: Record<string, FollowUpRecord[]> = {};
  for (const record of all) {
    if (!grouped[record.customerKey]) grouped[record.customerKey] = [];
    grouped[record.customerKey].push(record);
  }
  return grouped;
};

export const createFollowUp = (data: Omit<FollowUpRecord, 'id' | 'createdAt'>): FollowUpRecord => {
  const db = getDb();
  const id = generateId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO follow_ups (id, customer_key, customer_name, contact_date, interaction_type, notes, status, interest_level, next_action_date, photo, audio, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.customerKey, data.customerName, data.contactDate, data.interactionType, data.notes, data.status, data.interestLevel, data.nextActionDate, data.photo, data.audio, now, now);
  return { ...data, id, createdAt: now };
};

export const updateFollowUp = (id: string, data: Partial<Omit<FollowUpRecord, 'id' | 'createdAt'>>): FollowUpRecord | null => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const merged = { ...rowToFollowUp(existing), ...data };
  db.prepare(`
    UPDATE follow_ups SET customer_name = ?, contact_date = ?, interaction_type = ?, notes = ?, status = ?, interest_level = ?, next_action_date = ?, photo = ?, audio = ?, updated_at = ?
    WHERE id = ?
  `).run(merged.customerName, merged.contactDate, merged.interactionType, merged.notes, merged.status, merged.interestLevel, merged.nextActionDate, merged.photo, merged.audio, now, id);
  return merged;
};

export const deleteFollowUp = (id: string): boolean => {
  const db = getDb();
  const result = db.prepare('DELETE FROM follow_ups WHERE id = ?').run(id);
  return result.changes > 0;
};

// ─── DOBs ───

export const getDobs = (): Record<string, string> => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM customer_dobs').all() as Array<{ customer_key: string; dob: string }>;
  const result: Record<string, string> = {};
  rows.forEach((r) => { result[r.customer_key] = r.dob; });
  return result;
};

export const getDob = (customerKey: string): string | null => {
  const db = getDb();
  const row = db.prepare('SELECT dob FROM customer_dobs WHERE customer_key = ?').get(customerKey) as { dob: string } | undefined;
  return row?.dob || null;
};

export const upsertDob = (customerKey: string, dob: string): CustomerDob => {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO customer_dobs (customer_key, dob, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(customer_key) DO UPDATE SET dob = excluded.dob, updated_at = excluded.updated_at
  `).run(customerKey, dob, now);
  return { customerKey, dob, updatedAt: now };
};

export const deleteDob = (customerKey: string): boolean => {
  const db = getDb();
  const result = db.prepare('DELETE FROM customer_dobs WHERE customer_key = ?').run(customerKey);
  return result.changes > 0;
};

// ─── Redemptions ───

export const getRedemptions = (customerKey?: string): RedemptionRecord[] => {
  const db = getDb();
  if (customerKey) {
    const rows = db.prepare('SELECT * FROM redemptions WHERE customer_key = ? ORDER BY year DESC').all(customerKey);
    return rows.map(rowToRedemption);
  }
  const rows = db.prepare('SELECT * FROM redemptions ORDER BY year DESC').all();
  return rows.map(rowToRedemption);
};

export const getRedemptionsGrouped = (): Record<string, RedemptionRecord[]> => {
  const all = getRedemptions();
  const grouped: Record<string, RedemptionRecord[]> = {};
  for (const record of all) {
    if (!grouped[record.customerKey]) grouped[record.customerKey] = [];
    grouped[record.customerKey].push(record);
  }
  return grouped;
};

export const getCurrentYearRedemption = (customerKey: string): RedemptionRecord | null => {
  const year = new Date().getFullYear();
  const db = getDb();
  const row = db.prepare('SELECT * FROM redemptions WHERE customer_key = ? AND year = ?').get(customerKey, year);
  return row ? rowToRedemption(row) : null;
};

export const upsertRedemption = (data: Omit<RedemptionRecord, 'id' | 'createdAt'> & { id?: string }): RedemptionRecord => {
  const db = getDb();
  const id = data.id || generateId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO redemptions (id, customer_key, year, gift_description, interaction_date, staff_name, photo, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(customer_key, year) DO UPDATE SET
      gift_description = excluded.gift_description,
      interaction_date = excluded.interaction_date,
      staff_name = excluded.staff_name,
      photo = excluded.photo,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `).run(id, data.customerKey, data.year, data.giftDescription, data.interactionDate, data.staffName, data.photo, data.notes, now, now);
  return { ...data, id, createdAt: now };
};

export const deleteRedemption = (id: string): boolean => {
  const db = getDb();
  const result = db.prepare('DELETE FROM redemptions WHERE id = ?').run(id);
  return result.changes > 0;
};

// ─── Redeemed status (derived from redemptions table) ───

export const getRedeemedStatus = (): Record<string, boolean> => {
  const year = new Date().getFullYear();
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT customer_key FROM redemptions WHERE year = ?').all(year) as Array<{ customer_key: string }>;
  const result: Record<string, boolean> = {};
  rows.forEach((r) => { result[r.customer_key] = true; });
  return result;
};

// ─── Row mappers ───

const rowToFollowUp = (row: any): FollowUpRecord => ({
  id: row.id,
  customerKey: row.customer_key,
  customerName: row.customer_name,
  contactDate: row.contact_date,
  interactionType: row.interaction_type,
  notes: row.notes,
  status: row.status,
  interestLevel: row.interest_level,
  nextActionDate: row.next_action_date,
  photo: row.photo,
  audio: row.audio,
  createdAt: row.created_at,
});

const rowToRedemption = (row: any): RedemptionRecord => ({
  id: row.id,
  customerKey: row.customer_key,
  year: row.year,
  giftDescription: row.gift_description,
  interactionDate: row.interaction_date,
  staffName: row.staff_name,
  photo: row.photo,
  notes: row.notes,
  createdAt: row.created_at,
});
