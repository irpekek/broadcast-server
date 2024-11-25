#!/usr/bin/env -S deno run -A
import { createChatServer } from "./server.ts";
import { joinChatServer } from "./client.ts";

export interface IUserData {
  id: string;
  username: string;
}
export interface IMessageData {
  user: string;
  message: string;
}

export const isIMessageData = (obj: unknown): obj is IMessageData => {
  return obj !== null && typeof obj === 'object' && 'user' in obj;
};

switch (Deno.args[0]) {
  case 'start':
    createChatServer('localhost', 5000);
    break;
  case 'connect':
    if (Deno.args[1]) await joinChatServer('localhost', 5000, Deno.args[1]);
    else console.log('Please input username');
    break;
  default:
    break;
}
