"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureWorldPackFiles = ensureWorldPackFiles;
exports.syncWorldFiles = syncWorldFiles;
exports.applyWorldToRoot = applyWorldToRoot;
exports.getWorldPackEntries = getWorldPackEntries;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
function getWorldPaths(world) {
    const worldDir = path_1.default.join(config_1.WORLDS_DIR, world);
    return {
        dir: worldDir,
        behavior: path_1.default.join(worldDir, 'world_behavior_packs.json'),
        resource: path_1.default.join(worldDir, 'world_resource_packs.json'),
    };
}
function ensureDir(filePath) {
    fs_1.default.mkdirSync(path_1.default.dirname(filePath), { recursive: true });
}
function writeJson(filePath, data) {
    ensureDir(filePath);
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function ensureWorldPackFiles(world) {
    if (!world)
        return;
    const { behavior, resource } = getWorldPaths(world);
    ensureDir(behavior);
    ensureDir(resource);
    if (!fs_1.default.existsSync(behavior)) {
        fs_1.default.writeFileSync(behavior, '[]');
    }
    if (!fs_1.default.existsSync(resource)) {
        fs_1.default.writeFileSync(resource, '[]');
    }
}
function buildPackPayload(packs, world, type) {
    return packs
        .filter((p) => Array.isArray(p.enabledWorlds) && p.enabledWorlds.includes(world) && p.type === type)
        .map((p) => ({ pack_id: p.uuid, version: p.version || [1, 0, 0] }))
        .sort((a, b) => a.pack_id.localeCompare(b.pack_id));
}
function syncWorldFiles(packs, world) {
    if (!world)
        return;
    ensureWorldPackFiles(world);
    const { behavior, resource } = getWorldPaths(world);
    const behaviorPayload = buildPackPayload(packs, world, 'behavior');
    const resourcePayload = buildPackPayload(packs, world, 'resource');
    writeJson(behavior, behaviorPayload);
    writeJson(resource, resourcePayload);
}
function applyWorldToRoot(world) {
    if (!world)
        return;
    ensureWorldPackFiles(world);
    const { behavior, resource } = getWorldPaths(world);
    const rootBehavior = path_1.default.join(config_1.BDS_DIR, 'world_behavior_packs.json');
    const rootResource = path_1.default.join(config_1.BDS_DIR, 'world_resource_packs.json');
    fs_1.default.copyFileSync(behavior, rootBehavior);
    fs_1.default.copyFileSync(resource, rootResource);
}
function readJson(filePath) {
    try {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }
    catch (error) {
        if (error instanceof SyntaxError) {
            console.error(`[WorldJson] Failed to parse JSON at ${filePath}:`, error.message);
        }
        return [];
    }
}
function getWorldPackEntries(world) {
    if (!world)
        return { behavior: [], resource: [] };
    ensureWorldPackFiles(world);
    const { behavior, resource } = getWorldPaths(world);
    return {
        behavior: readJson(behavior),
        resource: readJson(resource),
    };
}
exports.default = {
    syncWorldFiles,
    ensureWorldPackFiles,
    applyWorldToRoot,
    getWorldPackEntries,
};
