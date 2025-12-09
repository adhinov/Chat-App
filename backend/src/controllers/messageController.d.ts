// src/controllers/messageController.d.ts
import { RequestHandler } from "express";

declare const upload: any;

export const uploadMessageFile: RequestHandler;
export const getMessages: RequestHandler;
export const sendTextMessage: RequestHandler;
export { upload };
