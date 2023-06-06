import { WebSocket } from "ws";
import { Color } from "chess.js";
import * as types from './types';
import { GameRoom } from "./room";
import { v4 as uuidv4 } from 'uuid';

const roomIdToGameRoom: Record<string, GameRoom> = {}

export function handleCreateRoom(ws: any, payload: any) {
    let room = new GameRoom();
    roomIdToGameRoom[room.roomId] = room;

    // send roominfo to host
    try {
        let hostInfo = room.setHost(ws);
        ws.sessionId = hostInfo.sessionId;
        ws.send(JSON.stringify({
            type: types.TYPE_ROOM_INFO,
            payload: {
                sessionId: hostInfo.sessionId,
                roomId: room.roomId,
                isHost: true,
            }
        }));

    } catch (err) {
        delete roomIdToGameRoom[room.roomId];
        console.error('error sending roominfo to host, ', err);
    }
}

export function handleJoinRoom(ws: any, payload: any) {

    if (!payload || !payload['roomId']) {
        console.log('invalid payload for joinroom', payload);
        ws.close();
        return;
    }

    let roomId = payload['roomId'] as string;
    let room = roomIdToGameRoom[roomId];
    if (!room) {
        console.log('no room found for ', roomId);
        ws.close();
        return;
    }

    if (room.isFull()) {
        console.log('room is full ', roomId);
        ws.send(JSON.stringify({
            type: types.TYPE_ROOM_IS_FULL,
        }));
        return;
    }

    // send roominfo to guest
    try {
        let guestInfo = room.setGuest(ws);
        ws.sessionId = guestInfo.sessionId;
        ws.send(JSON.stringify({
            type: types.TYPE_ROOM_INFO,
            payload: {
                sessionId: guestInfo.sessionId,
                roomId: room.roomId,
            },
        }));

        room.sendRoomCreated();
    } catch (err) {
        console.error('error sending roominfo to guest, ', err);
    }
}

export function handleAddToRoom(ws: WebSocket, payload: any) {

    // sanity check
    if ((payload === undefined) || (payload['sessionId'] === undefined) ||
        (payload['roomId'] === undefined)) {
        console.error('invalid add_to_room payload : ', payload);
        ws.close();
        return;
    }

    let sessionId = payload['sessionId'] as string;
    let roomId = payload['roomId'] as string;
    let color = payload['color'] as string;
    let room = roomIdToGameRoom[roomId];

    // player should be either host or guest
    if (room === undefined || !room.isCreated ||
        !room.isValidSessionId(sessionId)) {
        console.error('invalid roomId/sessionId : ', payload);
        ws.close();
        return;
    }

    // if board is already full
    if (room.boardIsFull()) {
        console.log('board is full, can not add player');
        ws.close();
        return;
    }

    // choose a color
    let c: Color;
    if (room.boardIsEmpty() && (color === 'w' || color === 'b')) {
        c = color;
    } else {
        c = room.getAvailableColor();
    }

    // create and send playerInfo
    let playerInfo = room.addPlayer(ws, c);
    room.sendPlayerInfo(ws, playerInfo);

    if (room.boardIsFull()) { // start the game
        console.log('starting game ', roomId);
        room.sendStartGame();
    }
}

export function handleMakeMove(ws: WebSocket, payload: any) {

    try {
        // sanity check
        if ((payload === undefined) || (payload['sessionId'] === undefined) ||
            (payload['roomId'] === undefined) || (payload['playerId'] === undefined) ||
            (payload['move'] === undefined)) {
            console.error('invalid make_move payload : ', payload);
            ws.close();
            return;
        }

        let sessionId = payload['sessionId'] as string;
        let roomId = payload['roomId'] as string;
        let playerId = payload['playerId'] as string;
        let move = payload['move'] as string;
        let room = roomIdToGameRoom[roomId];

        // player should be either host or guest
        if (room === undefined || !room.isCreated ||
            !room.isValidSessionId(sessionId)) {
            console.error('invalid roomId/sessionId : ', payload);
            ws.close();
            return;
        }

        let chessMove = room.makeMove(playerId, move);
        if (!chessMove) {
            console.error('invalid turn/move:', move);
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

export function handleLeaveRoom(ws: WebSocket, payload: any) {


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
    // room.sendNewViewer(ws, viewerInfo);
}

export function handleRTCMessage(ws: WebSocket, payload: any) {

    // sanity check
    if ((payload === undefined) || (payload['sessionId'] === undefined) ||
        (payload['roomId'] === undefined)) {
        console.error('invalid rtc_message payload : ', payload);
        ws.close();
        return;
    }

    let sessionId = payload['sessionId'] as string;
    let roomId = payload['roomId'] as string;
    let room = roomIdToGameRoom[roomId];
    // player should be either host or guest
    if (room === undefined || !room.isCreated ||
        !room.isValidSessionId(sessionId)) {
        console.error('invalid roomId/sessionId in rtc payload: ', payload);
        ws.close();
        return;
    }


    const offer = payload['offer'];
    const answer = payload['answer'];
    const ice = payload['ice'];

    try {
        // route offer to guest
        if (offer !== undefined) {
            room.guestInfo?.wsocket.send(JSON.stringify({
                type: types.TYPE_RTC_MESSAGE,
                payload: {
                    'offer': offer,
                }
            }));

        } else if (answer !== undefined) {
            room.hostInfo?.wsocket.send(JSON.stringify({
                type: types.TYPE_RTC_MESSAGE,
                payload: {
                    'answer': answer,
                }
            }));

        } else if (ice !== undefined) {
            let message = {
                type: types.TYPE_RTC_MESSAGE,
                payload: {
                    'ice': ice,
                }
            }
            if (sessionId === room.hostInfo?.sessionId) {
                room.guestInfo?.wsocket.send(JSON.stringify(message))

            } else if (sessionId === room.guestInfo?.sessionId) {
                room.hostInfo?.wsocket.send(JSON.stringify(message));
            }
        }

    } catch (err) {
        console.error('error in parsing rtc message : ', err);
    }
}

export function handleChatMessage(ws: WebSocket, payload: any) {
    // sanity check
    if ((payload === undefined) || (payload['sessionId'] === undefined) ||
        (payload['roomId'] === undefined) || (payload['message'] === undefined)) {
        console.error('invalid chat_message payload : ', payload);
        ws.close();
        return;
    }

    let sessionId = payload['sessionId'] as string;
    let roomId = payload['roomId'] as string;
    let message = payload['message'] as string;

    let room = roomIdToGameRoom[roomId];
    // player should be either host or guest
    if (room === undefined || !room.isCreated ||
        !room.isValidSessionId(sessionId)) {
        console.error('invalid roomId/sessionId in chat message payload: ', payload);
        ws.close();
        return;
    }

    room.broadCastToPlayers({
        type: types.TYPE_CHAT_MESSAGE,
        payload: {
            chatId: Math.floor(100000 * Math.random()),
            message: message,
        }
    });
}