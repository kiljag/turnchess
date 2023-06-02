import { Chess } from 'chess.js';
import { WebSocket } from 'ws';
import * as types from './types';
import { v4 as uuidv4 } from 'uuid';

type Color = 'w' | 'b' | 'v';

interface PlayerInfo {
    playerId: string,
    color: Color,
    wsocket: WebSocket,
}

export class GameRoom {

    roomId: string;
    chess: Chess;
    host: PlayerInfo | null; // host player
    whitePlayer: PlayerInfo | null;
    blackPlayer: PlayerInfo | null;
    viewers: PlayerInfo[];

    constructor() {
        this.roomId = "room-" + uuidv4();
        this.chess = new Chess();
        this.host = null;
        this.whitePlayer = null;
        this.blackPlayer = null;
        this.viewers = [];
    }

    clear(): void {
        this.chess = new Chess();
    }

    addPlayer(ws: WebSocket, color: Color): PlayerInfo {

        let playerInfo: PlayerInfo = {
            playerId: "player-" + uuidv4(),
            color: color,
            wsocket: ws,
        }
        if (!this.whitePlayer && !this.blackPlayer) {
            this.host = playerInfo;
        }

        if (color === 'w') {
            this.whitePlayer = playerInfo;
        } else if (color === 'b') {
            this.blackPlayer = playerInfo;
        } else {
            this.viewers.push(playerInfo);
        }

        return playerInfo;
    }

    notifyNewPlayer(ws: WebSocket, playerInfo: PlayerInfo) {
        try {
            ws.send(JSON.stringify({
                type: types.TYPE_NEW_PLAYER,
                payload: {
                    playerId: playerInfo.playerId,
                    roomId: this.roomId,
                    color: playerInfo.color,
                    fen: this.chess.fen(),
                },
            }));

        } catch (err) {
            console.error('error notifying new player :', err);
        }
    }

    getAvailableColor(): Color {
        return this.whitePlayer !== null ? 'b'
            : (Math.random() < 0.5 ? 'w' : 'b');
    }

    isFull(): boolean {
        return (this.whitePlayer !== null && this.blackPlayer !== null);
    }

    startGame() {
        this.broadCastToAll({
            type: types.TYPE_START_GAME,
        });
    }

    endGame() {
        this.broadCastToAll({
            type: types.TYPE_END_GAME,
        });
    }

    maveMove(playerId: string, move: string) {
        let p = (this.chess.turn() === 'w') ? this.whitePlayer : this.blackPlayer;
        if (p !== null && p.playerId !== playerId) {
            console.log(`error invalid player's turn`);
            return false;
        }

        try {
            this.chess.move(move);
            return true;
        } catch (err) {
            console.log(`error in move : `, err);
            return false;
        }
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