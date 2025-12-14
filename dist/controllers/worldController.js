"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameWorld = exports.getWorldIcon = exports.backupWorld = exports.deleteWorld = exports.importWorld = exports.selectWorld = exports.listWorlds = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const worldManager_1 = __importDefault(require("../services/worldManager"));
const bdsGuard_1 = __importDefault(require("../utils/bdsGuard"));
const config_1 = require("../config");
const listWorlds = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const worlds = worldManager_1.default.listWorlds();
    const activeWorld = worldManager_1.default.getActiveWorld();
    res.json({ worlds, activeWorld });
};
exports.listWorlds = listWorlds;
const selectWorld = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'World name is required' });
    }
    try {
        const activeWorld = worldManager_1.default.setActiveWorld(name);
        res.json({ activeWorld });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.selectWorld = selectWorld;
const importWorld = async (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    if (!req.file) {
        return res.status(400).json({ message: 'No world file uploaded' });
    }
    try {
        const world = await worldManager_1.default.importWorld(req.file.path);
        res.json(world);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.importWorld = importWorld;
const deleteWorld = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { name } = req.params;
    try {
        const result = worldManager_1.default.deleteWorld(name);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteWorld = deleteWorld;
const backupWorld = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { name } = req.params;
    try {
        const { filename, filePath } = worldManager_1.default.backupWorld(name);
        res.download(filePath, filename, (err) => {
            fs_1.default.rmSync(filePath, { force: true });
            if (err && !res.headersSent) {
                res.status(500).json({ message: err.message });
            }
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.backupWorld = backupWorld;
const getWorldIcon = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { name } = req.params;
    if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
        return res.status(400).json({ message: 'Invalid world name' });
    }
    const iconPath = path_1.default.join(config_1.WORLDS_DIR, name, 'world_icon.jpeg');
    if (!fs_1.default.existsSync(iconPath)) {
        return res.status(404).json({ message: 'World icon not found' });
    }
    return res.sendFile(iconPath);
};
exports.getWorldIcon = getWorldIcon;
const renameWorld = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { name } = req.params;
    const { newName } = req.body;
    if (!newName) {
        return res.status(400).json({ message: 'New name is required' });
    }
    try {
        const result = worldManager_1.default.renameWorld(name, newName);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.renameWorld = renameWorld;
