import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { CdkDragDrop } from '@angular/cdk/drag-drop';


export class Card {
    type: number;
    color: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'client';

  playerId: string;
  currentTurn : string;

  winner: string;
  plus4color = "0";

  cards: Card[];

  centercards = [{type: -1, color: -1}, {type: -1, color: -1}, {type: -1, color: -1}];

  constructor(private socket: Socket) {}

  ngOnInit() {
  }

  getDisplay(type : number) {
    switch(type) {
      case -1:
        return "";
      case 10:
        return "Reverse";
      case 11:
        return "Draw 2";
      case 12:
        return "Skip";
      case 13:
        return "Draw 4";
    }
    return type;
  }

  getColor(value : number, opacity : number) {
    switch(value) {
      case -1:
        return 'rgba(0,0,0,0)';
      case 0:
        return `rgba(255, 0, 0, ${opacity}`;
      case 1:
        return `rgba(0, 255, 0, ${opacity}`;
      case 2:
        return `rgba(0, 0, 255, ${opacity}`;
      case 3:
        return `rgba(255, 255, 0, ${opacity}`;
      default:
        return `rgba(0, 0, 0, ${opacity}`;
    }
  }

  drop_center(event : CdkDragDrop<any>) {
    let thecard = this.cards[event.previousIndex];
    let scolor = undefined;
    if(thecard.type == 13) {
      scolor = parseInt(this.plus4color);
    }

    this.socket.emit("tryput", {card: event.previousIndex, special_color: scolor});
    this.socket.once("canput", (ret) => {
      if(ret) {
        this.cards.splice(event.previousIndex, 1);
      }
    });
  }

  drop(event : CdkDragDrop<any>) {

    var direction = event.previousIndex - event.currentIndex;
    var distance = Math.abs(direction);
    direction = direction/distance;

    var hold = this.cards[event.previousIndex];
    //console.log(hold.color + "  /  " + hold.type);
    //console.log(direction + " / " + distance);

    var server_side_movements = [];

    for(var i = 0; i < this.cards.length; i++) {
      server_side_movements.push(i);
    }
    var hold_server = server_side_movements[event.previousIndex];
    for(var i = 0; i <= distance; i++) {
      let position = event.currentIndex + i*direction;
      let temp = this.cards[position];
      let stemp = server_side_movements[position];
      this.cards[position] = hold;
      server_side_movements[position] = hold_server;
      hold = temp;
      hold_server = stemp;
    }
    this.socket.emit("movecards", server_side_movements);
  }

  ngAfterViewInit() {
    this.cards = [];
    this.socket.on("topcard", (args) => {
      for(var i = 0; i < args.length; i++) {
        if(!args[i]) {
          args[i] = {type: -1, color: -1};
        }
      }
      this.centercards = args;
    });

    this.socket.on("refreshcards", (args) => {
      this.cards = args;
    });

    this.socket.on("init", (args) => {
      this.playerId = args;
      this.winner = undefined;
    });

    this.socket.on("playerturn", (args) => {
      this.currentTurn = args;
    });

    this.socket.on("playerwon", (args) => {
      this.winner = args;
    });

  }

  pushButton() {
    this.socket.emit("reqdraw");
  }

}
