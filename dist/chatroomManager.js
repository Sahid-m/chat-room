"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatroomManager = exports.playerStatus = void 0;
const chatRoom_1 = require("./chatRoom");
const messages_1 = require("./messages");
var playerStatus;
(function (playerStatus) {
    playerStatus["Idle"] = "Idle";
    playerStatus["StartedGame"] = "StartedGame";
    playerStatus["InRoom"] = "InRoom";
    playerStatus["WaitingForPlayers"] = "WaitingForPlayers";
})(playerStatus || (exports.playerStatus = playerStatus = {}));
class chatroomManager {
    constructor() {
        this.players = [];
        this.waitingPlayers = [];
        this.inRoomPlayers = [];
        this.activeRooms = [];
    }
    addUser(userSocket) {
        const newPlayer = {
            socket: userSocket,
            status: playerStatus.Idle,
            name: crypto.randomUUID(),
        };
        this.players.push(newPlayer);
        this.addHandler(newPlayer);
    }
    removeUser(Socket) {
        const playerToRemove = this.players.find((user) => user.socket === Socket);
        if (playerToRemove) {
            console.log("User disconnected: " + playerToRemove.name);
            this.players = this.players.filter((user) => user.socket !== Socket);
            this.waitingPlayers = this.waitingPlayers.filter((user) => user.socket !== Socket);
            this.inRoomPlayers = this.inRoomPlayers.filter((user) => user.socket !== Socket);
            // Remove player from active room if they're in one
            this.activeRooms.forEach((room, index) => {
                const updatedPlayers = room
                    .getPlayers()
                    .filter((player) => player.socket !== Socket);
                if (updatedPlayers.length !== room.getPlayers().length) {
                    if (updatedPlayers.length < 2) {
                        // If less than 2 players remain, close the room
                        this.activeRooms.splice(index, 1);
                    }
                    else {
                        // Update the room with remaining players
                        this.activeRooms[index] = new chatRoom_1.ChatRoom(updatedPlayers);
                    }
                }
            });
        }
        else {
            console.log("User not found for removal.");
        }
    }
    addHandler(player) {
        player.socket.on("message", (data) => {
            let message;
            try {
                message = JSON.parse(data.toString());
            }
            catch (e) {
                message = null;
            }
            if (message == null || typeof message.type !== "string") {
                player.socket.send(JSON.stringify({ message: "Invalid JSON Input" }));
                return;
            }
            switch (message.type) {
                case messages_1.INIT_GAME:
                    console.log("Received " + data + " from " + player.name);
                    this.handleInitGame(player);
                    break;
                case messages_1.CHAT_MESSAGE:
                    this.handleChatMessage(player, message.message);
                    break;
                default:
                    player.socket.send(JSON.stringify({ message: "Unknown message type" }));
            }
        });
        player.socket.on("close", () => {
            this.removeUser(player.socket);
        });
    }
    handleInitGame(player) {
        this.players = this.players.filter((p) => p !== player);
        player.status = playerStatus.WaitingForPlayers;
        this.waitingPlayers.push(player);
        player.socket.send(JSON.stringify({
            type: "WAITING_STATUS",
            message: "Waiting for other players to join.",
        }));
        if (this.waitingPlayers.length >= 4) {
            this.startGame(this.waitingPlayers.splice(0, 4));
        }
    }
    startGame(gamePlayers) {
        const newRoom = new chatRoom_1.ChatRoom(gamePlayers);
        this.activeRooms.push(newRoom);
        const players = newRoom.getPlayers();
        players.forEach((player) => {
            // Update the player's status in all relevant arrays
            player.status = playerStatus.InRoom;
            this.inRoomPlayers.push(player);
            this.waitingPlayers = this.waitingPlayers.filter((p) => p !== player);
            // Update the player's status in the main players array
            const mainPlayerIndex = this.players.findIndex((p) => p.socket === player.socket);
            if (mainPlayerIndex !== -1) {
                this.players[mainPlayerIndex] = player;
            }
            player.socket.send(JSON.stringify({
                type: "GAME_START",
                message: "Game is starting. Your role is: " + player.role,
                role: player.role,
            }));
        });
        console.log("Started a new game with players:", players.map((p) => `${p.name} (${p.role})`).join(", "));
    }
    handleChatMessage(sender, message) {
        // Log the sender's status for debugging
        console.log(`Handling chat message from ${sender.name}. Status: ${sender.status}`);
        if (sender.status !== playerStatus.InRoom) {
            sender.socket.send(JSON.stringify({
                type: "ERROR",
                message: "You must be in a room to send chat messages.",
            }));
            return;
        }
        const room = this.activeRooms.find((room) => room.getPlayers().some((player) => player.socket === sender.socket));
        if (room) {
            room.broadcastMessage(sender, message);
        }
        else {
            console.error("Player is marked as InRoom but not found in any active room:", sender.name);
            sender.socket.send(JSON.stringify({
                type: "ERROR",
                message: "You are not in an active room. Please rejoin the game.",
            }));
        }
    }
}
exports.chatroomManager = chatroomManager;
