import * as readline from 'node:readline';
import { IMessageData, isIMessageData } from './main.ts';
import process from 'node:process';

const CLIENTS = new Set<WebSocket>();

export function createChatServer(hostname: string, port: number): void {
  // * Creating server
  Deno.serve({ hostname, port }, (request: Request): Response => {
    // * Upgrade connection to websocket
    if (request.headers.get('upgrade') != 'websocket')
      return new Response(null, { status: 501 });
    const { socket, response } = Deno.upgradeWebSocket(request);

    // * Creating IO interface
    const rl = readline.createInterface(process.stdin, process.stdout);
    socket.addEventListener('open', () => handleOpen(socket, rl));
    socket.addEventListener('message', (e) => handleMessage(socket, e));
    socket.addEventListener('error', (error) => handleError(error));
    socket.addEventListener('close', (e) => handleClose(socket, e));

    return response;
  });
}

async function handleSigInt(): Promise<void> {
  // * Close all socket connection
  for (const client of CLIENTS) {
    if (client.readyState === WebSocket.OPEN) client.close();
  }
  await Deno.writeTextFile('connected-clients.json', JSON.stringify([]));
  console.log('Server shutdown');
  setTimeout(() => Deno.exit(0), 1000);
}

function handleOpen(socket: WebSocket, rl: readline.Interface): void {
  CLIENTS.add(socket);
  socket.send(
    JSON.stringify({ user: 'server', message: 'Connected to server' })
  );

  rl.on('SIGINT', handleSigInt);
}

function handleMessage(socket: WebSocket, event: MessageEvent): void {
  const incomingMessage = JSON.parse(event.data);
  if (isIMessageData(incomingMessage)) {
    if (incomingMessage.message === 'ping')
      socket.send(JSON.stringify({ user: 'server', message: 'pong' }));
    else broadcastMessage(incomingMessage, CLIENTS);
  }
}

function handleClose(socket: WebSocket, event: CloseEvent): void {
  CLIENTS.delete(socket);
  console.log(event.reason);
}

function handleError(error: unknown): void {
  if (error instanceof ErrorEvent) console.log(error.message);
}

function broadcastMessage(messageData: IMessageData, clients: Set<WebSocket>):void {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN)
      client.send(JSON.stringify(messageData));
  }
}
