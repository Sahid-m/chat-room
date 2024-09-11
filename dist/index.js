"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const chatroomManager_1 = require("./chatroomManager");
const wss = new ws_1.WebSocketServer({ port: 8080 });
const ChatroomManager = new chatroomManager_1.chatroomManager();
wss.on("connection", function connection(ws) {
    ws.on("error", console.error);
    ChatroomManager.addUser(ws);
    ws.on("disconnect", () => {
        ChatroomManager.removeUser(ws);
    });
});
