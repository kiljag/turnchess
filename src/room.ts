import { Chess } from 'chess.js';
import { WebSocket } from 'ws';
import * as types from './types';
import { v4 as uuidv4 } from 'uuid';

type Color = 'w' | 'b';

// one who creates the room
interface HostInfo {
    sessionId: string,
    wsocket: WebSocket,
    offer: any, // webrtc offer
}

// one who joins the room
interface GuestInfo {
    sessionId: string,
    wsocket: WebSocket,
    answer: any, // webrtc answer
}

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
    for (let i = 0; i < 6; i++) {
        let ri = Math.floor(Math.random() * 10);
        id += chars[ri];
    }
    return `CHESS-${id}`;
}

export class GameRoom {

    roomId: string;
    chess: Chess;
    hostInfo: HostInfo | null;
    guestInfo: GuestInfo | null;
    whitePlayer: PlayerInfo | null;
    blackPlayer: PlayerInfo | null;
    viewers: ViewerInfo[];
    isCreated: boolean;

    constructor() {
        this.roomId = getRandomRoomId();
        this.chess = new Chess();
        this.hostInfo = null;
        this.guestInfo = null;
        this.whitePlayer = null;
        this.blackPlayer = null;
        this.viewers = [];
        this.isCreated = false;
    }

    clear(): void {
        this.chess = new Chess();
        this.whitePlayer = null;
        this.blackPlayer = null;
    }

    isFull() {
        return (this.hostInfo && this.guestInfo);
    }

    isValidSessionId(sessionId: string): boolean {
        return (this.hostInfo !== null && this.hostInfo.sessionId === sessionId) ||
            (this.guestInfo !== null && this.guestInfo.sessionId === sessionId);
    }

    setHost(ws: WebSocket): HostInfo {
        let hostInfo: HostInfo = {
            sessionId: uuidv4(),
            wsocket: ws,
            offer: null,
        }
        this.hostInfo = hostInfo;
        return hostInfo;
    }

    setGuest(ws: WebSocket): GuestInfo {
        let guestInfo: GuestInfo = {
            sessionId: uuidv4(),
            wsocket: ws,
            answer: null,
        }
        this.guestInfo = guestInfo;
        return guestInfo;
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
        if (this.whitePlayer !== null) return 'b';
        if (this.blackPlayer !== null) return 'w';
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
        let p = (this.chess.turn() === 'w') ? this.whitePlayer : this.blackPlayer;
        if (p !== null && p.playerId !== playerId) {
            console.log(`error invalid player's turn`);
            return null;
        }

        try {
            let chessMove = this.chess.move(move);
            return chessMove.san;
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

    sendRoomCreated() {
        try {
            let message = {
                type: types.TYPE_ROOM_CREATED,
            }
            if (this.hostInfo && this.hostInfo.wsocket.readyState !== WebSocket.CLOSED) {
                this.hostInfo.wsocket.send(JSON.stringify(message));
            }
            if (this.guestInfo && this.guestInfo.wsocket.readyState !== WebSocket.CLOSED) {
                this.guestInfo.wsocket.send(JSON.stringify(message));
            }
            this.isCreated = true;
        } catch (err) {
            console.error('error in sending room created :', err);
        }
    }

    sendPlayerInfo(ws: WebSocket, playerInfo: PlayerInfo) {
        try {
            ws.send(JSON.stringify({
                type: types.TYPE_PLAYER_INFO,
                payload: {
                    playerId: playerInfo.playerId,
                    color: playerInfo.color,
                },
            }));

        } catch (err) {
            console.error('error sending new player :', err);
        }
    }

    sendViewerInfo(ws: WebSocket, viewerInfo: ViewerInfo) {
        try {
            ws.send(JSON.stringify({
                type: types.TYPE_VIEWER_INFO,
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

    broadCastToPlayers(message: any): void {
        try {
            if (this.hostInfo &&
                this.hostInfo.wsocket.readyState !== WebSocket.CLOSED) {
                this.hostInfo.wsocket.send(JSON.stringify(message));
            }

            if (this.guestInfo &&
                this.guestInfo.wsocket.readyState !== WebSocket.CLOSED) {
                this.guestInfo.wsocket.send(JSON.stringify(message));
            }

        } catch (err) {
            console.error(`error in broadcasting to players : ${message}`, err)
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