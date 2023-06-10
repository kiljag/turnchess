import { Chess } from 'chess.js';
import { WebSocket } from 'ws';
import * as types from './types';

export type Color = 'w' | 'b' | 'v';
export type RoomState = "empty" | "vacant" | "ready";

export interface PlayerInfo {
    wsocket: WebSocket,
    sessionId: string, // private to the connection
    playerId: string,  // private to the player
    userId: string,    // public id of the user
    color: Color,
    wins?: number,
    ties?: number,
    isActive: boolean,
}

// generate a 6 digit room number
function getRandomRoomId() {
    let chars = "0123456789"
    let id = "";
    for (let i = 0; i < 6; i++) {
        let ri = Math.floor(Math.random() * 10);
        id += chars[ri];
    }
    return `CHESS-${id}`;
}

export class ChessRoom {

    roomId: string;
    roomState: RoomState
    numMatches: number;
    matchesPlayed: number;
    capacity: number;

    hostInfo: PlayerInfo | null;
    guestInfo: PlayerInfo | null;
    playerInfoMap: Record<string, PlayerInfo>;
    room_ready: boolean;


    chess: Chess;
    whitePlayer: PlayerInfo | null;
    blackPlayer: PlayerInfo | null;
    nextPlayer: PlayerInfo | null // stores the next playerId

    constructor(numMatches: number) {
        this.roomId = getRandomRoomId();
        this.roomState = "empty";
        this.numMatches = numMatches;
        this.matchesPlayed = 0;
        this.capacity = 6; // for now

        this.hostInfo = null;
        this.guestInfo = null;
        this.playerInfoMap = {};
        this.room_ready = false;

        this.chess = new Chess();
        this.whitePlayer = null;
        this.blackPlayer = null;
        this.nextPlayer = null;
    }

    isFull() {
        return (this.hostInfo !== null && this.guestInfo !== null);
    }

    addPlayer(playerInfo: PlayerInfo): PlayerInfo {
        this.playerInfoMap[playerInfo.sessionId] = playerInfo;
        return playerInfo;
    }

    setHost(hostInfo: PlayerInfo) {
        this.hostInfo = hostInfo;
    }

    setGuest(guestInfo: PlayerInfo) {
        this.guestInfo = guestInfo;
    }

    setWhitePlayer(playerInfo: PlayerInfo) {
        this.whitePlayer = playerInfo;
    }

    setBlackPlayer(playerInfo: PlayerInfo) {
        this.blackPlayer = playerInfo;
    }

    setRoomReady() {
        this.room_ready = true;
    }

    getAvailableColor(): Color {
        if (this.hostInfo !== null) {
            return (this.hostInfo.color === 'w') ? 'b' : 'w';
        }
        return (Math.random() < 0.5 ? 'w' : 'b');
    }

    boardIsEmpty(): boolean {
        return this.whitePlayer === null &&
            this.blackPlayer === null;
    }

    boardIsFull(): boolean {
        return this.whitePlayer !== null &&
            this.blackPlayer !== null;
    }

    makeMove(playerId: string, move: string): string | null {

        // if board is not full
        if (!this.boardIsFull()) {
            console.error('board is not full');
            return null;
        }

        if (playerId !== this.nextPlayer?.playerId) {
            console.error('invalid turn, next : ', this.nextPlayer?.playerId);
            return null;
        }

        try {
            let chessMove = this.chess.move(move);
            this.nextPlayer = (this.chess.turn() === 'w') ? this.whitePlayer : this.blackPlayer;
            return chessMove.san;

        } catch (err) {
            console.log('error in move : ', move);
            return null;
        }
    }

    sendStartGame() {
        this.broadCastToAll({
            type: types.TYPE_START_GAME,
        });
    }

    broadCastToPlayers(message: any): void {
        try {
            if (this.hostInfo !== null &&
                this.hostInfo.wsocket.readyState === WebSocket.OPEN) {
                this.hostInfo.wsocket.send(JSON.stringify(message));
            }

            if (this.guestInfo !== null &&
                this.guestInfo.wsocket.readyState === WebSocket.OPEN) {
                this.guestInfo.wsocket.send(JSON.stringify(message));
            }

        } catch (err) {
            console.error(`error in broadcasting to players ${message}`, err);
        }
    }

    broadCastToAll(message: any): void {
        try {
            for (const [_, playerInfo] of Object.entries(this.playerInfoMap)) {
                if (playerInfo.wsocket !== null &&
                    playerInfo.wsocket.readyState === WebSocket.OPEN) {
                    playerInfo.wsocket.send(JSON.stringify(message));
                }
            }

        } catch (err) {
            console.error(`error in broadcasting ${message}`, err);
        }
    }
}