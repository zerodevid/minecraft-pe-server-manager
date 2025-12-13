import { Server as WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let consoleServer: WebSocketServer;
let playerServer: WebSocketServer;

export function initWebSocket(httpServer: Server) {
  consoleServer = new WebSocketServer({ noServer: true });
  playerServer = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url || '', 'http://localhost');
    const handlers: { [key: string]: () => void } = {
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

export function broadcastConsole(message: string) {
  if (!consoleServer) return;
  const payload = JSON.stringify({ type: 'console', message });
  consoleServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

export function broadcastPlayers(players: any[]) {
  if (!playerServer) return;
  const payload = JSON.stringify({ type: 'players', players });
  playerServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

export default {
  initWebSocket,
  broadcastConsole,
  broadcastPlayers,
};
