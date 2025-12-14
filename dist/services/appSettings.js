"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const hash_1 = require("../utils/hash");
const SETTINGS_FILE = path_1.default.join(config_1.ROOT_DIR, 'panel-settings.json');
const defaultSettings = {
    telegram: {
        enabled: false,
        botToken: '',
        chatId: '',
        events: {
            serverStart: true,
            serverStop: true,
            playerJoin: true,
            playerLeave: true,
            playerBan: true,
            hourlyStatus: true,
        },
    },
    auth: {
        username: 'admin',
        passwordHash: (0, hash_1.hashPassword)('admin'),
    },
};
class AppSettings {
    constructor() {
        this.settings = this.load();
    }
    load() {
        if (!fs_1.default.existsSync(SETTINGS_FILE)) {
            return JSON.parse(JSON.stringify(defaultSettings));
        }
        try {
            const data = fs_1.default.readFileSync(SETTINGS_FILE, 'utf-8');
            return { ...defaultSettings, ...JSON.parse(data) };
        }
        catch (err) {
            console.error('Failed to load panel settings:', err);
            return JSON.parse(JSON.stringify(defaultSettings));
        }
    }
    save() {
        try {
            fs_1.default.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
        }
        catch (err) {
            console.error('Failed to save panel settings:', err);
        }
    }
    get(key) {
        if (key)
            return this.settings[key];
        return this.settings;
    }
    update(key, value) {
        this.settings[key] = value;
        this.save();
    }
    // Specific helper for telegram
    getTelegram() {
        return this.settings.telegram;
    }
    updateTelegram(config) {
        this.settings.telegram = { ...this.settings.telegram, ...config };
        this.save();
        return this.settings.telegram;
    }
    getAuth() {
        return this.settings.auth;
    }
    updateAuth(config) {
        this.settings.auth = { ...this.settings.auth, ...config };
        this.save();
        return this.settings.auth;
    }
}
exports.default = new AppSettings();
