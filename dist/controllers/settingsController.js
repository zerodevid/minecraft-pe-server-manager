"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAuthSettings = exports.getAuthSettings = exports.testTelegramObj = exports.updateTelegramSettings = exports.getPanelSettings = exports.updateSettings = exports.getSettings = void 0;
const bdsGuard_1 = __importDefault(require("../utils/bdsGuard"));
const serverProperties_1 = __importDefault(require("../services/serverProperties"));
const appSettings_1 = __importDefault(require("../services/appSettings"));
const telegramBot_1 = __importDefault(require("../services/telegramBot"));
const authService_1 = __importDefault(require("../services/authService"));
const getSettings = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    try {
        const payload = serverProperties_1.default.getSettingsSections();
        res.json(payload);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getSettings = getSettings;
const updateSettings = (req, res) => {
    if (!(0, bdsGuard_1.default)(res)) {
        return;
    }
    try {
        const result = serverProperties_1.default.updateSettings(req.body || {});
        res.json({
            message: result.updated.length ? `Updated ${result.updated.length} setting(s).` : 'No changes detected.',
            updated: result.updated,
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateSettings = updateSettings;
// Panel / App Settings
const getPanelSettings = (req, res) => {
    try {
        const settings = appSettings_1.default.get();
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getPanelSettings = getPanelSettings;
const updateTelegramSettings = (req, res) => {
    try {
        const config = req.body;
        appSettings_1.default.updateTelegram(config);
        telegramBot_1.default.reconfigure();
        res.json({ message: 'Telegram settings updated.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateTelegramSettings = updateTelegramSettings;
const testTelegramObj = async (req, res) => {
    try {
        await telegramBot_1.default.sendMessage('Test notification from Bedrock Panel! 🚀');
        res.json({ message: 'Test message sent. Check your telegram.' });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.testTelegramObj = testTelegramObj;
const getAuthSettings = (_req, res) => {
    try {
        res.json(authService_1.default.getPublicConfig());
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAuthSettings = getAuthSettings;
const updateAuthSettings = (req, res) => {
    const { username, password } = req.body || {};
    try {
        const result = authService_1.default.updateCredentials({ username, password });
        res.json({ message: 'Login credentials updated.', username: result.username });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateAuthSettings = updateAuthSettings;
