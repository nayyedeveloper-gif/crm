import { Router } from 'express';
import { generateToken, validateCredentials } from '../services/auth.service.js';
import type { ApiResponse, AuthResponse } from '../types/index.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required' });
    return;
  }
  if (!validateCredentials(username, password)) {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
    return;
  }
  const { token, expiresAt } = generateToken(username);
  const data: AuthResponse = { token, username };
  res.json({ success: true, data, expiresAt } as ApiResponse<AuthResponse> & { expiresAt: string });
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  res.json({ success: true, data: { valid: true, username: 'Sale' } });
});

export default router;
