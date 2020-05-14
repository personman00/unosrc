const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);


    //0 red 1 green 2 blue 3 yellow
    //color = 0;
    // 0 null 1 -> 9 uno numbers, 10 reverse, 11 +2, 12 skip, 13 +4
    //type = 0;


var sockets = [];

var cards_in_middle = [];
cards_in_middle = drawCard(cards_in_middle, 1);

var playerTurn = 0;
var iterationDirection = 1;
var skip = false;

function addSocket(socket) {
    removeSocket(socket);
    sockets.push( { socket: socket.id, cards: [] } );
    return sockets.length - 1;
}

function getPlayer(socketId) {
    for (let index = 0; index < sockets.length; index++) {
        const element = sockets[index];
        if(element.socket == socketId) {
            return element;
        }
    }
    return null;
}

function drawCard(list, num) {
    for(var i = 0; i < num; i++) {
         list.push({color: Math.floor(Math.random() * 4), type: Math.floor(1 + Math.random() * 13)})
    }
    return list;
}

function iterateTurn() {
    playerTurn += iterationDirection;
    playerTurn = playerTurn % sockets.length;
    if(skip) {
        skip=false;
        iterateTurn();
    } else {
        io.sockets.emit("playerturn", playerTurn);
    }
}

function getTopCard() {
    return cards_in_middle[cards_in_middle.length-1];
}

function removeSocket(socket) {
    sockets = sockets.filter((a) => a.socket != socket.id);
    console.log("sockets: " + sockets);
}

io.sockets.on("connection", (socket) => {
    console.log("Client connected");
    io.sockets.emit("topcard", cards_in_middle[cards_in_middle.length - 1]);
    io.sockets.emit("playerturn", playerTurn);
    socket.emit("init", addSocket(socket));
    socket.emit("drawcard", drawCard([], 7));

    socket.on("reqdraw", (arg) => {

        if(playerTurn >= sockets.length) {
            playerTurn = sockets.length - 1;
            io.sockets.emit("playerturn", playerTurn);
            return;
        }

        if(sockets[playerTurn].socket == socket.id) {
            let drawn_card = drawCard([], 1)[0];
            let top_card = getTopCard();
            socket.emit("drawcard", [drawn_card]);
            if(drawn_card.type == top_card.type || drawn_card.color == top_card.color) {
                return;
            }
            iterateTurn();
            return;
        }
    });

    socket.on("tryput", (obj) => {
        let card = obj.card;
        let length = obj.length;
        //var player = getPlayer(socket.id);
        if(sockets[playerTurn].socket != socket.id) {
            socket.emit("canput", false);
            return;
        }
        topcard = cards_in_middle[cards_in_middle.length - 1];
        if(topcard.color == card.color || topcard.type == card.type) {
            socket.emit("canput", true);
            cards_in_middle.push(card);
            io.sockets.emit("topcard", cards_in_middle[cards_in_middle.length - 1]);

            if(card.type == 10) {
                iterationDirection *= -1;
            } else if(card.type == 12) {
                skip=true;
            }

            if(length <= 1) {
                io.sockets.emit("playerwon", playerTurn);
                return;
            }

            iterateTurn();

            if(card.type == 11) {io.sockets.connected[sockets[playerTurn].socket].emit("drawcard", drawCard([], 2))};

        } else {
            socket.emit("canput", false);
        }
    });

    socket.on("disconnect", (socket) => { 
        console.log("client disconnected");
        removeSocket(socket);
    });

});

http.listen(process.env.PORT || 3000, function() {
    console.log("Listening");    
});