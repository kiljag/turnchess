/**
 * create a websocket server
 * handle message types
 */

import express from "express";
import http from 'http';
import { WebSocket } from "ws";
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import * as types from './types';

import { handleCreateRoom } from "./create_room";
import { handleJoinRoom } from "./join_room";
import { handleAddToRoom } from "./add_to_room";
import { handleMakeMove } from "./make_move";
import { handleLeaveRoom } from "./leave_room";
import { handleChatMessage } from "./chat_handler";
import { handleOnDisconnect } from "./disconnected";

const app = express();
app.use(cors());

const httpServer = http.createServer(app);
const wss = new WebSocket.Server({
    server: httpServer,
});

wss.on('connection', (ws: any) => {

    // assign a unique id to the socket.
    // is useful for message authentication.
    // detect and handle when the player is disconnected.
    ws.sessionId = uuidv4();

    // userId, used for broadcasting and for logging
    ws.userId = Math.floor(1000000000 + (Math.random() * 8999999999));

    console.log(`(${ws.userId}) connection created : ${ws.sessionId}`);

    // close handler
    ws.on('close', () => {
        console.log(`(${ws.userId}) connection closed : ${ws.sessionId}`);
        handleOnDisconnect(ws);
    });

    ws.on('error', () => {
        console.log(`(${ws.userId}) connection error : ${ws.sessionId}`);
    });

    // message handler
    ws.on('message', (data: any) => {
        try {
            const message = JSON.parse(data.toString());
            console.log(`(${ws.userId}) received `, message);

            const type = message['type'];
            const payload = message['payload'];

            switch (type) {
                case types.TYPE_CREATE_ROOM: {
                    handleCreateRoom(ws, payload);
                    break;
                }

                case types.TYPE_JOIN_ROOM: {
                    handleJoinRoom(ws, payload);
                    break;
                }

                case types.TYPE_ADD_TO_ROOM: {
                    handleAddToRoom(ws, payload);
                    break;
                }

                case types.TYPE_MAKE_MOVE: {
                    handleMakeMove(ws, payload);
                    break;
                }

                case types.TYPE_LEAVE_ROOM: {
                    handleLeaveRoom(ws, payload);
                    break;
                }

                case types.TYPE_CHAT_MESSAGE: {
                    handleChatMessage(ws, payload);
                    break;
                }

                default: {
                    console.log('invalid type : ', type);
                    break;
                }
            }

        } catch (err) {
            console.log(`(${ws.loggerId}) erron in parsing message`, err);
        }
    });
});

export default httpServer;