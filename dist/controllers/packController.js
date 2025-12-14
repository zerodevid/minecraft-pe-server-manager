"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePack = exports.disablePack = exports.enablePack = exports.uploadPack = exports.listPacks = void 0;
const packManager_1 = __importDefault(require("../services/packManager"));
const worldManager_1 = __importDefault(require("../services/worldManager"));
const bdsGuard_1 = __importDefault(require("../utils/bdsGuard"));
function getWorldFromRequest(req) {
    return req.query.world || req.body?.world || worldManager_1.default.getActiveWorld();
}
function ensureWorld(world) {
    const available = worldManager_1.default.listWorlds().map((entry) => entry.name);
    if (!available.includes(world)) {
        throw new Error('World not found');
    }
}
const listPacks = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const world = getWorldFromRequest(req);
    try {
        ensureWorld(world);
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
    res.json(packManager_1.default.getPacks(world));
};
exports.listPacks = listPacks;
const uploadPack = async (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    try {
        const packs = await packManager_1.default.installPack(req.file.path);
        res.json({ installed: packs });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.uploadPack = uploadPack;
const enablePack = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { uuid, world, bundle, bundleId } = req.body;
    if (!uuid || !world) {
        return res.status(400).json({ message: 'UUID and world are required' });
    }
    try {
        ensureWorld(world);
        const pack = packManager_1.default.enablePack({ uuid, world, bundleId: bundle ? bundleId : undefined });
        res.json(pack);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.enablePack = enablePack;
const disablePack = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { uuid, world, bundle, bundleId } = req.body;
    if (!uuid || !world) {
        return res.status(400).json({ message: 'UUID and world are required' });
    }
    try {
        ensureWorld(world);
        const pack = packManager_1.default.disablePack({ uuid, world, bundleId: bundle ? bundleId : undefined });
        res.json(pack);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.disablePack = disablePack;
const removePack = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { uuid } = req.params;
    const { bundle, bundleId } = req.query;
    try {
        const pack = packManager_1.default.removePack({ uuid, bundleId: bundle === 'true' ? bundleId : undefined });
        res.json(pack);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.removePack = removePack;
