"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const events_1 = __importDefault(require("events"));
const config_1 = require("../config");
class BedrockProcess extends events_1.default {
    constructor() {
        super();
        this.proc = null;
        this.status = 'stopped';
        this.players = new Map();
        this.autoRestart = true;
        this.isStopping = false;
        this.restartTimeout = null;
    }
    isRunning() {
        return !!(this.proc && !this.proc.killed);
    }
    getStatus() {
        return this.status;
    }
    getPlayers() {
        return Array.from(this.players.values());
    }
    startServer() {
        if (this.isRunning()) {
            return { started: false, message: 'Server already running' };
        }
        try {
            this.isStopping = false;
            this.proc = (0, child_process_1.spawn)('./bedrock_server', { cwd: config_1.BDS_DIR });
        }
        catch (error) {
            this.status = 'error';
            this.emit('output', `Failed to start server: ${error.message}`);
            return { started: false, message: error.message };
        }
        this.status = 'running';
        this.emit('status', this.status);
        this.proc.stdout.on('data', (data) => {
            const text = data.toString();
            this.emit('output', text);
            this.trackPlayers(text);
        });
        this.proc.stderr.on('data', (data) => {
            const text = data.toString();
            this.emit('output', text);
        });
        this.proc.on('error', (err) => {
            this.emit('output', `Process error: ${err.message}`);
        });
        this.proc.on('close', (code) => {
            this.status = 'stopped';
            this.proc = null;
            this.players.clear();
            this.emit('status', this.status);
            this.emit('players', this.getPlayers());
            this.emit('output', `[Process] Server stopped with code ${code}`);
            if (!this.isStopping && this.autoRestart) {
                this.emit('output', '[Process] Server crashed or stopped unexpectedly. Restarting in 5 seconds...');
                this.restartTimeout = setTimeout(() => {
                    this.startServer();
                }, 5000);
            }
            this.isStopping = false;
        });
        return { started: true };
    }
    stopServer() {
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = null;
        }
        if (!this.isRunning() || !this.proc) {
            return { stopped: false, message: 'Server not running' };
        }
        this.status = 'stopping';
        this.isStopping = true;
        this.emit('status', this.status);
        try {
            this.proc.stdin.write('stop\n');
        }
        catch (error) {
            this.proc.kill('SIGINT');
        }
        return { stopped: true };
    }
    async restartServer() {
        if (!this.isRunning()) {
            const result = this.startServer();
            if (!result.started) {
                return { restarted: false, message: result.message };
            }
            return { restarted: true, message: 'Server started' };
        }
        await new Promise((resolve) => {
            if (this.proc) {
                this.proc.once('close', resolve);
                this.stopServer();
            }
            else {
                resolve(null);
            }
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = this.startServer();
        if (!result.started) {
            return { restarted: false, message: result.message };
        }
        return { restarted: true };
    }
    sendCommand(command) {
        if (!this.isRunning() || !this.proc) {
            return { sent: false, message: 'Server not running' };
        }
        try {
            this.proc.stdin.write(`${command}\n`);
        }
        catch (error) {
            return { sent: false, message: error.message };
        }
        return { sent: true };
    }
    trackPlayers(text) {
        const lines = text.split(/\r?\n/).filter(Boolean);
        lines.forEach((line) => {
            const joinMatch = line.match(/Player (?:connected|Connected):\s*([^,]+),\s*xuid:\s*(\d+)/i);
            if (joinMatch) {
                const [, name, xuid] = joinMatch;
                this.players.set(xuid, {
                    name: name.trim(),
                    xuid,
                    gamemode: 'survival',
                    ping: 0,
                });
                this.emit('players', this.getPlayers());
                return;
            }
            const leaveMatch = line.match(/Player (?:disconnected|Disconnected):\s*([^,]+),\s*xuid:\s*(\d+)/i);
            if (leaveMatch) {
                const [, name, xuid] = leaveMatch;
                this.players.delete(xuid);
                this.emit('players', this.getPlayers());
                return;
            }
            const pingMatch = line.match(/Player Ping:\s*([^,]+),\s*(\d+)/i);
            if (pingMatch) {
                const [, name, ping] = pingMatch;
                const player = Array.from(this.players.values()).find((p) => p.name === name.trim());
                if (player) {
                    player.ping = Number(ping);
                    this.players.set(player.xuid, player);
                    this.emit('players', this.getPlayers());
                }
            }
        });
    }
}
exports.default = new BedrockProcess();
