import { WebSocket } from "ws";
import { player, playerStatus } from "./chatroomManager";
import { CHAT_MESSAGE } from "./messages";

export enum PlayerRole {
  Judge1 = "judge1",
  Judge2 = "judge2",
  Contestant = "contestant",
  Defendant = "defendant",
}

export class ChatRoom {
  private players: player[];

  constructor(players: player[]) {
    const roles = this.shuffleArray([...Object.values(PlayerRole)]);
    this.players = players.map((player, index) => ({
      ...player,
      role: roles[index],
      status: playerStatus.InRoom, // Ensure status is set to InRoom
    }));
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  public getPlayers(): player[] {
    return this.players;
  }

  public broadcastMessage(sender: player, message: string) {
    const broadcastMessage = JSON.stringify({
      type: CHAT_MESSAGE,
      sender: sender.name,
      role: sender.role,
      message: message,
    });

    this.players.forEach((player) => {
      if (player !== sender) {
        player.socket.send(broadcastMessage);
      }
    });
  }
}
