import { Router } from 'express';
import { z } from 'zod';
import {
  getFollowUps,
  getFollowUpsByCustomer,
  getAllFollowUpsGrouped,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getDobs,
  getDob,
  upsertDob,
  deleteDob,
  getRedemptions,
  getRedemptionsGrouped,
  getCurrentYearRedemption,
  upsertRedemption,
  deleteRedemption,
  getRedeemedStatus,
} from '../services/crm.service.js';
import type { ApiResponse, FollowUpRecord, RedemptionRecord } from '../types/index.js';

const router = Router();

// ─── Schemas ───

const followUpSchema = z.object({
  customerKey: z.string().min(1),
  customerName: z.string().min(1),
  contactDate: z.string().min(1),
  interactionType: z.enum(['Call', 'SMS', 'Viber', 'Visit', 'Other']),
  notes: z.string().default(''),
  status: z.enum(['Pending', 'Interested', 'Converted', 'Lost']).default('Pending'),
  interestLevel: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  nextActionDate: z.string().default(''),
  photo: z.string().default(''),
  audio: z.string().default(''),
});

const followUpUpdateSchema = followUpSchema.partial();

const dobSchema = z.object({
  customerKey: z.string().min(1),
  dob: z.string().min(1),
});

const redemptionSchema = z.object({
  customerKey: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  giftDescription: z.string().default(''),
  interactionDate: z.string().min(1),
  staffName: z.string().default(''),
  photo: z.string().default(''),
  notes: z.string().default(''),
});

const redemptionUpdateSchema = redemptionSchema.partial();

// ─── Follow-ups ───

// GET /api/crm/follow-ups — all follow-ups (grouped by customer)
router.get('/follow-ups', (req, res) => {
  const grouped = req.query.grouped === 'true';
  if (grouped) {
    const data = getAllFollowUpsGrouped();
    res.json({ success: true, data } as ApiResponse<typeof data>);
  } else {
    const data = getFollowUps();
    res.json({ success: true, data } as ApiResponse<FollowUpRecord[]>);
  }
});

// GET /api/crm/follow-ups/:customerKey — follow-ups for a specific customer
router.get('/follow-ups/:customerKey', (req, res) => {
  const data = getFollowUpsByCustomer(req.params.customerKey);
  res.json({ success: true, data } as ApiResponse<FollowUpRecord[]>);
});

// POST /api/crm/follow-ups — create a follow-up
router.post('/follow-ups', (req, res) => {
  const parsed = followUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const data = createFollowUp(parsed.data);
  res.status(201).json({ success: true, data } as ApiResponse<FollowUpRecord>);
});

// PUT /api/crm/follow-ups/:id — update a follow-up
router.put('/follow-ups/:id', (req, res) => {
  const parsed = followUpUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const data = updateFollowUp(req.params.id, parsed.data);
  if (!data) {
    res.status(404).json({ success: false, error: 'Follow-up not found' });
    return;
  }
  res.json({ success: true, data } as ApiResponse<FollowUpRecord>);
});

// DELETE /api/crm/follow-ups/:id — delete a follow-up
router.delete('/follow-ups/:id', (req, res) => {
  const deleted = deleteFollowUp(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Follow-up not found' });
    return;
  }
  res.json({ success: true, data: { deleted: true } });
});

// ─── DOBs ───

// GET /api/crm/dobs — all DOBs
router.get('/dobs', (req, res) => {
  const data = getDobs();
  res.json({ success: true, data } as ApiResponse<typeof data>);
});

// GET /api/crm/dobs/:customerKey — get DOB for a customer
router.get('/dobs/:customerKey', (req, res) => {
  const data = getDob(req.params.customerKey);
  res.json({ success: true, data } as ApiResponse<string | null>);
});

// PUT /api/crm/dobs — upsert DOB
router.put('/dobs', (req, res) => {
  const parsed = dobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const data = upsertDob(parsed.data.customerKey, parsed.data.dob);
  res.json({ success: true, data });
});

// DELETE /api/crm/dobs/:customerKey — delete DOB
router.delete('/dobs/:customerKey', (req, res) => {
  const deleted = deleteDob(req.params.customerKey);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'DOB not found' });
    return;
  }
  res.json({ success: true, data: { deleted: true } });
});

