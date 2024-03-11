# Chess backend for turngames

## Install Node
```bash
cd ~/
mkdir programs && cd programs
wget https://nodejs.org/dist/v20.11.1/node-v20.11.1-linux-x64.tar.xz
tar -xvf node-v20.11.1-linux-x64.tar.xz

# Add to PATH in .bashrc
vi ~/.bashrc
export PATH="/home/ubuntu/programs/node-v20.11.1-linux-x64/bin/":$PATH

# source .bashrc
source .bashrc
```


# Chess Game Client/Server Communication

Naming Convention
1. Host (Player 1)
2. Joinee (Player 2)
3. Viewer

Message type :
```
{
    type: "<message_type>"
    payload: {
        <object containing payload information>
    }
}
```

Game Room is created by the player 1 and shares the link to player 2. Player2 upon clicking the link will be redirected to a page to join the room. Once player2 joins the room, The game can begin. At this point, both the client must have initiated a websocket connection and were given unique playerId's.

1. Player1 initiates the connection and send the following message to server without any payload and recieves the player information back.
```
// to server
{
    type: "create_room",
}

// from server
{
    type: "new_player",
    payload: {
        roomId: "<random-string>"
        playerId: "<random-string>"
        color: 'w' // or 'b'
    }
}
```

2. Player2 initiates the connection and sends the following message (player2 must have roomId to join) and server send the player information back
```
// to server
{
    type: "join_room",
    payload: {
        roomId: "<random-string>",
    }
}

// from server
{
    type: "new_player",
    payload: {
        roomId: "<random-string>" // redundant, but ok
        playerId: "<random-string>"
        color: 'w' // or 'b'
    }
}
```

3. After this server will broadcast a message to notfiy players to start the game
```
// from server (broadcast)
{
    type: "start_game"
}
```

4. Now players can start playing. white can move it's first move and notify the server and server will broadcast the message to players
```
// to server
{
    type: "make_move"
    payload: {
        playerId: <random-string> // used to identify player
        move: 'e2e3' // using a simple notation
    }
}

// from server (broadcast)
{
    type: "chess_move"
    payload: {
        move: 'e2e3' 
    }
}
```

5. Once the game is completed or a player left the room. 
```
// from server
{
    type: "end_game"
    payload: {
        winner: 'w' // or 'b'
    }
}
```

6. (Optional) A player can leave the room and the server will end the game 
```
// to server
{
    type: "leave_room"
    payload: {
        playerId: "<random-string>"
    }
}

// from server 
{
    type: "end_game",
    payload: {
        left: 'w' // or 'b'
    }
}
```

A viewer can subscribe and watch the game.
By default, board will shown as white.
```
// to server {
    type: "view_room"
    payload: {
        roomId: "<random-string>"
        color: 'v' // viewer
    }
}

// from server {
    type: "new_viewer"
    payload: {
        fen: "<chess-fen-string>"
    }
}
```



