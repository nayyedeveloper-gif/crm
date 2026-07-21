import { Router } from 'express';
import { fetchSalesData, fetchTargetData, refreshAllSheets } from '../services/sheets.service.js';
import type { ApiResponse, SaleRow, TargetSheetData } from '../types/index.js';

const router = Router();

// GET /api/sales — fetch all sales data (cached)
router.get('/', async (req, res) => {
  try {
    const { rows, cached, lastUpdated } = await fetchSalesData();
    const response: ApiResponse<SaleRow[]> = {
      success: true,
      data: rows,
      cached,
      lastUpdated,
    };
    res.json(response);
  } catch (err: any) {
    const response: ApiResponse<never> = { success: false, error: err.message };
    res.status(502).json(response);
  }
});

// GET /api/sales/branches — unique branch list
router.get('/branches', async (req, res) => {
  try {
    const { rows } = await fetchSalesData();
    const branches = Array.from(new Set(rows.map((r) => r['Branch အမည်']).filter(Boolean))).sort();
    const response: ApiResponse<string[]> = { success: true, data: branches };
    res.json(response);
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/sales/months — unique month list from data
router.get('/months', async (req, res) => {
  try {
    const { rows } = await fetchSalesData();
    const monthSet = new Set<string>();
    rows.forEach((r) => {
      const dateStr = r.Date || r.Timestamp?.split(' ')[0];
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          monthSet.add(d.toLocaleDateString('en-US', { month: 'long' }));
        }
      }
    });
    const months = Array.from(monthSet).sort();
    const response: ApiResponse<string[]> = { success: true, data: months };
    res.json(response);
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/sales/filter?month=July&branches=Shop-1,Shop-2
router.get('/filter', async (req, res) => {
  try {
    const { rows } = await fetchSalesData();
    let filtered = rows;

    const month = req.query.month as string;
    if (month && month !== 'All') {
      filtered = filtered.filter((r) => {
        const dateStr = r.Date || r.Timestamp?.split(' ')[0];
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) && d.toLocaleDateString('en-US', { month: 'long' }) === month;
      });
    }

    const branchesParam = req.query.branches as string;
    if (branchesParam && branchesParam !== 'All') {
      const branchList = branchesParam.split(',').map((b) => b.trim());
      filtered = filtered.filter((r) => branchList.includes(r['Branch အမည်']));
    }

    const response: ApiResponse<SaleRow[]> = { success: true, data: filtered };
    res.json(response);
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// GET /api/sales/targets — target sheet data
router.get('/targets', async (req, res) => {
  try {
    const { data, cached, lastUpdated } = await fetchTargetData();
    const response: ApiResponse<TargetSheetData> = { success: true, data, cached, lastUpdated };
    res.json(response);
  } catch (err: any) {
    res.status(502).json({ success: false, error: err.message });
  }
});

// POST /api/sales/refresh — force refresh cache
router.post('/refresh', async (req, res) => {
  try {
    await refreshAllSheets();
    const response: ApiResponse<{ refreshed: boolean }> = { success: true, data: { refreshed: true } };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
