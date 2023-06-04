import express, { Express, Request, Response } from "express";
import http from 'http';
import { WebSocket } from "ws";
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import * as handlers from "./handlers";
import * as types from "./types";


const PORT = 8080;
const app: Express = express();
app.use(cors);

const httpServer = http.createServer(app);
const wss = new WebSocket.Server({
    server: httpServer,
});

// chess websockets
wss.on('connection', (ws: any) => {

    ws.connectionId = 'connection-' + uuidv4();

    ws.on('close', () => {
        console.log('connection closed : ', ws.connectionId);
    });

    ws.on('message', (data: any) => {
        try {
            const message = JSON.parse(data.toString());
            console.log('received : ', message);
            const type = message['type'];
            const payload = message['payload'] || {};

            switch (type) {
                case types.TYPE_CREATE_ROOM: {
                    handlers.handleCreateRoom(ws, payload);
                    break;
                }

                case types.TYPE_JOIN_ROOM: {
                    handlers.handleJoinRoom(ws, payload);
                    break;
                }

                case types.TYPE_ADD_TO_ROOM: {
                    handlers.handleAddToRoom(ws, payload);
                    break;
                }

                case types.TYPE_MAKE_MOVE: {
                    handlers.handleMakeMove(ws, payload);
                    break;
                }

                case types.TYPE_LEAVE_ROOM: {
                    handlers.handleLeaveRoom(ws, payload);
                    break;
                }

                default: {
                    console.log('invalid type : ', type);
                    break;
                }
            }
        } catch (err) {
            console.error(err, data.toString());
        }
    });
});

httpServer.listen(PORT, () => {
    console.log(`server listening on port ${PORT}`)
});

