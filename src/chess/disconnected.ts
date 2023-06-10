/**
 * disconnect handler 
 * should wait for some time before clearing user info
 * waiting time is 1 minute
*/

import { ChessRoom, PlayerInfo } from './room';
import chessStore from './store';
import * as types from './types';

export function handleOnDisconnect(ws: any) {

    let sessionId = ws.sessionId;
    let room = chessStore.getChessRoom(sessionId);
    let playerInfo = room !== undefined ? room.playerInfoMap[sessionId] : undefined;

    if (room !== undefined && playerInfo !== undefined) {
        playerInfo.isActive = false;
        room.broadCastToAll({
            type: types.TYPE_PLAYER_DISCONNECTED,
            playload: {
                userId: playerInfo.userId,
                color: playerInfo.color,
            }
        });

        let waitForReconnect = function (room: ChessRoom, playerInfo: PlayerInfo) {
            if (playerInfo.isActive !== true) {
                delete room.playerInfoMap[playerInfo.sessionId];

                if (room.whitePlayer === playerInfo) {
                    room.whitePlayer = null;
                } else if (room.blackPlayer === playerInfo) {
                    room.blackPlayer = null;
                }

                room.broadCastToAll({
                    type: types.TYPE_PLAYER_LEFT,
                    payload: {
                        userId: playerInfo.userId,
                        color: playerInfo.color,
                    }
                });
                console.log('removing player session', playerInfo.sessionId, room.roomId);
                chessStore.deletePlayer(playerInfo.sessionId);
            }

            // cleanup room
            if (Object.entries(room.playerInfoMap).length === 0) {
                console.log('removing room', room.roomId);
                chessStore.deleteRoom(room.roomId);
            }
        }

        setTimeout(() => {
            if (room !== undefined && playerInfo !== undefined) {
                waitForReconnect(room, playerInfo);
            }

        }, 120000); // wait for 2 minutes.
    }
}