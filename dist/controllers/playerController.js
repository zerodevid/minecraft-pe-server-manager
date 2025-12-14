"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unbanPlayer = exports.banPlayer = exports.kickPlayer = exports.getBanList = exports.getPlayers = void 0;
const bedrockProcess_1 = __importDefault(require("../services/bedrockProcess"));
const bdsGuard_1 = __importDefault(require("../utils/bdsGuard"));
const playerManager_1 = __importDefault(require("../services/playerManager"));
function sanitizeReason(reason) {
    if (!reason)
        return '';
    return String(reason).replace(/[\r\n]/g, ' ').trim();
}
function wrapName(name) {
    return `"${String(name).replace(/"/g, '').trim()}"`;
}
const getPlayers = (req, res) => {
    res.json({ players: bedrockProcess_1.default.getPlayers() });
};
exports.getPlayers = getPlayers;
const getBanList = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    res.json({ bans: playerManager_1.default.listBans() });
};
exports.getBanList = getBanList;
const kickPlayer = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { name, reason } = req.body || {};
    if (!name) {
        return res.status(400).json({ message: 'Player name is required' });
    }
    const command = sanitizeReason(reason)
        ? `kick ${wrapName(name)} ${sanitizeReason(reason)}`
        : `kick ${wrapName(name)}`;
    const result = bedrockProcess_1.default.sendCommand(command);
    if (!result.sent) {
        return res.status(400).json({ message: result.message || 'Unable to kick player' });
    }
    res.json({ message: `Kick command sent for ${name}` });
};
exports.kickPlayer = kickPlayer;
const banPlayer = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { name, xuid, reason } = req.body || {};
    if (!name && !xuid) {
        return res.status(400).json({ message: 'Player name or XUID is required' });
    }
    let entry;
    try {
        entry = playerManager_1.default.upsertBanEntry({ name, xuid });
    }
    catch (error) {
        return res.status(400).json({ message: error.message });
    }
    let message = `Queued ban for ${entry.name}. Start the server to enforce if it is offline.`;
    if (bedrockProcess_1.default.isRunning()) {
        const command = sanitizeReason(reason)
            ? `ban ${wrapName(entry.name)} ${sanitizeReason(reason)}`
            : `ban ${wrapName(entry.name)}`;
        const result = bedrockProcess_1.default.sendCommand(command);
        if (!result.sent) {
            return res.status(400).json({ message: result.message || 'Failed to send ban command' });
        }
        message = `Ban command sent for ${entry.name}`;
    }
    res.json({ message, entry });
};
exports.banPlayer = banPlayer;
const unbanPlayer = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    const { name, xuid } = req.body || {};
    if (!name && !xuid) {
        return res.status(400).json({ message: 'Player name or XUID is required' });
    }
    const result = playerManager_1.default.removeBanEntry({ name, xuid });
    if (!result.removed) {
        return res.status(404).json({ message: 'Player not found in ban list' });
    }
    let message = `Removed ${result.entry?.name || 'player'} from ban list.`;
    if (bedrockProcess_1.default.isRunning()) {
        const command = `pardon ${wrapName(result.entry?.name || name || xuid)}`;
        const sendResult = bedrockProcess_1.default.sendCommand(command);
        if (!sendResult.sent) {
            return res.status(400).json({ message: sendResult.message || 'Failed to send unban command' });
        }
        message = `Unban command sent for ${result.entry?.name || name || xuid}`;
    }
    res.json({ message });
};
exports.unbanPlayer = unbanPlayer;
