const TelegramBot = require('node-telegram-bot-api');
const appSettings = require('./appSettings');
const bedrockProcess = require('./bedrockProcess');

class TelegramService {
    constructor() {
        this.bot = null;
        this.config = appSettings.getTelegram();
        this.lastPlayers = [];
        this.hourlyInterval = null;

        // Initialize if enabled
        if (this.config.enabled && this.config.botToken && this.config.chatId) {
            this.initBot();
        }

        this.setupListeners();
    }

    initBot() {
        try {
            if (this.bot) {
                this.bot.stopPolling();
            }
            this.bot = new TelegramBot(this.config.botToken, { polling: false }); // We only send messages primarily, polling not strictly needed unless we want commands
            console.log('Telegram Bot initialized');
            this.startHourlyStatus();
        } catch (err) {
            console.error('Failed to init Telegram bot:', err);
        }
    }

    reconfigure() {
        this.config = appSettings.getTelegram();
        if (this.config.enabled && this.config.botToken && this.config.chatId) {
            this.initBot();
            this.sendMessage('Telegram notifications have been updated and re-enabled.');
        } else {
            if (this.bot) {
                // this.bot.stopPolling();
                this.bot = null;
            }
            if (this.hourlyInterval) {
                clearInterval(this.hourlyInterval);
                this.hourlyInterval = null;
            }
        }
    }

    sendMessage(text) {
        if (!this.bot || !this.config.enabled || !this.config.chatId) return;
        this.bot.sendMessage(this.config.chatId, text).catch(err => {
            console.error('Telegram Send Error:', err.message);
        });
    }

    setupListeners() {
        // Server Status Events
        bedrockProcess.on('status', (status) => {
            if (status === 'running' && this.config.events.serverStart) {
                this.sendMessage('🟢 **Server Started**\nThe Minecraft server is now online.');
            } else if (status === 'stopped' && this.config.events.serverStop) {
                this.sendMessage('🔴 **Server Stopped**\nThe Minecraft server has stopped.');
            }
        });

        // Player Events (Diffing)
        bedrockProcess.on('players', (currentPlayers) => {
            // Check for joins
            const joined = currentPlayers.filter(p => !this.lastPlayers.find(lp => lp.xuid === p.xuid));
            joined.forEach(p => {
                if (this.config.events.playerJoin) {
                    this.sendMessage(`👤 **Player Joined**\n${p.name} has joined the game.`);
                }
            });

            // Check for leaves
            const left = this.lastPlayers.filter(lp => !currentPlayers.find(p => p.xuid === lp.xuid));
            left.forEach(p => {
                if (this.config.events.playerLeave) {
                    this.sendMessage(`👋 **Player Left**\n${p.name} has left the game.`);
                }
            });

            this.lastPlayers = [...currentPlayers];
        });

        // Console Output parsing for Bans
        bedrockProcess.on('output', (line) => {
            if (this.config.events.playerBan) {
                // Typical Bedrock ban message: "Banned Player: Steve" or similar?
                // Actual message: "Player <name> has been Banned" or similar.
                // Let's look for "Banned" keyword or "Unbanned".
                // Based on simple bedrock behavior, it might be "Banned Name".
                if (line.includes('Banned') && !line.includes('Function')) { // Avoid debugging noise
                    this.sendMessage(`🚫 **Ban Event Detected**\nLog: ${line}`);
                }
            }
        });
    }

    startHourlyStatus() {
        if (this.hourlyInterval) clearInterval(this.hourlyInterval);

        this.hourlyInterval = setInterval(() => {
            if (!this.config.events.hourlyStatus || !this.bot) return;

            const status = bedrockProcess.getStatus();
            const players = bedrockProcess.getPlayers();
            const memUsage = process.memoryUsage().rss / 1024 / 1024;

            let msg = `🕒 **Hourly Status Report**\n`;
            msg += `Status: ${status === 'running' ? '🟢 Online' : '🔴 Offline'}\n`;
            msg += `Players: ${players.length}\n`;
            msg += `RAM Usage (Panel): ${memUsage.toFixed(2)} MB`;

            this.sendMessage(msg);
        }, 3600000); // 1 hour
    }
}

module.exports = new TelegramService();
