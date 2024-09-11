import { WebSocketServer } from "ws";
import { chatroomManager } from "./chatroomManager";

const wss = new WebSocketServer({ port: 8080 });
const ChatroomManager = new chatroomManager();

wss.on("connection", function connection(ws) {
  ws.on("error", console.error);
  ChatroomManager.addUser(ws);

  ws.on("disconnect", () => {
    ChatroomManager.removeUser(ws);
  });
});
