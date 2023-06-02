import { WebSocket } from "ws";
import { Color } from "chess.js";
import * as types from './types';
import * as util from './util';
import { GameRoom } from "./room";

const roomIdToGameRoom: Record<string, GameRoom> = {}
const playerIdtoRoomId: Record<string, string> = {}

export function handleCreateRoom(ws: WebSocket, payload: any) {

    // assign random color if not selected by player
    let c = payload || payload['color'] as string;
    let color: Color = c === 'w' ? 'w' : c === 'b' ? 'b'
        : (Math.random() < 0.5 ? "w" : "b");

    let room = new GameRoom();
    let playerInfo = room.addPlayer(ws, color);
    roomIdToGameRoom[room.roomId] = room;
    playerIdtoRoomId[playerInfo.playerId] = room.roomId;
    room.notifyNewPlayer(ws, playerInfo);

}

export function handleJoinRoom(ws: WebSocket, payload: any) {

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

    let playerInfo = room.addPlayer(ws, room.getAvailableColor());
    roomIdToGameRoom[room.roomId] = room;
    playerIdtoRoomId[playerInfo.playerId] = roomId;
    room.notifyNewPlayer(ws, playerInfo);
    console.log('starting game ', roomId);
    room.startGame(); // start the game
}

export function handleViewRoom(ws: WebSocket, payload: any) {

    let roomId = payload['roomId'] as string;
    let room = roomIdToGameRoom[roomId];
    if (room === undefined) {
        console.log('invalid roomId : ', roomId);
        ws.close();
        return;
    }

    let playerInfo = room.addPlayer(ws, 'v');
    room.notifyNewPlayer(ws, playerInfo);
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

        let valid = room.maveMove(playerId, move);
        if (!valid) {
            console.error('invalid move:', move);
            ws.close();
            return;
        }

        // broadcast
        room.broadCastToAll({
            type: types.TYPE_CHESS_MOVE,
            payload: {
                'move': move
            }
        });

        if (room.chess.isGameOver()) {
            room.endGame();
        }

    } catch (err) {
        console.error('error in make move : ', err);
    }
}

