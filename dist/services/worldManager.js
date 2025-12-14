"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_WORLD = void 0;
exports.listWorlds = listWorlds;
exports.getActiveWorld = getActiveWorld;
exports.setActiveWorld = setActiveWorld;
exports.importWorld = importWorld;
exports.deleteWorld = deleteWorld;
exports.renameWorld = renameWorld;
exports.backupWorld = backupWorld;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const worldJson_1 = __importDefault(require("./worldJson"));
const fsUtils_1 = require("../utils/fsUtils");
const config_1 = require("../config");
const SERVER_PROPERTIES = path_1.default.join(config_1.BDS_DIR, 'server.properties');
exports.DEFAULT_WORLD = 'world';
function sanitizeWorldName(name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_') || exports.DEFAULT_WORLD;
}
function ensureDefaultWorld() {
    const defaultPath = path_1.default.join(config_1.WORLDS_DIR, exports.DEFAULT_WORLD);
    fs_1.default.mkdirSync(defaultPath, { recursive: true });
    worldJson_1.default.ensureWorldPackFiles(exports.DEFAULT_WORLD);
}
function listWorlds() {
    ensureDefaultWorld();
    const entries = fs_1.default.readdirSync(config_1.WORLDS_DIR, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => {
        worldJson_1.default.ensureWorldPackFiles(entry.name);
        const absPath = path_1.default.join(config_1.WORLDS_DIR, entry.name);
        return {
            name: entry.name,
            path: path_1.default.relative(config_1.ROOT_DIR, absPath),
        };
    });
}
function getActiveWorld() {
    try {
        const data = fs_1.default.readFileSync(SERVER_PROPERTIES, 'utf-8');
        const levelLine = data.split(/\r?\n/).find((line) => line.startsWith('level-name='));
        if (levelLine) {
            const [, value] = levelLine.split('=');
            return value?.trim() || exports.DEFAULT_WORLD;
        }
    }
    catch (error) {
        // ignore
    }
    return exports.DEFAULT_WORLD;
}
function setActiveWorld(world) {
    const available = listWorlds().map((entry) => entry.name);
    if (!available.includes(world)) {
        throw new Error('World not found');
    }
    let content = '';
    try {
        content = fs_1.default.readFileSync(SERVER_PROPERTIES, 'utf-8');
    }
    catch (error) {
        // ignore
    }
    const lines = content ? content.split(/\r?\n/) : [];
    let found = false;
    const updated = lines.map((line) => {
        if (line.startsWith('level-name=')) {
            found = true;
            return `level-name=${world}`;
        }
        return line;
    });
    if (!found) {
        updated.push(`level-name=${world}`);
    }
    fs_1.default.writeFileSync(SERVER_PROPERTIES, updated.join('\n'));
    worldJson_1.default.applyWorldToRoot(world);
    return world;
}
async function importWorld(uploadPath) {
    ensureDefaultWorld();
    const tempDir = path_1.default.join(path_1.default.dirname(uploadPath), `world_${Date.now()}`);
    fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    fs_1.default.mkdirSync(tempDir, { recursive: true });
    try {
        const zip = new adm_zip_1.default(uploadPath);
        zip.extractAllTo(tempDir, true);
        const extractedEntries = fs_1.default.readdirSync(tempDir);
        let worldRoot = tempDir;
        if (extractedEntries.length === 1) {
            const candidate = path_1.default.join(tempDir, extractedEntries[0]);
            if (fs_1.default.statSync(candidate).isDirectory()) {
                worldRoot = candidate;
            }
        }
        let baseName = sanitizeWorldName(path_1.default.basename(worldRoot));
        let worldName = baseName;
        let counter = 1;
        while (fs_1.default.existsSync(path_1.default.join(config_1.WORLDS_DIR, worldName))) {
            worldName = `${baseName}_${counter++}`;
        }
        const levelDat = path_1.default.join(worldRoot, 'level.dat');
        if (!fs_1.default.existsSync(levelDat)) {
            throw new Error('Invalid world archive: missing level.dat. Ensure this is a Minecraft Bedrock world.');
        }
        const destination = path_1.default.join(config_1.WORLDS_DIR, worldName);
        (0, fsUtils_1.copyDirectory)(worldRoot, destination);
        worldJson_1.default.ensureWorldPackFiles(worldName);
        return { name: worldName, path: path_1.default.relative(config_1.ROOT_DIR, destination) };
    }
    finally {
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        await fs_1.default.promises.unlink(uploadPath).catch(() => { });
    }
}
function deleteWorld(name) {
    ensureDefaultWorld();
    if (!name) {
        throw new Error('World name is required');
    }
    const worldPath = path_1.default.join(config_1.WORLDS_DIR, name);
    if (!fs_1.default.existsSync(worldPath)) {
        throw new Error('World not found');
    }
    const active = getActiveWorld();
    fs_1.default.rmSync(worldPath, { recursive: true, force: true });
    let newActive = active;
    if (active === name) {
        const remaining = listWorlds()
            .map((entry) => entry.name)
            .filter((entry) => entry !== name);
        newActive = remaining[0] || exports.DEFAULT_WORLD;
        setActiveWorld(newActive);
    }
    return { deleted: name, activeWorld: newActive };
}
function renameWorld(name, nextName) {
    ensureDefaultWorld();
    if (!name) {
        throw new Error('World name is required');
    }
    if (!nextName) {
        throw new Error('New world name is required');
    }
    const currentPath = path_1.default.join(config_1.WORLDS_DIR, name);
    if (!fs_1.default.existsSync(currentPath)) {
        throw new Error('World not found');
    }
    const sanitized = sanitizeWorldName(nextName);
    if (!sanitized) {
        throw new Error('Invalid world name');
    }
    if (sanitized === name) {
        return { name: sanitized, oldName: name };
    }
    const destinationPath = path_1.default.join(config_1.WORLDS_DIR, sanitized);
    if (fs_1.default.existsSync(destinationPath)) {
        throw new Error('Another world already uses that name');
    }
    fs_1.default.renameSync(currentPath, destinationPath);
    worldJson_1.default.ensureWorldPackFiles(sanitized);
    const active = getActiveWorld();
    if (active === name) {
        setActiveWorld(sanitized);
    }
    return { name: sanitized, oldName: name };
}
function backupWorld(name) {
    ensureDefaultWorld();
    if (!name) {
        throw new Error('World name is required');
    }
    const worldPath = path_1.default.join(config_1.WORLDS_DIR, name);
    if (!fs_1.default.existsSync(worldPath)) {
        throw new Error('World not found');
    }
    const zip = new adm_zip_1.default();
    zip.addLocalFolder(worldPath, name);
    fs_1.default.mkdirSync(config_1.UPLOADS_DIR, { recursive: true });
    const filename = `${name}_${Date.now()}.zip`;
    const filePath = path_1.default.join(config_1.UPLOADS_DIR, filename);
    zip.writeZip(filePath);
    return { filename, filePath };
}
exports.default = {
    listWorlds,
    getActiveWorld,
    setActiveWorld,
    importWorld,
    deleteWorld,
    renameWorld,
    backupWorld,
    DEFAULT_WORLD: exports.DEFAULT_WORLD,
};
