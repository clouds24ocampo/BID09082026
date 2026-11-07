import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

// Keep in sync with netlify.toml
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; frame-src 'self' data: blob: https://drive.google.com; object-src 'self' data: blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

// Security & Hygiene Headers (must precede routes/static to apply to them)
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CSP);
  next();
});

// Same-origin only (Vite proxies /api in dev), so no CORS.
app.use(express.json({ limit: '100kb' }));

// Serve static assets if dist exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
}

// Health check (no business data is served by this process; all data lives in the client)
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

// Wildcard SPA route if dist exists (Express 5 compatible)
if (fs.existsSync(distPath)) {
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      next();
    }
  });
}

// Global API Error Handler
app.use((err, req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }
  console.error('[BiDOCS API ERROR]', err);
  res.status(500).json({ error: 'Internal API Server Error' });
});

// --------------------------------------------------------------------------
// Start Server with Resilient Port Fallback
// --------------------------------------------------------------------------
export function startServer(port = DEFAULT_PORT) {
  const server = app.listen(port, () => {
    console.log(`================================================================`);
    console.log(`  BiDOCS - PHILIPPINE PUBLIC BIDDING PLATFORM (Node.js Express) `);
    console.log(`  Quantum Cloud Corporation - Enterprise Portal                `);
    console.log(`  Local URL:  http://localhost:${port}                          `);
    console.log(`  Statute:    RA 12009 (NGPA) & RA 9184 Dual-Regime Enabled     `);
    console.log(`================================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[BiDOCS SERVER] Port ${port} is in use. Trying fallback port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[BiDOCS SERVER ERROR]', err);
      process.exit(1);
    }
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return server;
}

// If executed directly via `node server.js`
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server.js')) {
  startServer(Number(DEFAULT_PORT));
}

export default app;