// ─── Redemptions ───

// GET /api/crm/redemptions — all redemptions (grouped by customer)
router.get('/redemptions', (req, res) => {
  const grouped = req.query.grouped === 'true';
  if (grouped) {
    const data = getRedemptionsGrouped();
    res.json({ success: true, data } as ApiResponse<typeof data>);
  } else {
    const data = getRedemptions();
    res.json({ success: true, data } as ApiResponse<RedemptionRecord[]>);
  }
});

// GET /api/crm/redemptions/:customerKey — redemptions for a customer
router.get('/redemptions/:customerKey', (req, res) => {
  const currentYearOnly = req.query.currentYear === 'true';
  if (currentYearOnly) {
    const data = getCurrentYearRedemption(req.params.customerKey);
    res.json({ success: true, data } as ApiResponse<RedemptionRecord | null>);
  } else {
    const data = getRedemptions(req.params.customerKey);
    res.json({ success: true, data } as ApiResponse<RedemptionRecord[]>);
  }
});

// POST /api/crm/redemptions — create or update redemption (upsert by customer+year)
router.post('/redemptions', (req, res) => {
  const parsed = redemptionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const data = upsertRedemption(parsed.data);
  res.status(201).json({ success: true, data } as ApiResponse<RedemptionRecord>);
});

// PUT /api/crm/redemptions/:id — update redemption
router.put('/redemptions/:id', (req, res) => {
  const parsed = redemptionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const existing = getRedemptions().find((r) => r.id === req.params.id);
  if (!existing) {
    res.status(404).json({ success: false, error: 'Redemption not found' });
    return;
  }
  const data = upsertRedemption({ ...existing, ...parsed.data, id: req.params.id });
  res.json({ success: true, data } as ApiResponse<RedemptionRecord>);
});

// DELETE /api/crm/redemptions/:id — delete redemption
router.delete('/redemptions/:id', (req, res) => {
  const deleted = deleteRedemption(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, error: 'Redemption not found' });
    return;
  }
  res.json({ success: true, data: { deleted: true } });
});

// ─── Redeemed status ───

// GET /api/crm/redeemed — which customers have redeemed this year
router.get('/redeemed', (req, res) => {
  const data = getRedeemedStatus();
  res.json({ success: true, data } as ApiResponse<typeof data>);
});

// ─── Bulk export (for migration from localStorage) ───

// GET /api/crm/export — all CRM data in one response
router.get('/export', (req, res) => {
  const data = {
    followUps: getAllFollowUpsGrouped(),
    dobs: getDobs(),
    redemptions: getRedemptionsGrouped(),
    redeemed: getRedeemedStatus(),
  };
  res.json({ success: true, data });
});

// POST /api/crm/import — bulk import (for migration from localStorage)
router.post('/import', (req, res) => {
  const importData = req.body;
  let count = 0;

  if (importData.followUps) {
    for (const [customerKey, records] of Object.entries(importData.followUps)) {
      for (const record of records as any[]) {
        createFollowUp({
          customerKey,
          customerName: record.customerName || customerKey,
          contactDate: record.contactDate || new Date().toISOString().split('T')[0],
          interactionType: record.interactionType || 'Call',
          notes: record.notes || '',
          status: record.status || 'Pending',
          interestLevel: record.interestLevel || 'Medium',
          nextActionDate: record.nextActionDate || '',
          photo: record.photo || '',
          audio: record.audio || '',
        });
        count++;
      }
    }
  }

  if (importData.dobs) {
    for (const [customerKey, dob] of Object.entries(importData.dobs)) {
      upsertDob(customerKey, dob as string);
      count++;
    }
  }

  if (importData.redemptions) {
    for (const [customerKey, records] of Object.entries(importData.redemptions)) {
      for (const record of records as any[]) {
        upsertRedemption({
          customerKey,
          year: record.year || new Date().getFullYear(),
          giftDescription: record.giftDescription || '',
          interactionDate: record.interactionDate || new Date().toISOString().split('T')[0],
          staffName: record.staffName || '',
          photo: record.photo || '',
          notes: record.notes || '',
        });
        count++;
      }
    }
  }

  res.json({ success: true, data: { imported: count } });
});

export default router;
