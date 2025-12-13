import path from 'path';
import http from 'http';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';

import * as serverController from './controllers/serverController';
import * as consoleController from './controllers/consoleController';
import * as packController from './controllers/packController';
import * as playerController from './controllers/playerController';
import bedrockProcess from './services/bedrockProcess';
import { initWebSocket, broadcastConsole, broadcastPlayers } from './services/websocket';
import * as worldController from './controllers/worldController';
import * as settingsController from './controllers/settingsController';
import * as authController from './controllers/authController';
import authService, { AUTH_COOKIE_NAME } from './services/authService';
import { getCookieValue } from './utils/cookies';
import { UPLOADS_DIR } from './config';

const app = express();
const upload = multer({ dest: UPLOADS_DIR });
const PORT = process.env.PORT || 4000;

const PUBLIC_ROUTES = new Set(['/login', '/login.html', '/api/auth/login', '/api/auth/session']);

function isAssetRequest(reqPath: string) {
  const ext = path.extname(reqPath);
  return !!ext && ext !== '.html';
}

function isPublicRequest(req: Request) {
  if (PUBLIC_ROUTES.has(req.path)) {
    return true;
  }
  if (req.path.startsWith('/css/') || req.path.startsWith('/images/') || req.path.startsWith('/fonts/')) {
    return true;
  }
  if (req.path.startsWith('/js/login')) {
    return true;
  }
  return isAssetRequest(req.path);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  if (isPublicRequest(req)) {
    const token = getCookieValue(req, AUTH_COOKIE_NAME);
    if ((req.path === '/login' || req.path === '/login.html') && authService.validateToken(token)) {
      return res.redirect('/dashboard');
    }
    return next();
  }

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (authService.validateToken(token)) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return res.redirect('/login');
});

// Adjust path to public directory from src/
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.get('/api/status', serverController.getStatus);
app.post('/api/server/start', serverController.startServer);
app.post('/api/server/stop', serverController.stopServer);
app.post('/api/server/restart', serverController.restartServer);

app.get('/api/players', playerController.getPlayers);
app.get('/api/players/bans', playerController.getBanList);
app.post('/api/players/kick', playerController.kickPlayer);
app.post('/api/players/ban', playerController.banPlayer);
app.post('/api/players/unban', playerController.unbanPlayer);

app.get('/api/packs', packController.listPacks);
app.post('/api/packs/upload', upload.single('pack'), packController.uploadPack);
app.post('/api/packs/enable', packController.enablePack);
app.post('/api/packs/disable', packController.disablePack);
app.delete('/api/packs/:uuid', packController.removePack);

app.post('/api/console/send', consoleController.sendCommand);
app.get('/api/worlds', worldController.listWorlds);
app.post('/api/worlds/select', worldController.selectWorld);
app.post('/api/worlds/import', upload.single('world'), worldController.importWorld);
app.delete('/api/worlds/:name', worldController.deleteWorld);
app.get('/api/worlds/:name/backup', worldController.backupWorld);
app.get('/api/worlds/:name/icon', worldController.getWorldIcon);
app.put('/api/worlds/:name/rename', worldController.renameWorld);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', authController.logout);
app.get('/api/auth/session', authController.sessionInfo);

app.get('/api/settings', settingsController.getSettings);
app.put('/api/settings', settingsController.updateSettings);

// Panel Settings Routes
app.get('/api/settings/panel', settingsController.getPanelSettings);
app.put('/api/settings/telegram', settingsController.updateTelegramSettings);
app.post('/api/settings/telegram/test', settingsController.testTelegramObj);
app.get('/api/settings/auth', settingsController.getAuthSettings);
app.put('/api/settings/auth', settingsController.updateAuthSettings);

// Auth routes for pages
app.get('/login', (req, res) => {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (authService.validateToken(token)) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'dashboard.html'));
});

// Clean URLs handler (serve .html without extension)
app.get('/:page', (req: Request, res: Response, next: NextFunction) => {
  const page = req.params.page;
  if (page.includes('.')) return next();

  const publicDir = path.join(__dirname, '../public');
  const filePath = path.join(publicDir, `${page}.html`);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

const server = http.createServer(app);
initWebSocket(server);

bedrockProcess.on('output', (line) => broadcastConsole(line));
bedrockProcess.on('players', (players) => broadcastPlayers(players));
bedrockProcess.on('status', (status) => {
  broadcastConsole(`[status] ${status}`);
});

server.listen(PORT, () => {
  console.log(`Bedrock Server Panel listening on port ${PORT}`);

  // Auto-start the Bedrock Server when the panel starts
  console.log('Auto-starting Bedrock Server...');
  bedrockProcess.startServer();
});
