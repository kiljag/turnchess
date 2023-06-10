
/**
 * handle when the user leaves willingly
 */

import chessStore from './store';
import * as types from './types';

export function handleLeaveRoom(ws: any, payload: any) {
    try {
        // sanity check
        if ((payload === undefined) || (payload['roomId'] === undefined)) {
            console.error('invalid leave_room payload');
            ws.close();
            return;
        }

        let sessionId = ws.sessionId;
        let roomId = payload['roomId'] as string;
        let room = chessStore.getChessRoom(sessionId, roomId);
        let playerInfo = room !== undefined ? room.playerInfoMap[sessionId] : undefined;


        if (room !== undefined && playerInfo !== undefined) {
            delete room.playerInfoMap[sessionId];

            if (room.whitePlayer !== null) {
                room.whitePlayer = null;
            } else if (room.blackPlayer !== null) {
                room.blackPlayer = null;
            }

            room.broadCastToAll({
                type: types.TYPE_PLAYER_LEFT,
                payload: {
                    color: playerInfo.color,
                }
            });

            console.log('removing player session', playerInfo.sessionId, roomId);
            chessStore.deletePlayer(playerInfo.sessionId);

            // cleanup room
            if (Object.entries(room.playerInfoMap).length === 0) {
                console.log('removing room', room.roomId);
                chessStore.deleteRoom(room.roomId);
            }
        }

    } catch (err) {
        console.error('error in handleLeaveRoom', err);
    }
}
