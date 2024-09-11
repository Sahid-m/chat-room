"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatRoom = exports.PlayerRole = void 0;
const chatroomManager_1 = require("./chatroomManager");
const messages_1 = require("./messages");
var PlayerRole;
(function (PlayerRole) {
    PlayerRole["Judge1"] = "judge1";
    PlayerRole["Judge2"] = "judge2";
    PlayerRole["Contestant"] = "contestant";
    PlayerRole["Defendant"] = "defendant";
})(PlayerRole || (exports.PlayerRole = PlayerRole = {}));
class ChatRoom {
    constructor(players) {
        const roles = this.shuffleArray([...Object.values(PlayerRole)]);
        this.players = players.map((player, index) => (Object.assign(Object.assign({}, player), { role: roles[index], status: chatroomManager_1.playerStatus.InRoom })));
    }
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    getPlayers() {
        return this.players;
    }
    broadcastMessage(sender, message) {
        const broadcastMessage = JSON.stringify({
            type: messages_1.CHAT_MESSAGE,
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
exports.ChatRoom = ChatRoom;
