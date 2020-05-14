const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);


    //0 red 1 green 2 blue 3 yellow
    //color = 0;
    // 0 null 1 -> 9 uno numbers, 10 reverse, 11 +2, 12 skip, 13 +4
    //type = 0;


var players = [];
var drawBuffer = 0;
var cards_in_middle = [];
cards_in_middle = drawCard(cards_in_middle, 1);


var playerTurn = undefined;
var iterationDirection = 1;
var skip = false;

function weightedRandom(prob) {
    let i, sum=0, r=Math.random();
    for (i in prob) {
      sum += prob[i];
      if (r <= sum) return i;
    }
  }

function getPlayer(socketId) {
    for (let index = 0; index < players.length; index++) {
        const element = players[index];
        if(element.socket.id == socketId) {
            return element;
        }
    }
    return null;
}

function intInclusive(min, max) {
    return Math.floor(Math.random() * (max - min +1)) + min;
}

function playerDrawCard(player, num) {
    player.cards = drawCard(player.cards, num);
    player.socket.emit("refreshcards", player.cards);
}

function drawCard(list, num) {
    for(var i = 0; i < num; i++) {
        var number = intRandom(1,9);
        list.push({color: intInclusive(0,3), type: weightedRandom({number:0.72, 0:0.04, 10: 0.08, 11:0.08, 12:0.08, 13:0.04})})
    }
    return list;
}

function iterateTurn() {
    playerTurn = playerTurn.next;
    if(playerTurn == undefined) {
        playerTurn = players[0];
    }
    if(skip) {
        skip=false;
        iterateTurn();
    } else {
        io.sockets.emit("playerturn", playerTurn.socket.id);
    }
}

function getTopCard() {
    return cards_in_middle[cards_in_middle.length-1];
}

function updateTopCards() {
    io.sockets.emit("topcard", [cards_in_middle[cards_in_middle.length - 1], cards_in_middle[cards_in_middle.length - 2], cards_in_middle[cards_in_middle.length - 3]]);
}

function removeSocket(socket) {
    console.log("removing socket due to disconnect");
    let found = -1;
    for (let index = 0; index < players.length; index++) {
        const element = players[index];
        console.log(element.socket.id + " " + socket.id + " " + playerTurn.socket.id);
        if(element.socket.id == socket.id) {
            found = index;

            if(playerTurn.socket.id == socket.id) {
                console.log("iterating turn because of client disconnect");
                iterateTurn();
                //io.sockets.emit("playerturn", playerTurn);
            }
            break;
        }
    }
    if(found == -1) {
        return found;
    }
    var player = players[found];    
    var search = players[0];
    while(search.next) {
        if(search.next.socket.id == player.socket.id) {
            search.next = player.next;
            break;
        }
        search = search.next;
    }
    players.splice(found, 1);
    return found;
}

io.sockets.on("connection", (socket) => {
    console.log("Client connected");
    
    socket.on("joingame", (args) => {
        var topPlayer = players[players.length-1]; //Player w out next
        var newPlayer = {name: args, cards: [], socket: socket, next: undefined};
        players.push(newPlayer);
    
        if(!playerTurn) {
            playerTurn = newPlayer;
        }
    
        if(topPlayer) {
           topPlayer.next = newPlayer;
        }
    
        playerDrawCard(newPlayer, 7);
    
        socket.emit("topcard", [cards_in_middle[cards_in_middle.length - 1], cards_in_middle[cards_in_middle.length - 2], cards_in_middle[cards_in_middle.length - 3]]);
        socket.emit("playerturn", playerTurn.socket.id);
        socket.emit("init", newPlayer.socket.id);
    });


    //socket.emit("drawcard", drawCard([], 7));

    socket.on("movecards", (arg) => {
        let player = getPlayer(socket.id);

        let cards = [];
        for(var i = 0; i < arg.length; i++) {
            cards.push(player.cards[arg[i]]);
        }
        player.cards = cards;
    })

    socket.on("reqdraw", (arg) => {
        if(playerTurn.socket.id == socket.id) {
            let drawn_card = drawCard([], 1)[0];
            let top_card = getTopCard();
            playerTurn.cards.push(drawn_card);
            socket.emit("refreshcards", playerTurn.cards);
            //socket.emit("drawcard", [drawn_card]);
            if(drawn_card.type == top_card.type || drawn_card.color == top_card.color) {
                return;
            }
            iterateTurn();
            return;
        }
    });

    socket.on("tryput", (obj) => {
        let card_pos = obj.card;
        let player = getPlayer(socket.id);
        let card = player.cards[card_pos];
        let scolor = obj.special_color;
        let topcard = cards_in_middle[cards_in_middle.length - 1];
        //var player = getPlayer(socket.id);

        if(!playerTurn.socket.connected) {
            var a = removeSocket(playerTurn.socket);
            if(a == -1) {
                playerTurn = players[0];
                io.sockets.emit("playerturn", playerTurn.socket.id);
            }
            return;
        }

        if((card.type != topcard.type || card.color != topcard.color) && (playerTurn.socket.id != socket.id)) {
            socket.emit("canput", false);
            return;
        }
        
        if(topcard.color == card.color || topcard.type == card.type || card.type == 13) {
            socket.emit("canput", true);
            if(player.socket.id != playerTurn.socket.id) {
                playerTurn = player;
            }
            player.cards.splice(card_pos, 1);
            player.socket.emit("refreshcards", player.cards);
            if(card.type == 13) {
                card.color = scolor;
            }

            cards_in_middle.push(card);
            updateTopCards();
            //io.sockets.emit("topcard", cards_in_middle[cards_in_middle.length - 1]);

            if(card.type == 10) {
                iterationDirection *= -1;
            } else if(card.type == 12) {
                skip=true;
            }

            if(player.cards.length < 1) {
                io.sockets.emit("playerwon", player.socket.id);
                return;
            }

            if(card.type == 11 || card.type == 13) {
                let nextPlayer = player.next ? player.next : players[0];
                for (let index = 0; index < nextPlayer.cards.length; index++) {
                    const element = nextPlayer.cards[index];
                    if(element.type == card.type) {
                        this.drawBuffer += card.type == 11 ? 2 : 4;
                        iterateTurn();
                        return;
                    }
                }  
                playerDrawCard(player.next ? player.next : players[0], card.type == 11 ? 2 + drawBuffer : 4 + drawBuffer);
                skip = true;
            } else {
                if(drawBuffer > 0) {
                    playerDrawCard(player, drawBuffer);
                    drawBuffer = 0;
                }
            }

            iterateTurn();

        } else {
            socket.emit("canput", false);
        }
    });

    socket.on("disconnect", () => { 
        console.log("client disconnected");
        var a = removeSocket(socket);
        if(a == -1) {
            playerTurn = players[0];
            io.sockets.emit("playerturn", playerTurn.socket.id);
        }
    });

});

http.listen(process.env.PORT || 3000, function() {

//http.listen( 3000, '0.0.0.0', function() {
    console.log("Listening");    
});