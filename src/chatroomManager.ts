import { WebSocket } from "ws";
import { ChatRoom, PlayerRole } from "./chatRoom";
import {
  CHAT_MESSAGE,
  GAME_STARTED,
  INIT_GAME,
  WAITING_FOR_PLAYERS,
} from "./messages";

export enum playerStatus {
  Idle = "Idle",
  StartedGame = "StartedGame",
  InRoom = "InRoom",
  WaitingForPlayers = "WaitingForPlayers",
}

export interface player {
  socket: WebSocket;
  status: playerStatus;
  name?: string;
  role?: PlayerRole;
}

export class chatroomManager {
  private players: player[];
  private waitingPlayers: player[];
  private inRoomPlayers: player[];
  private activeRooms: ChatRoom[];

  constructor() {
    this.players = [];
    this.waitingPlayers = [];
    this.inRoomPlayers = [];
    this.activeRooms = [];
  }

  addUser(userSocket: WebSocket) {
    const newPlayer: player = {
      socket: userSocket,
      status: playerStatus.Idle,
      name: crypto.randomUUID(),
    };
    this.players.push(newPlayer);
    this.addHandler(newPlayer);
  }

  removeUser(Socket: WebSocket) {
    const playerToRemove = this.players.find((user) => user.socket === Socket);

    if (playerToRemove) {
      console.log("User disconnected: " + playerToRemove.name);
      this.players = this.players.filter((user) => user.socket !== Socket);
      this.waitingPlayers = this.waitingPlayers.filter(
        (user) => user.socket !== Socket
      );
      this.inRoomPlayers = this.inRoomPlayers.filter(
        (user) => user.socket !== Socket
      );

      // Remove player from active room if they're in one
      this.activeRooms.forEach((room, index) => {
        const updatedPlayers = room
          .getPlayers()
          .filter((player) => player.socket !== Socket);
        if (updatedPlayers.length !== room.getPlayers().length) {
          if (updatedPlayers.length < 2) {
            // If less than 2 players remain, close the room
            this.activeRooms.splice(index, 1);
          } else {
            // Update the room with remaining players
            this.activeRooms[index] = new ChatRoom(updatedPlayers);
          }
        }
      });
    } else {
      console.log("User not found for removal.");
    }
  }

  private addHandler(player: player) {
    player.socket.on("message", (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch (e) {
        message = null;
      }
      if (message == null || typeof message.type !== "string") {
        player.socket.send(JSON.stringify({ message: "Invalid JSON Input" }));
        return;
      }

      switch (message.type) {
        case INIT_GAME:
          console.log("Received " + data + " from " + player.name);
          this.handleInitGame(player);
          break;
        case CHAT_MESSAGE:
          this.handleChatMessage(player, message.message);
          break;
        default:
          player.socket.send(
            JSON.stringify({ message: "Unknown message type" })
          );
      }
    });

    player.socket.on("close", () => {
      this.removeUser(player.socket);
    });
  }

  private handleInitGame(player: player) {
    this.updatePlayerStatus(player, playerStatus.WaitingForPlayers);
    this.waitingPlayers.push(player);

    player.socket.send(
      JSON.stringify({
        type: "WAITING_STATUS",
        message: "Waiting for other players to join.",
      })
    );

    if (this.waitingPlayers.length >= 4) {
      this.startGame(this.waitingPlayers.splice(0, 4));
    }
  }

  private startGame(gamePlayers: player[]) {
    const newRoom = new ChatRoom(gamePlayers);
    this.activeRooms.push(newRoom);

    const players = newRoom.getPlayers();
    players.forEach((player) => {
      this.updatePlayerStatus(player, playerStatus.InRoom);
      this.inRoomPlayers.push(player);
      this.waitingPlayers = this.waitingPlayers.filter(
        (p) => p.socket !== player.socket
      );

      player.socket.send(
        JSON.stringify({
          type: "GAME_START",
          message: "Game is starting. Your role is: " + player.role,
          role: player.role,
        })
      );
    });

    console.log(
      "Started a new game with players:",
      players.map((p) => `${p.name} (${p.role})`).join(", ")
    );
    this.logPlayerStatuses(); // Log all player statuses after starting the game
  }

  private handleChatMessage(sender: player, message: string) {
    // Find the up-to-date player object
    const currentPlayer = this.players.find((p) => p.socket === sender.socket);

    if (!currentPlayer || currentPlayer.status !== playerStatus.InRoom) {
      sender.socket.send(
        JSON.stringify({
          type: "ERROR",
          message: "You must be in a room to send chat messages.",
        })
      );
      return;
    }

    const room = this.activeRooms.find((room) =>
      room.getPlayers().some((player) => player.socket === sender.socket)
    );
    if (room) {
      room.broadcastMessage(currentPlayer, message);
    } else {
      console.error(
        "Player is marked as InRoom but not found in any active room:",
        currentPlayer.name
      );
      sender.socket.send(
        JSON.stringify({
          type: "ERROR",
          message: "You are not in an active room. Please rejoin the game.",
        })
      );
    }
  }

  private updatePlayerStatus(player: player, newStatus: playerStatus) {
    // Update in the main players array
    const mainPlayerIndex = this.players.findIndex(
      (p) => p.socket === player.socket
    );
    if (mainPlayerIndex !== -1) {
      this.players[mainPlayerIndex].status = newStatus;
    }

    // Update in the waiting players array
    const waitingPlayerIndex = this.waitingPlayers.findIndex(
      (p) => p.socket === player.socket
    );
    if (waitingPlayerIndex !== -1) {
      this.waitingPlayers[waitingPlayerIndex].status = newStatus;
    }

    // Update in the in-room players array
    const inRoomPlayerIndex = this.inRoomPlayers.findIndex(
      (p) => p.socket === player.socket
    );
    if (inRoomPlayerIndex !== -1) {
      this.inRoomPlayers[inRoomPlayerIndex].status = newStatus;
    }

    // Update the player object itself
    player.status = newStatus;

    console.log(`Updated status for player ${player.name} to ${newStatus}`);
  }

  private logPlayerStatuses() {
    console.log("All players:");
    this.players.forEach((p) => console.log(`${p.name}: ${p.status}`));
    console.log("Waiting players:");
    this.waitingPlayers.forEach((p) => console.log(`${p.name}: ${p.status}`));
    console.log("In-room players:");
    this.inRoomPlayers.forEach((p) => console.log(`${p.name}: ${p.status}`));
  }
}
