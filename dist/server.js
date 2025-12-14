"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const serverController = __importStar(require("./controllers/serverController"));
const consoleController = __importStar(require("./controllers/consoleController"));
const packController = __importStar(require("./controllers/packController"));
const playerController = __importStar(require("./controllers/playerController"));
const bedrockProcess_1 = __importDefault(require("./services/bedrockProcess"));
const websocket_1 = require("./services/websocket");
const worldController = __importStar(require("./controllers/worldController"));
const settingsController = __importStar(require("./controllers/settingsController"));
const authController = __importStar(require("./controllers/authController"));
const authService_1 = __importStar(require("./services/authService"));
const cookies_1 = require("./utils/cookies");
const config_1 = require("./config");
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: config_1.UPLOADS_DIR });
const PORT = process.env.PORT || 4000;
const PUBLIC_ROUTES = new Set(['/login', '/login.html', '/api/auth/login', '/api/auth/session']);
function isAssetRequest(reqPath) {
    const ext = path_1.default.extname(reqPath);
    return !!ext && ext !== '.html';
}
function isPublicRequest(req) {
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
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use((req, res, next) => {
    if (isPublicRequest(req)) {
        const token = (0, cookies_1.getCookieValue)(req, authService_1.AUTH_COOKIE_NAME);
        if ((req.path === '/login' || req.path === '/login.html') && authService_1.default.validateToken(token)) {
            return res.redirect('/dashboard');
        }
        return next();
    }
    const token = (0, cookies_1.getCookieValue)(req, authService_1.AUTH_COOKIE_NAME);
    if (authService_1.default.validateToken(token)) {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.redirect('/login');
});
// Adjust path to public directory from src/
app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
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
    const token = (0, cookies_1.getCookieValue)(req, authService_1.AUTH_COOKIE_NAME);
    if (authService_1.default.validateToken(token)) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path_1.default.join(__dirname, '../public', 'login.html'));
});
// Root route
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../public', 'dashboard.html'));
});
// Clean URLs handler (serve .html without extension)
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (page.includes('.'))
        return next();
    const publicDir = path_1.default.join(__dirname, '../public');
    const filePath = path_1.default.join(publicDir, `${page}.html`);
    if (fs_1.default.existsSync(filePath)) {
        res.sendFile(filePath);
    }
    else {
        next();
    }
});
const server = http_1.default.createServer(app);
(0, websocket_1.initWebSocket)(server);
bedrockProcess_1.default.on('output', (line) => (0, websocket_1.broadcastConsole)(line));
bedrockProcess_1.default.on('players', (players) => (0, websocket_1.broadcastPlayers)(players));
bedrockProcess_1.default.on('status', (status) => {
    (0, websocket_1.broadcastConsole)(`[status] ${status}`);
});
server.listen(PORT, () => {
    console.log(`Bedrock Server Panel listening on port ${PORT}`);
    // Auto-start the Bedrock Server when the panel starts
    console.log('Auto-starting Bedrock Server...');
    bedrockProcess_1.default.startServer();
});
