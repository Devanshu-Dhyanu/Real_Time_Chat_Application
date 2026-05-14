
import { io } from "socket.io-client";

let socket;
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || "http://localhost:7000").replace(/\/$/, "");

export const connectSocket = (userId) => {
    socket = io(SOCKET_URL, {
        query: { userId },
        transports: ["websocket"],
    });

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
        console.log("Socket error:", err.message);
    });

    return socket;
};

export const getSocket = () => socket;
