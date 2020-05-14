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

  playerId: number;
  currentTurn : number;

  winner: number;

  cards: Card[];

  centercard = {type: 0, color: 0};

  constructor(private socket: Socket) {}

  ngOnInit() {
  }

  getDisplay(type : number) {
    switch(type) {
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
    this.socket.emit("tryput", {card: this.cards[event.previousIndex], length: this.cards.length});
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
    for(var i = 0; i <= distance; i++) {
      let position = event.currentIndex + i*direction;
      let temp = this.cards[position];
      this.cards[position] = hold;
      hold = temp;
    }

  }

  ngAfterViewInit() {
    this.cards = [];
    this.socket.on("topcard", (args) => {
      this.centercard = args;
    });

    this.socket.on("drawcard", (args) => {
      for(let a of args) {
        this.cards.push(a);
      }
    });

    this.socket.on("init", (args) => {
      this.playerId = args;
      this.cards = [];
      this.winner = null;
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
