import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { ChatProvider } from "./context/ChatContext";
import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ChatPage from "./pages/ChatPage";

function AppContent() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState("login");
  console.log("USER FROM APP:", user);

  // If no user session, show the login or register screen
  if (!user) {
    if (currentPage === "register") {
      return <RegisterPage onSwitchToLogin={() => setCurrentPage("login")} />;
    }
    return <LoginPage onSwitchToRegister={() => setCurrentPage("register")} />;
  }

  return (
    <SocketProvider>
      <ChatProvider>
        <ChatPage />
      </ChatProvider>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
