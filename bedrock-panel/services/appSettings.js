const fs = require('fs');
const path = require('path');
const { ROOT_DIR } = require('../config');

const SETTINGS_FILE = path.join(ROOT_DIR, 'panel-settings.json');

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
};

class AppSettings {
    constructor() {
        this.settings = this.load();
    }

    load() {
        if (!fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(JSON.stringify(defaultSettings));
        }
        try {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
            return { ...defaultSettings, ...JSON.parse(data) };
        } catch (err) {
            console.error('Failed to load panel settings:', err);
            return JSON.parse(JSON.stringify(defaultSettings));
        }
    }

    save() {
        try {
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
        } catch (err) {
            console.error('Failed to save panel settings:', err);
        }
    }

    get(key) {
        if (key) return this.settings[key];
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
}

module.exports = new AppSettings();
