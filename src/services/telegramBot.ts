import fs from 'fs';
import os from 'os';
import path from 'path';
import TelegramBot from 'node-telegram-bot-api';
import { BDS_DIR } from '../config';
import appSettings from './appSettings';
import bedrockProcess, { Player } from './bedrockProcess';

const SERVER_PROPERTIES = path.join(BDS_DIR, 'server.properties');

class TelegramService {
    private bot: TelegramBot | null;
    private config: any;
    private lastPlayers: Player[];
    private hourlyInterval: NodeJS.Timeout | null;

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
            // Enable polling to receive commands
            this.bot = new TelegramBot(this.config.botToken, { polling: true });
            console.log('Telegram Bot initialized');

            this.setupMessageListener();
            this.startHourlyStatus();
        } catch (err) {
            console.error('Failed to init Telegram bot:', err);
        }
    }

    setupMessageListener() {
        if (!this.bot) return;

        this.bot.on('message', async (msg) => {
            // Security: Only allow configured Chat ID
            if (String(msg.chat.id) !== String(this.config.chatId)) {
                // Optional: log unauthorized access
                console.log(`Unauthorized Telegram command from ${msg.chat.id}`);
                return;
            }

            const text = msg.text;
            if (!text) return;

            // Handle Bot Control Commands
            let isBotCommand = false;
            if (text.startsWith('/')) {
                const parts = text.split(' ');
                const command = parts[0].toLowerCase();
                const args = parts.slice(1).join(' ');

                switch (command) {
                    case '/status':
                        isBotCommand = true;
                        const status = bedrockProcess.getStatus();
                        const players = bedrockProcess.getPlayers();
                        await this.sendMessage([
                            '📊 <b>Server Status</b>',
                            `Status: ${this.formatStatusLabel(status)}`,
                            `Players: ${players.length}`,
                            this.formatServerAddressLine(),
                        ].join('\n'));
                        break;

                    case '/list':
                    case '/users':
                        isBotCommand = true;
                        const activePlayers = bedrockProcess.getPlayers();
                        if (activePlayers.length === 0) {
                            await this.sendMessage('👥 <b>Active Players</b>\nNo players currently online.');
                        } else {
                            const playerList = activePlayers
                                .map(p => `• ${this.escapeHtml(p.name)} (Ping: ${p.ping}ms)`)
                                .join('\n');
                            await this.sendMessage(`👥 <b>Active Players (${activePlayers.length})</b>\n${playerList}`);
                        }
                        break;

                    case '/start':
                        isBotCommand = true;
                        const startRes = bedrockProcess.startServer();
                        await this.sendMessage(startRes.started ? '🚀 Starting server...' : `❌ Failed to start: ${this.escapeHtml(startRes.message ?? 'Unknown error')}`);
                        break;

                    case '/stop':
                        isBotCommand = true;
                        const stopRes = bedrockProcess.stopServer();
                        await this.sendMessage(stopRes.stopped ? '🛑 Stopping server...' : `❌ Failed to stop: ${this.escapeHtml(stopRes.message ?? 'Unknown error')}`);
                        break;

                    case '/restart':
                        isBotCommand = true;
                        await this.sendMessage('🔄 Restarting server...');
                        const restartRes = await bedrockProcess.restartServer();
                        await this.sendMessage(restartRes.restarted ? '✅ Server restarted.' : `❌ Failed to restart: ${this.escapeHtml(restartRes.message ?? 'Unknown error')}`);
                        break;

                    case '/kick':
                        isBotCommand = true;
                        if (!args) {
                            await this.sendMessage('⚠️ Usage: /kick <player_name>');
                        } else {
                            const kickCmd = `kick "${args}"`;
                            const kickResult = bedrockProcess.sendCommand(kickCmd);
                            if (kickResult.sent) {
                                await this.sendMessage(`👢 <b>Kicked</b>: <code>${this.escapeHtml(args)}</code>`);
                            } else {
                                await this.sendMessage(`❌ Failed to kick: ${this.escapeHtml(kickResult.message ?? 'Unknown error')}`);
                            }
                        }
                        break;

                    case '/ban':
                        isBotCommand = true;
                        if (!args) {
                            await this.sendMessage('⚠️ Usage: /ban <player_name>');
                        } else {
                            const banCmd = `ban "${args}"`;
                            const banResult = bedrockProcess.sendCommand(banCmd);
                            if (banResult.sent) {
                                await this.sendMessage(`🚫 <b>Banned</b>: <code>${this.escapeHtml(args)}</code>`);
                            } else {
                                await this.sendMessage(`❌ Failed to ban: ${this.escapeHtml(banResult.message ?? 'Unknown error')}`);
                            }
                        }
                        break;

                    case '/help':
                        isBotCommand = true;
                        const helpMsg = [
                            '🤖 <b>Bot Commands</b>',
                            '<code>/status</code> - Check server status',
                            '<code>/list</code> - List active players',
                            '<code>/start</code> - Start server',
                            '<code>/stop</code> - Stop server',
                            '<code>/restart</code> - Restart server',
                            '<code>/kick &lt;name&gt;</code> - Kick a player',
                            '<code>/ban &lt;name&gt;</code> - Ban a player',
                            '<code>/help</code> - Show this message',
                            '',
                            '<b>Server Console:</b>',
                            'Type any Minecraft command (e.g., <code>time set day</code>, <code>weather clear</code>).',
                            'Commands starting with "/" will be sent without the slash for console compatibility.',
                        ].join('\n');
                        await this.sendMessage(helpMsg);
                        break;
                }
            }

            if (!isBotCommand) {
                // Determine the command to send
                // If it starts with "/" but wasn't handled above, strip the "/" for console compatibility
                let cmdToSend = text;
                if (cmdToSend.startsWith('/')) {
                    cmdToSend = cmdToSend.substring(1);
                }

                // Prevent sending empty commands
                if (!cmdToSend.trim()) return;

                const result = bedrockProcess.sendCommand(cmdToSend);
                if (result.sent) {
                    await this.sendMessage(`📥 <b>Command Sent</b>: <code>${this.escapeHtml(cmdToSend)}</code>`);
                } else {
                    await this.sendMessage(`⚠️ <b>Failed</b>: ${this.escapeHtml(result.message ?? 'Unknown error')}`);
                }
            }
        });
    }

    reconfigure() {
        this.config = appSettings.getTelegram();
        if (this.config.enabled && this.config.botToken && this.config.chatId) {
            this.initBot();
            this.sendMessage('Telegram notifications have been updated and re-enabled.').catch(() => { });
        } else {
            this.stopBot();
        }
    }

    stopBot() {
        if (this.bot) {
            try {
                this.bot.stopPolling();
            } catch (err: any) {
                console.error('Failed to stop Telegram bot polling:', err.message);
            }
            this.bot = null;
        }
        if (this.hourlyInterval) {
            clearInterval(this.hourlyInterval);
            this.hourlyInterval = null;
        }
    }

    private escapeHtml(value: string) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private getServerPort() {
        try {
            if (!fs.existsSync(SERVER_PROPERTIES)) {
                return null;
            }
            const content = fs.readFileSync(SERVER_PROPERTIES, 'utf-8');
            const match = content.match(/^server-port\s*=\s*(.+)$/m);
            if (match) {
                return match[1].trim();
            }
        } catch (err) {
            console.warn('Unable to read server.properties:', (err as Error).message);
        }
        return null;
    }

    private getServerIpAddress() {
        if (process.env.SERVER_IP) {
            return process.env.SERVER_IP;
        }
        const interfaces = os.networkInterfaces();
        for (const entries of Object.values(interfaces)) {
            if (!entries) continue;
            for (const detail of entries) {
                if (!detail) continue;
                const familyValue = (detail as { family: string | number }).family;
                const isIPv4 =
                    (typeof familyValue === 'string' && familyValue === 'IPv4') ||
                    (typeof familyValue === 'number' && familyValue === 4);
                if (isIPv4 && !detail.internal) {
                    return detail.address;
                }
            }
        }
        return null;
    }

    private getServerAddress() {
        const ip = this.getServerIpAddress();
        const port = this.getServerPort();
        if (ip && port) {
            return `${ip}:${port}`;
        }
        if (ip) {
            return ip;
        }
        if (port) {
            return `:${port}`;
        }
        return 'Unavailable';
    }

    private formatServerAddressLine() {
        return `Server IP: <code>${this.escapeHtml(this.getServerAddress())}</code>`;
    }

    private formatStatusLabel(status: string) {
        if (status === 'running') {
            return '🟢 Online';
        }
        if (status === 'stopped') {
            return '🔴 Offline';
        }
        if (status === 'stopping') {
            return '🟡 Stopping';
        }
        return this.escapeHtml(status || 'Unknown');
    }

    sendMessage(text: string) {
        if (!this.config.enabled) {
            return Promise.reject(new Error('Telegram notifications are disabled.'));
        }
        if (!this.config.chatId) {
            return Promise.reject(new Error('Telegram chat ID is not set.'));
        }
        if (!this.bot) {
            return Promise.reject(new Error('Telegram bot is not running.'));
        }
        return this.bot
            .sendMessage(this.config.chatId, text, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            })
            .catch(err => {
            console.error('Telegram Send Error:', err.message);
            throw err;
        });
    }

    setupListeners() {
        // Server Status Events
        bedrockProcess.on('status', (status) => {
            if (status === 'running' && this.config?.events?.serverStart) {
                const message = [
                    '🟢 <b>Server Started</b>',
                    'The Minecraft server is now online.',
                    this.formatServerAddressLine(),
                ].join('\n');
                this.sendMessage(message).catch(() => { });
            } else if (status === 'stopped' && this.config?.events?.serverStop) {
                this.sendMessage('🔴 <b>Server Stopped</b>\nThe Minecraft server has stopped.').catch(() => { });
            }
        });

        // Player Events (Diffing)
        bedrockProcess.on('players', (currentPlayers: Player[]) => {
            // Check for joins
            const joined = currentPlayers.filter(p => !this.lastPlayers.find(lp => lp.xuid === p.xuid));
            joined.forEach(p => {
                if (this.config?.events?.playerJoin) {
                    this.sendMessage(`👤 <b>Player Joined</b>\n${this.escapeHtml(p.name)} has joined the game.`).catch(() => { });
                }
            });

            // Check for leaves
            const left = this.lastPlayers.filter(lp => !currentPlayers.find(p => p.xuid === lp.xuid));
            left.forEach(p => {
                if (this.config?.events?.playerLeave) {
                    this.sendMessage(`👋 <b>Player Left</b>\n${this.escapeHtml(p.name)} has left the game.`).catch(() => { });
                }
            });

            this.lastPlayers = [...currentPlayers];
        });

        // Console Output parsing for Bans
        bedrockProcess.on('output', (line) => {
            if (this.config?.events?.playerBan) {
                // Typical Bedrock ban message: "Banned Player: Steve" or similar?
                // Actual message: "Player <name> has been Banned" or similar.
                // Let's look for "Banned" keyword or "Unbanned".
                // Based on simple bedrock behavior, it might be "Banned Name".
                if (line.includes('Banned') && !line.includes('Function')) { // Avoid debugging noise
                    this.sendMessage(`🚫 <b>Ban Event Detected</b>\nLog: <code>${this.escapeHtml(line)}</code>`).catch(() => { });
                }
            }
        });
    }

    startHourlyStatus() {
        if (this.hourlyInterval) clearInterval(this.hourlyInterval);

        this.hourlyInterval = setInterval(() => {
            if (!this.config?.events?.hourlyStatus || !this.bot) return;

            const status = bedrockProcess.getStatus();
            const players = bedrockProcess.getPlayers();
            const memUsage = process.memoryUsage().rss / 1024 / 1024;

            const msg = [
                '🕒 <b>Hourly Status Report</b>',
                `Status: ${this.formatStatusLabel(status)}`,
                `Players: ${players.length}`,
                `RAM Usage (Panel): ${memUsage.toFixed(2)} MB`,
                this.formatServerAddressLine(),
            ].join('\n');

            this.sendMessage(msg).catch(() => { });
        }, 3600000); // 1 hour
    }
}

export default new TelegramService();
