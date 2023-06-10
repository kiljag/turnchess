
/**
 * handles `add to room` message type
 */

import { Chess } from "chess.js";
import chessStore from "./store";
import * as types from './types';
import { v4 as uuidv4 } from 'uuid';

export function handleAddToRoom(ws: any, payload: any) {

    try {
        const sessionId = ws.sessionId;
        const userId = ws.userId;

        // sanity check
        if ((payload === undefined) || (payload['roomId'] === undefined)) {
            console.error(userId, 'invalid add_to_board payload :', payload);
            ws.close();
            return;
        }

        let roomId = payload['roomId'] as string;
        let room = chessStore.getChessRoom(sessionId, roomId);
        let playerInfo = room !== undefined ? room.playerInfoMap[sessionId] : undefined;

        if (room === undefined || playerInfo === undefined) {
            console.log(userId, 'invalid sessionId/roomId : ', sessionId, roomId);
            ws.close();
            return;
        }

        // handle reconnects
        if (!playerInfo.isActive) {
            ws.send(JSON.stringify({
                type: types.TYPE_PLAYER_INFO,
                payload: {
                    playerId: playerInfo.playerId,
                    color: playerInfo.color,
                }
            }));

            // start game again
            ws.send(JSON.stringify({
                type: types.TYPE_START_GAME,
                payload: {
                    matchId: room.matchesPlayed + 1,
                    fen: room.chess.fen(),
                    next: room.nextPlayer?.userId,
                }
            }));

            playerInfo.isActive = true;
            return;
        }

        // assign proper colors and give each player an Id also handle reconnect
        if (playerInfo.color === 'w') {
            playerInfo.playerId = uuidv4();
            ws.send(JSON.stringify({
                type: types.TYPE_PLAYER_INFO,
                payload: {
                    playerId: playerInfo.playerId,
                    color: 'w',
                }
            }));
            room.whitePlayer = playerInfo;
            room.nextPlayer = playerInfo;

        } else if (playerInfo.color === 'b') {
            playerInfo.playerId = uuidv4();
            ws.send(JSON.stringify({
                type: types.TYPE_PLAYER_INFO,
                payload: {
                    playerId: playerInfo.playerId,
                    color: 'b',
                }
            }));
            room.blackPlayer = playerInfo;

        } else { // is a viewer
            let payload = {
                color: 'v',
                fen: room.chess.fen(),
                matchId: room.matchesPlayed,
            }
            if (room.hostInfo && room.guestInfo) {
                payload = {
                    ...payload,
                    [room.hostInfo.userId]: {
                        wins: room.hostInfo.wins,
                        ties: room.hostInfo.ties,
                    },
                    [room.guestInfo.userId]: {
                        wins: room.guestInfo.wins,
                        ties: room.guestInfo.ties,
                    }
                }
            }

            ws.send(JSON.stringify({
                type: types.TYPE_PLAYER_INFO,
                payload: payload,
            }));
        }

        // once the board is ready, start the match
        if (room.boardIsFull()) {
            room.chess = new Chess();
            room.broadCastToPlayers({
                type: types.TYPE_START_GAME,
                payload: {
                    matchId: room.matchesPlayed + 1,
                    next: room.whitePlayer?.userId,
                }
            });
        }

    } catch (err) {
        console.error('error in handleToAddRoom ', err)
    }
}
