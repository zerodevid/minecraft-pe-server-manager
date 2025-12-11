const { spawn } = require('child_process');
const EventEmitter = require('events');
const { BDS_DIR } = require('../config');

class BedrockProcess extends EventEmitter {
  constructor() {
    super();
    this.proc = null;
    this.status = 'stopped';
    this.players = new Map();
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
      this.proc = spawn('./bedrock_server', { cwd: BDS_DIR });
    } catch (error) {
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

    this.proc.on('close', () => {
      this.status = 'stopped';
      this.proc = null;
      this.players.clear();
      this.emit('status', this.status);
      this.emit('players', this.getPlayers());
    });

    return { started: true };
  }

  stopServer() {
    if (!this.isRunning()) {
      return { stopped: false, message: 'Server not running' };
    }

    this.status = 'stopping';
    this.emit('status', this.status);
    try {
      this.proc.stdin.write('stop\n');
    } catch (error) {
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
      this.proc.once('close', resolve);
      this.stopServer();
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const result = this.startServer();
    if (!result.started) {
      return { restarted: false, message: result.message };
    }
    return { restarted: true };
  }

  sendCommand(command) {
    if (!this.isRunning()) {
      return { sent: false, message: 'Server not running' };
    }

    try {
      this.proc.stdin.write(`${command}\n`);
    } catch (error) {
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

module.exports = new BedrockProcess();
