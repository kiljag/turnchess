
/**
 * handler function for `make move` message type
 */

import { Chess } from "chess.js";
import chessStore from "./store";
import * as types from './types';
import { ChessRoom } from "./room";

export function handleMakeMove(ws: any, payload: any) {

    try {
        // sanity check
        if ((payload === undefined) ||
            (payload['roomId'] === undefined) ||
            (payload['playerId'] === undefined) ||
            (payload['move'] === undefined)) {

            console.error('invalid make_move payload : ', payload);
            ws.close();
            return;
        }

        let sessionId = ws.sessionId;
        let roomId = payload['roomId'] as string;
        let playerId = payload['playerId'] as string;
        let move = (payload['move'] as string).toLowerCase();
        let room = chessStore.getChessRoom(sessionId, roomId);

        // player should be either host or guest
        if (room === undefined || room.roomState !== "ready") {
            console.error('invalid roomId/sessionId : ', payload, room?.roomState);
            ws.close();
            return;
        }

        let chessMove = room.makeMove(playerId, move);
        if (chessMove === null) {
            console.error('invalid turn/move:', move);
            ws.close();
            return;
        }

        // broadcast move to all players
        room.broadCastToAll({
            type: types.TYPE_CHESS_MOVE,
            payload: {
                'move': chessMove,
                next: room.nextPlayer?.userId,
            }
        });

        // see if the game is ended
        if (room.chess.isGameOver()) {
            let winner = '';
            let winnerColor = '';
            if (room.chess.isCheckmate()) {
                if (room.chess.turn() === 'w') {
                    winner = room.blackPlayer ? room.blackPlayer.userId : '';
                    winnerColor = 'b';
                } else {
                    winner = room.whitePlayer ? room.whitePlayer.userId : '';
                    winnerColor = 'w';
                }
            }

            room.matchesPlayed++;
            room.broadCastToAll({
                type: types.TYPE_END_GAME,
                payload: {
                    'winner': winner,
                    'winnerColor': winnerColor,
                    'gameover': true,
                    'completed': !(room.matchesPlayed < room.numMatches),
                }
            });

            // switch colors and clear the board
            if (room.whitePlayer) room.whitePlayer.color = 'b';
            if (room.blackPlayer) room.blackPlayer.color = 'w';
            room.roomState = 'empty';
            room.chess = new Chess();
            let tp = room.whitePlayer;
            room.whitePlayer = room.blackPlayer;
            room.blackPlayer = tp;

            // send start game again
            if (room.matchesPlayed < room.numMatches) {
                let startMatch = function (room: ChessRoom) {
                    room.broadCastToAll({
                        type: types.TYPE_START_GAME,
                        payload: {
                            matchId: room.matchesPlayed + 1,
                            next: room.whitePlayer?.userId,
                        }
                    });
                    room.roomState = 'ready';
                    room.nextPlayer = room.whitePlayer;
                }
                setTimeout(() => {
                    if (room !== undefined) {
                        startMatch(room);
                    }
                }, 5000);
            }
        }

    } catch (err) {
        console.error('error in make move : ', err);
    }
}