

import chessServer from './chess/wsocket';

const CHESS_PORT = 8000;
const RTC_PORT = 9000;

chessServer.listen(CHESS_PORT, () => {
    console.log(`server listening on port ${CHESS_PORT}`);
});

