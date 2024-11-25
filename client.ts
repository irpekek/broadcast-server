import * as readline from 'node:readline';
import { isIMessageData, IUserData } from './main.ts';
import { randomUUID } from 'node:crypto';
import process from 'node:process';

export async function joinChatServer(
  hostname: string,
  port: number,
  username: string
) {
  const wsUri = `ws://${hostname}:${port}`;
  const socket = new WebSocket(wsUri);

  // * Login process
  const existingUser = await hasLoggedIn(username);
  if (!existingUser) userLogin(username);
  else {
    console.log('Username already taken');
    Deno.exit(0);
  }

  // * Creating IO interface
  const rl = readline.createInterface(process.stdin, process.stdout);

  socket.addEventListener('open', () => handleOpen(username, socket, rl));
  socket.addEventListener('message', (e) => handleMessage(e));
  socket.addEventListener('close', () => handleClose(socket));
  socket.addEventListener('error', (err) => handleError(err));
}

function handleOpen(
  username: string,
  socket: WebSocket,
  rl: readline.Interface,
) {
  // * sending packet to server using tty
  rl.on('line', (input: string) => {
    const data = JSON.stringify({ user: username, message: input });
    socket.send(data);
  });

  // * this process will be performed when the client disconnects
  rl.on('SIGINT', async () => {
    await userLogout(username);
    const data = JSON.stringify({ user: username, message: 'Disconnected' });
    if (socket.readyState === 1) socket.close(4000, data);
    setTimeout(() => process.exit(0), 1000);
  });
}
function handleMessage(event: MessageEvent) {
  const messageData = JSON.parse(event.data);
  if (isIMessageData(messageData)) {
    console.log(`${messageData.user} : ${messageData.message}`);
  }
}
function handleClose(socket: WebSocket) {
  if (socket.readyState === WebSocket.CLOSED) {
    console.log('Disconnected from server');
    Deno.exit(0);
  }
}
function handleError(error: unknown) {
  console.error(error);
}

async function hasLoggedIn(username: string): Promise<boolean> {
  const jsonData = await Deno.readTextFile('connected-clients.json');
  const existingUsers = JSON.parse(jsonData);
  if (Array.isArray(existingUsers)) {
    const user = existingUsers.filter((user) => user.username === username);
    return user.length !== 0 ? true : false;
  }
  return false;
}

async function userLogin(username: string): Promise<void> {
  const uuid = randomUUID();
  const jsonData = await Deno.readTextFile('connected-clients.json');
  const existingUsers = JSON.parse(jsonData);
  // * mimick sending data to database ("JSON")
  const newUser = { id: uuid, username: username };
  const passedData = [...existingUsers, newUser];
  await Deno.writeTextFile(
    'connected-clients.json',
    JSON.stringify(passedData)
  );
}

async function userLogout(username: string): Promise<void> {
  const jsonData = await Deno.readTextFile('connected-clients.json');
  const users = JSON.parse(jsonData);
  const passedData = users.filter(
    (user: IUserData) => user.username !== username
  );
  await Deno.writeTextFile(
    'connected-clients.json',
    JSON.stringify(passedData)
  );
}
