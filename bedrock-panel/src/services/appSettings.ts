import fs from 'fs';
import path from 'path';
import { ROOT_DIR } from '../config';

const SETTINGS_FILE = path.join(ROOT_DIR, 'panel-settings.json');

interface TelegramConfig {
    enabled: boolean;
    botToken: string;
    chatId: string;
    events: {
        serverStart: boolean;
        serverStop: boolean;
        playerJoin: boolean;
        playerLeave: boolean;
        playerBan: boolean;
        hourlyStatus: boolean;
        [key: string]: boolean;
    };
}

interface Settings {
    telegram: TelegramConfig;
    [key: string]: any;
}

const defaultSettings: Settings = {
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
    private settings: Settings;

    constructor() {
        this.settings = this.load();
    }

    load(): Settings {
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

    get(key?: string) {
        if (key) return this.settings[key];
        return this.settings;
    }

    update(key: string, value: any) {
        this.settings[key] = value;
        this.save();
    }

    // Specific helper for telegram
    getTelegram(): TelegramConfig {
        return this.settings.telegram;
    }

    updateTelegram(config: Partial<TelegramConfig>) {
        this.settings.telegram = { ...this.settings.telegram, ...config };
        this.save();
        return this.settings.telegram;
    }
}

export default new AppSettings();

