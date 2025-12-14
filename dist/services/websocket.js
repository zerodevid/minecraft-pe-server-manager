"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWebSocket = initWebSocket;
exports.broadcastConsole = broadcastConsole;
exports.broadcastPlayers = broadcastPlayers;
const ws_1 = require("ws");
let consoleServer;
let playerServer;
function initWebSocket(httpServer) {
    consoleServer = new ws_1.Server({ noServer: true });
    playerServer = new ws_1.Server({ noServer: true });
    httpServer.on('upgrade', (req, socket, head) => {
        const { pathname } = new URL(req.url || '', 'http://localhost');
        const handlers = {
            '/ws/console': () => {
                consoleServer.handleUpgrade(req, socket, head, (ws) => {
                    consoleServer.emit('connection', ws, req);
                });
            },
            '/ws/players': () => {
                playerServer.handleUpgrade(req, socket, head, (ws) => {
                    playerServer.emit('connection', ws, req);
                });
            },
        };
        const handler = handlers[pathname];
        if (!handler) {
            socket.destroy();
            return;
        }
        handler();
    });
    consoleServer.on('connection', (ws) => {
        ws.send(JSON.stringify({ type: 'info', message: 'Console stream ready' }));
    });
    playerServer.on('connection', (ws) => {
        ws.send(JSON.stringify({ type: 'info', message: 'Player stream ready' }));
    });
}
function broadcastConsole(message) {
    if (!consoleServer)
        return;
    const payload = JSON.stringify({ type: 'console', message });
    consoleServer.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(payload);
        }
    });
}
function broadcastPlayers(players) {
    if (!playerServer)
        return;
    const payload = JSON.stringify({ type: 'players', players });
    playerServer.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(payload);
        }
    });
}
exports.default = {
    initWebSocket,
    broadcastConsole,
    broadcastPlayers,
};
