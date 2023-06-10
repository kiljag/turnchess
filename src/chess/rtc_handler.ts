// /**
//  * rtc signalling server
//  */

// export function handleRTCMessage(ws: WebSocket, payload: any) {

//     // sanity check
//     if ((payload === undefined) || (payload['sessionId'] === undefined) ||
//         (payload['roomId'] === undefined)) {
//         console.error('invalid rtc_message payload : ', payload);
//         ws.close();
//         return;
//     }

//     let sessionId = payload['sessionId'] as string;
//     let roomId = payload['roomId'] as string;
//     let room = roomIdToGameRoom[roomId];
//     // player should be either host or guest
//     if (room === undefined || !room.isCreated ||
//         !room.isValidSessionId(sessionId)) {
//         console.error('invalid roomId/sessionId in rtc payload: ', payload);
//         ws.close();
//         return;
//     }


//     const offer = payload['offer'];
//     const answer = payload['answer'];
//     const ice = payload['ice'];

//     try {
//         // route offer to guest
//         if (offer !== undefined) {
//             room.guestInfo?.wsocket.send(JSON.stringify({
//                 type: types.TYPE_RTC_MESSAGE,
//                 payload: {
//                     'offer': offer,
//                 }
//             }));

//         } else if (answer !== undefined) {
//             room.hostInfo?.wsocket.send(JSON.stringify({
//                 type: types.TYPE_RTC_MESSAGE,
//                 payload: {
//                     'answer': answer,
//                 }
//             }));

//         } else if (ice !== undefined) {
//             let message = {
//                 type: types.TYPE_RTC_MESSAGE,
//                 payload: {
//                     'ice': ice,
//                 }
//             }
//             if (sessionId === room.hostInfo?.sessionId) {
//                 room.guestInfo?.wsocket.send(JSON.stringify(message))

//             } else if (sessionId === room.guestInfo?.sessionId) {
//                 room.hostInfo?.wsocket.send(JSON.stringify(message));
//             }
//         }

//     } catch (err) {
//         console.error('error in parsing rtc message : ', err);
//     }
// }
