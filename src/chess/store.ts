/**
 * data structures to handle game play
 * handle rooms, sessionId etc.
 */

import { ChessRoom } from "./room";

interface SessionIdToRoomId {
    [sessionId: string]: string,
}

interface RoomIdToChessRoom {
    [roomId: string]: ChessRoom,
}

class ChessStore {
    sessionIdToRoomId: SessionIdToRoomId;
    roomIdToChessRoom: RoomIdToChessRoom;

    constructor() {
        this.sessionIdToRoomId = {};
        this.roomIdToChessRoom = {};
    }

    // get chessroom from sessionId
    getChessRoom(sessionId: string, roomId?: string): ChessRoom | undefined {
        // check if roomId is assigned to proper sessionId
        let roomId_ = this.sessionIdToRoomId[sessionId];
        if (roomId === roomId_ || roomId === undefined) {
            return this.roomIdToChessRoom[roomId_];
        }
    }

    getChessRoomById(roomId: string): ChessRoom {
        return this.roomIdToChessRoom[roomId];
    }

    getRoomId(sessionId: string): string {
        return this.sessionIdToRoomId[sessionId];
    }

    // set chessroom to a sessionId
    setChessRoom(sessionId: string, room: ChessRoom) {
        let roomId = room.roomId;
        this.sessionIdToRoomId[sessionId] = roomId;
        this.roomIdToChessRoom[roomId] = room;
    }

    deletePlayer(sessionId: string) {
        delete this.sessionIdToRoomId[sessionId];
    }

    deleteRoom(roomId: string) {
        delete this.roomIdToChessRoom[roomId];
    }
}

const chessStore = new ChessStore();
export default chessStore;

