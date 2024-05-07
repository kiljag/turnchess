

import chessServer from './chess/wsocket';

const CHESS_PORT = 9090;

chessServer.listen(CHESS_PORT, () => {
    console.log(`server listening on port ${CHESS_PORT}`);
});

