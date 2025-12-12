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
                        await this.sendMessage(`📊 **Server Status**\nStatus: ${status}\nOnline: ${players.length} players`);
                        break;

                    case '/list':
                    case '/users':
                        isBotCommand = true;
                        const activePlayers = bedrockProcess.getPlayers();
                        if (activePlayers.length === 0) {
                            await this.sendMessage('👥 **Active Players**\nNo players currently online.');
                        } else {
                            const playerList = activePlayers.map(p => `- ${p.name} (Ping: ${p.ping}ms)`).join('\n');
                            await this.sendMessage(`👥 **Active Players (${activePlayers.length})**\n${playerList}`);
                        }
                        break;

                    case '/start':
                        isBotCommand = true;
                        const startRes = bedrockProcess.startServer();
                        await this.sendMessage(startRes.started ? '🚀 Starting server...' : `❌ Failed to start: ${startRes.message}`);
                        break;

                    case '/stop':
                        isBotCommand = true;
                        const stopRes = bedrockProcess.stopServer();
                        await this.sendMessage(stopRes.stopped ? '🛑 Stopping server...' : `❌ Failed to stop: ${stopRes.message}`);
                        break;

                    case '/restart':
                        isBotCommand = true;
                        await this.sendMessage('🔄 Restarting server...');
                        const restartRes = await bedrockProcess.restartServer();
                        await this.sendMessage(restartRes.restarted ? '✅ Server restarted.' : `❌ Failed to restart: ${restartRes.message}`);
                        break;

                    case '/kick':
                        isBotCommand = true;
                        if (!args) {
                            await this.sendMessage('⚠️ Usage: /kick <player_name>');
                        } else {
                            const kickCmd = `kick "${args}"`;
                            const kickResult = bedrockProcess.sendCommand(kickCmd);
                            if (kickResult.sent) {
                                await this.sendMessage(`👢 **Kicked**: ${args}`);
                            } else {
                                await this.sendMessage(`❌ Failed to kick: ${kickResult.message}`);
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
                                await this.sendMessage(`🚫 **Banned**: ${args}`);
                            } else {
                                await this.sendMessage(`❌ Failed to ban: ${banResult.message}`);
                            }
                        }
                        break;

                    case '/help':
                        isBotCommand = true;
                        const helpMsg = `
🤖 **Bot Commands**
/status - Check server status
/list - List active players
/start - Start server
/stop - Stop server
/restart - Restart server
/kick <name> - Kick a player
/ban <name> - Ban a player
/help - Show this message

**Server Console:**
You can type any Minecraft command (e.g., "time set day", "weather clear"). The bot will forward it to the server console.
(Leading "/" is optional for console commands).
                        `;
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
                    await this.sendMessage(`📥 **Command Sent**: \`${cmdToSend}\``);
                } else {
                    await this.sendMessage(`⚠️ **Failed**: ${result.message}`);
                }
            }
        });
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
