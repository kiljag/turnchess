import { WebSocket } from "ws";
import { Color } from "chess.js";
import * as types from './types';
import { GameRoom } from "./room";

const roomIdToGameRoom: Record<string, GameRoom> = {}
const playerIdtoRoomId: Record<string, string> = {}

export function handleCreateRoom(ws: WebSocket, payload: any) {

    let room = new GameRoom();
    roomIdToGameRoom[room.roomId] = room;
    room.sendNewRoom(ws);
}

export function handleJoinRoom(ws: WebSocket, payload: any) {

    if (!payload) {
        console.log('invalid payload for joinroom', payload);
        ws.close();
        return;
    }

    let roomId = payload['roomId'] as string;
    let room = roomIdToGameRoom[roomId];
    if (room === undefined) {
        console.log('invalid roomId : ', roomId);
        ws.close();
        return;
    }

    if (room.isFull()) {
        console.log('room is full ', roomId);
        ws.send(JSON.stringify({
            type: types.TYPE_ROOM_FULL,
        }));
        return;
    }

    let color = payload['color'] as string;
    let c: Color;
    if (room.isEmpty() && (color === 'w' || color === 'b')) {
        c = color;
    } else {
        c = room.getAvailableColor();
    }

    let playerInfo = room.addPlayer(ws, c);
    playerIdtoRoomId[playerInfo.playerId] = roomId;
    room.sendNewPlayer(ws, playerInfo);

    if (room.isFull()) { // start the game
        console.log('starting game ', roomId);
        room.sendStartGame();
    }
}

export function handleViewRoom(ws: WebSocket, payload: any) {

    let roomId = payload['roomId'] as string;
    let room = roomIdToGameRoom[roomId];
    if (room === undefined) {
        console.log('invalid roomId : ', roomId);
        ws.close();
        return;
    }

    let viewerInfo = room.addViewer(ws);
    room.sendNewViewer(ws, viewerInfo);
}

export function handleLeaveRoom(ws: WebSocket, payload: any) {


}

export function handleMakeMove(ws: WebSocket, payload: any) {

    try {
        if (!payload || !payload['playerId'] || !payload['move']) {
            console.log('invalid payload', payload);
            ws.close();
            return;
        }

        let playerId = payload['playerId'];
        let move = payload['move'];
        let roomId = playerIdtoRoomId[playerId];
        let room = roomIdToGameRoom[roomId];
        if (!room) {
            console.error('no room found');
            ws.close();
            return;
        }

        let chessMove = room.makeMove(playerId, move);
        if (!chessMove) {
            console.error('invalid move:', move);
            ws.close();
            return;
        }

        // broadcast
        room.broadCastToAll({
            type: types.TYPE_CHESS_MOVE,
            payload: {
                'move': chessMove,
            }
        });

        room.checkEndGame();

    } catch (err) {
        console.error('error in make move : ', err);
    }
}

