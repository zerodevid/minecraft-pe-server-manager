const path = require('path');
const http = require('http');
const express = require('express');
const multer = require('multer');

const serverController = require('./controllers/serverController');
const consoleController = require('./controllers/consoleController');
const packController = require('./controllers/packController');
const playerController = require('./controllers/playerController');
const bedrockProcess = require('./services/bedrockProcess');
const { initWebSocket, broadcastConsole, broadcastPlayers } = require('./services/websocket');
const worldController = require('./controllers/worldController');
const settingsController = require('./controllers/settingsController');
const { UPLOADS_DIR } = require('./config');

const app = express();
const upload = multer({ dest: UPLOADS_DIR });
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

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
app.get('/api/settings', settingsController.getSettings);
app.put('/api/settings', settingsController.updateSettings);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
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
