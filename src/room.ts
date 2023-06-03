import { Chess } from 'chess.js';
import { WebSocket } from 'ws';
import * as types from './types';
import { v4 as uuidv4 } from 'uuid';

type Color = 'w' | 'b';

interface PlayerInfo {
    playerId: string,
    color: Color,
    wsocket: WebSocket,
}

interface ViewerInfo {
    wsocket: WebSocket,
}

// generate a 12 digit room number
function getRandomRoomId() {
    let chars = "0123456789"
    let id = "";
    for (let i = 0; i < 12; i++) {
        let ri = Math.floor(Math.random() * 10);
        id += chars[ri];
    }
    return `CHESS-${id}`;
}

export class GameRoom {

    roomId: string;
    chess: Chess;
    whitePlayer: PlayerInfo | null;
    blackPlayer: PlayerInfo | null;
    viewers: ViewerInfo[];

    constructor() {
        this.roomId = getRandomRoomId();
        this.chess = new Chess();
        this.whitePlayer = null;
        this.blackPlayer = null;
        this.viewers = [];
    }

    clear(): void {
        this.chess = new Chess();
        this.whitePlayer = null;
        this.blackPlayer = null;
    }

    addPlayer(ws: WebSocket, color: Color): PlayerInfo {
        let playerInfo: PlayerInfo = {
            playerId: "player-" + uuidv4(),
            color: color,
            wsocket: ws,
        }

        if (color === 'w') {
            this.whitePlayer = playerInfo;
        } else {
            this.blackPlayer = playerInfo;
        }

        return playerInfo;
    }

    addViewer(ws: WebSocket): ViewerInfo {
        let viewerInfo: ViewerInfo = {
            wsocket: ws,
        }

        this.viewers.push(viewerInfo);
        return viewerInfo;
    }

    getAvailableColor(): Color {
        return this.whitePlayer !== null ? 'b'
            : (Math.random() < 0.5 ? 'w' : 'b');
    }

    isEmpty(): boolean {
        return this.whitePlayer === null &&
            this.blackPlayer === null;
    }

    isFull(): boolean {
        return this.whitePlayer !== null &&
            this.blackPlayer !== null;
    }

    makeMove(playerId: string, move: string): string | null {
        let p = (this.chess.turn() === 'w') ? this.whitePlayer : this.blackPlayer;
        if (p !== null && p.playerId !== playerId) {
            console.log(`error invalid player's turn`);
            return null;
        }

        try {
            let chessMove = this.chess.move(move);
            return chessMove.lan;
        } catch (err) {
            console.log(`error in move : `, err);
            return null;
        }
    }

    checkEndGame() {
        if (this.chess.isGameOver()) {
            this.broadCastToAll({
                type: types.TYPE_END_GAME,
                payload: {
                    "isgameover": true,
                }
            });
            this.clear(); // clear game
        }
    }

    sendNewRoom(ws: WebSocket) {
        try {
            ws.send(JSON.stringify({
                type: types.TYPE_NEW_ROOM,
                payload: {
                    roomId: this.roomId,
                }
            }));
        } catch (err) {
            console.log('error sending new room : ', err);
        }
    }

    sendNewPlayer(ws: WebSocket, playerInfo: PlayerInfo) {
        try {
            ws.send(JSON.stringify({
                type: types.TYPE_NEW_PLAYER,
                payload: {
                    playerId: playerInfo.playerId,
                    color: playerInfo.color,
                },
            }));

        } catch (err) {
            console.error('error sending new player :', err);
        }
    }

    sendNewViewer(ws: WebSocket, viewerInfo: ViewerInfo) {
        try {
            ws.send(JSON.stringify({
                type: types.TYPE_NEW_VIEWER,
                payload: {
                    fen: this.chess.fen(),
                }
            }));
        } catch (err) {
            console.error('error sending new viewer : ', err);
        }
    }

    sendStartGame() {
        this.broadCastToAll({
            type: types.TYPE_START_GAME,
        });
    }

    sendChessMove(move: string) {
        this.broadCastToAll({
            type: types.TYPE_CHESS_MOVE,
            payload: {
                move: move,
            }
        });
    }

    broadCastToAll(message: any): void {
        try {
            if (this.whitePlayer &&
                this.whitePlayer.wsocket.readyState !== WebSocket.CLOSED) {
                this.whitePlayer.wsocket.send(JSON.stringify(message));
            }

            if (this.blackPlayer &&
                this.blackPlayer.wsocket.readyState !== WebSocket.CLOSED) {
                this.blackPlayer.wsocket.send(JSON.stringify(message));
            }

            for (let viewer of this.viewers) {
                if (viewer.wsocket.readyState !== WebSocket.CLOSED) {
                    viewer.wsocket.send(JSON.stringify(message));
                }
            }

        } catch (err) {
            console.error(`error in broadcasting ${message}`, err);
        }
    }
}