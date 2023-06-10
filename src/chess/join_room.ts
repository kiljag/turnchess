
/** 
 * Handler to join room 
 * 1. verify user details first.
 * 2. check if the game room is full or not.
 * 3. enables watching the room as well.
*/

import { Color, PlayerInfo } from "./room";
import chessStore from "./store";
import * as types from './types';

export function handleJoinRoom(ws: any, payload: any) {

    try {
        // validate payload
        if (payload === undefined || payload['roomId'] === undefined) {
            console.log('invalid payload for joinroom', payload);
            ws.close();
            return;
        }


        const roomId = payload['roomId'] as string;
        const is_viewer = payload['is_viewer'] as boolean;
        const reconnect = payload['reconnect'] as boolean;
        const promote = payload['promote'] as boolean;
        const room = chessStore.getChessRoomById(roomId);

        if (room === undefined) {
            console.log('invalid roomId :', payload);
            ws.close();
            return;
        }

        // check for reconnect
        if (reconnect) {
            let sessionId = payload['sessionId'] as string;
            let prevRoomId = chessStore.getRoomId(sessionId);
            if (room !== undefined && roomId === prevRoomId) {
                let playerInfo = room.playerInfoMap[sessionId];

                if (playerInfo.sessionId === sessionId && playerInfo.isActive === false) {
                    ws.sessionId = playerInfo.sessionId;
                    ws.userId = playerInfo.sessionId
                    playerInfo.wsocket = ws;

                    ws.send(JSON.stringify({
                        type: types.TYPE_ROOM_INFO,
                        payload: {
                            sessionId: playerInfo.color,
                            userId: playerInfo.userId,
                            roomId: roomId,
                        }
                    }));

                    if (room.boardIsFull()) {
                        ws.send(JSON.stringify({
                            type: types.TYPE_ROOM_READY,
                        }))
                    };

                    return;
                }
            }

            console.error('unable to reconnect');
            ws.close();
            return;
        }

        const sessionId = ws.sessionId;
        const userId = ws.userId;

        // check if player is already in room and on board
        // also allow a viewer to be promoted as guest
        if (
            (room.hostInfo !== null && room.hostInfo.sessionId === sessionId) ||
            (room.guestInfo !== null && room.guestInfo.sessionId === sessionId)
        ) {
            ws.send(JSON.stringify({
                type: types.TYPE_PLAYER_IN_ROOM,
            }));
            return;
        }

        // try to join as guest / player
        if (room.guestInfo === null) {

            let color: Color = room.getAvailableColor();
            let guestInfo: PlayerInfo = {
                wsocket: ws,
                sessionId: sessionId,
                userId: userId,
                playerId: "",
                color: color,
                isActive: true,
            }

            ws.sessionId = guestInfo.sessionId;
            ws.send(JSON.stringify({
                type: types.TYPE_ROOM_INFO,
                payload: {
                    sessionId: guestInfo.sessionId,
                    userId: guestInfo.userId,
                    roomId: room.roomId,
                    isPlayer: true,
                },
            }));

            // add guest to the room 
            room.setGuest(guestInfo);
            room.addPlayer(guestInfo);
            chessStore.setChessRoom(sessionId, room);

            // notify the players that room is ready
            room.roomState = "ready";
            console.log('room is ready');
            room.broadCastToPlayers({
                type: types.TYPE_ROOM_READY,
            });
            return;
        }

        // try join as viewer
        if (!is_viewer) {
            ws.send(JSON.stringify({
                type: types.TYPE_BOARD_IS_FULL,
            }));
            return;

        } else { // join as viewer

            let viewerInfo: PlayerInfo = {
                wsocket: ws,
                sessionId: sessionId,
                userId: userId,
                playerId: "",
                color: 'v',
                isActive: true,
            }

            ws.send(JSON.stringify({
                type: types.TYPE_ROOM_INFO,
                payload: {
                    sessionId: viewerInfo.sessionId,
                    userId: viewerInfo.userId,
                    roomId: room.roomId,
                    isViewer: true,
                }
            }));

            room.addPlayer(viewerInfo);
            chessStore.setChessRoom(sessionId, room);
        }

    } catch (err) {
        console.error('error in handleJoinRoom', err);
    }

}
