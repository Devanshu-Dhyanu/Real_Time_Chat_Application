import { createContext, useContext, useEffect, useState } from "react";
import { connectSocket } from "../socket/socket";
import { useAuth } from "./AuthContext";
const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    useEffect(() => {
        if (!user?._id) return;

        const s = connectSocket(user._id);
        console.log("Attempting connection for:", user.username);
        setSocket(s);

        s.on("connect", () => {
            console.log("Socket Connected! ID:", s.id);
            setOnlineUsers((prev) => [...new Set([...prev, user._id])]);
        });

        s.on("connect_error", (err) => {
            console.log("Socket Connection Error:", err.message);
        });

        s.on("user_online", ({ userId }) => {
            console.log("User Online:", userId);
            setOnlineUsers((prev) => [...new Set([...prev, userId])]);
        });

        s.on("user_offline", ({ userId }) => {
            console.log("User Offline:", userId);
            setOnlineUsers((prev) => prev.filter((id) => id !== userId));
        });

        return () => {
            s.disconnect();
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers, setOnlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
