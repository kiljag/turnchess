/**
 * in room chatting capabilities
 */

import chessStore from './store';
import * as types from './types';

export function handleChatMessage(ws: any, payload: any) {
    try {

        // sanity check
        if ((payload === undefined) || (payload['roomId'] === undefined) ||
            (payload['message'] === undefined)) {
            console.error('invalid chat_message payload : ', payload);
            ws.close();
            return;
        }

        const sessionId = ws.sessionId;
        const userId = ws.userId;
        const roomId = payload['roomId'] as string;
        const message = payload['message'] as string;
        const room = chessStore.getChessRoom(sessionId, roomId);

        if (room !== undefined && room.roomState == 'ready') {
            room.broadCastToPlayers({
                type: types.TYPE_CHAT_MESSAGE,
                payload: {
                    chatId: Math.floor(1000000 * Math.random()),
                    userId: userId,
                    message: message,
                }
            });
        }

    } catch (err) {
        console.error('error in handleChatMessage :', err);
    }
}