import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api';
import { dbManager } from './server/db/sqlite';
import { seedDemoData } from './server/db/seedDemoData';
import { marketIntelligenceService } from './server/services/marketIntelligenceService';
import { contentService } from './server/services/contentService';
import { config } from './server/config/index';

async function startServer() {
  const app = express();
  const PORT = config.port; // 3000

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api', apiRouter);

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: '348 Business Brain Core',
      version: '1.0.0-step6',
      timestamp: new Date().toISOString(),
    });
  });

  // Seed demo data if database is fresh
  try {
    const existingGoals = dbManager.getAllGoals();
    if (existingGoals.length === 0) {
      console.log('[Server] Seeding initial isolated demo data...');
      seedDemoData();
    }
    // Seed initial Market Intelligence data if fresh
    marketIntelligenceService.seedInitialMarketDataIfEmpty();
    // Seed initial Content Brain data if fresh
    contentService.seedInitialContentDataIfEmpty();
  } catch (err) {
    console.error('[Server] Demo seeding check error:', err);
  }

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[348 Business Brain] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
