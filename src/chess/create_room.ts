
/**
 * Handler to create a chess room
 * 1. create a room 
 * 2. send the roominfo
 */

import { ChessRoom, Color, PlayerInfo } from "./room";
import chessStore from "./store";
import * as types from './types';

export function handleCreateRoom(ws: any, payload: any) {

    // player can choose a color and
    // number of matches he/she wants to play
    if (payload === undefined) {
        payload = {};
    }
    const sessionId = ws.sessionId;
    const userId = ws.userId;
    let color = payload['color'] as string;
    let numMatches = payload['num_matches'] as number;

    if (color === undefined) {
        color = (Math.random() < 0.5) ? 'w' : 'b';
    }
    if (numMatches === undefined || (typeof numMatches !== 'number') ||
        [1, 3, 5].indexOf(numMatches) < 0) {
        numMatches = 3;
    }

    // create new room
    let room = new ChessRoom(numMatches);

    let hostInfo: PlayerInfo = {
        wsocket: ws,
        sessionId: sessionId,
        userId: userId,
        playerId: "",
        color: color as Color,
        isActive: true,
    }

    // send roominfo to host
    try {
        ws.send(JSON.stringify({
            type: types.TYPE_ROOM_INFO,
            payload: {
                sessionId: hostInfo.sessionId,
                userId: hostInfo.userId,
                roomId: room.roomId,
                isPlayer: true,
            }
        }));

        // add host to room
        room.setHost(hostInfo);
        room.addPlayer(hostInfo);
        room.roomState = "vacant";
        chessStore.setChessRoom(sessionId, room);

    } catch (err) {
        console.error('error sending roominfo to host, ', err);
    }
}