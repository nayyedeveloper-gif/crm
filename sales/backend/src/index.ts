import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/database.js';
import salesRoutes from './routes/sales.routes.js';
import crmRoutes from './routes/crm.routes.js';
import authRoutes from './routes/auth.routes.js';
import { refreshAllSheets } from './services/sheets.service.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Middleware ───

const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());

app.use(cors({
  origin: corsOrigins.includes('*') ? true : corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ─── Health check ───

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API routes ───

app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/crm', crmRoutes);

// ─── 404 handler ───

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ─── Error handler ───

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ─── Initialize ───

const startServer = async () => {
  // Initialize database
  initDb();
  console.log('✓ Database initialized');

  // Pre-fetch Google Sheets data
  try {
    await refreshAllSheets();
    console.log('✓ Google Sheets data pre-fetched and cached');
  } catch (err: any) {
    console.warn('⚠ Failed to pre-fetch sheets:', err.message);
  }

  // Set up periodic refresh
  const refreshInterval = parseInt(process.env.CACHE_TTL_MS || '180000', 10);
  setInterval(async () => {
    try {
      await refreshAllSheets();
      console.log(`[${new Date().toISOString()}] Sheets refreshed`);
    } catch (err: any) {
      console.warn(`[${new Date().toISOString()}] Sheets refresh failed:`, err.message);
    }
  }, refreshInterval);

  app.listen(PORT, () => {
    console.log(`\n🚀 Sale Dashboard API running on http://localhost:${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   Sales:   http://localhost:${PORT}/api/sales`);
    console.log(`   Targets: http://localhost:${PORT}/api/sales/targets`);
    console.log(`   CRM:     http://localhost:${PORT}/api/crm`);
    console.log(`   Auth:    http://localhost:${PORT}/api/auth\n`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
