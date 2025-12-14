"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restartServer = exports.stopServer = exports.startServer = exports.getStatus = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bedrockProcess_1 = __importDefault(require("../services/bedrockProcess"));
const packManager_1 = __importDefault(require("../services/packManager"));
const worldManager_1 = __importDefault(require("../services/worldManager"));
const config_1 = require("../config");
const bdsGuard_1 = __importDefault(require("../utils/bdsGuard"));
const versionFile = path_1.default.join(config_1.BDS_DIR, 'version.txt');
function readVersion() {
    try {
        return fs_1.default.readFileSync(versionFile, 'utf-8').trim();
    }
    catch (error) {
        return '1.20.0';
    }
}
const getStatus = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const world = req.query.world || worldManager_1.default.getActiveWorld();
    const available = worldManager_1.default.listWorlds().map((entry) => entry.name);
    if (!available.includes(world)) {
        return res.status(400).json({ message: 'World not found' });
    }
    const packs = packManager_1.default.getPacks(world);
    const enabledPacks = packs.filter((p) => p.enabled).length;
    res.json({
        running: bedrockProcess_1.default.isRunning(),
        status: bedrockProcess_1.default.getStatus(),
        playerCount: bedrockProcess_1.default.getPlayers().length,
        enabledPacks,
        version: readVersion(),
        world,
    });
};
exports.getStatus = getStatus;
const startServer = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const world = req.body?.world;
    if (world) {
        try {
            worldManager_1.default.setActiveWorld(world);
        }
        catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
    const result = bedrockProcess_1.default.startServer();
    if (!result.started) {
        return res.status(400).json(result);
    }
    return res.json({ message: 'Server starting' });
};
exports.startServer = startServer;
const stopServer = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const result = bedrockProcess_1.default.stopServer();
    if (!result.stopped) {
        return res.status(400).json(result);
    }
    return res.json({ message: 'Stop command sent' });
};
exports.stopServer = stopServer;
const restartServer = async (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const world = req.body?.world;
    if (world) {
        try {
            worldManager_1.default.setActiveWorld(world);
        }
        catch (error) {
            return res.status(400).json({ message: error.message });
        }
    }
    const result = await bedrockProcess_1.default.restartServer();
    if (result.restarted === false) {
        return res.status(400).json(result);
    }
    res.json({ message: result.message || 'Server restarted' });
};
exports.restartServer = restartServer;
