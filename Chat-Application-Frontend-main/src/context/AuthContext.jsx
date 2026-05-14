import { createContext, useContext, useEffect, useState } from "react";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    console.log("USER FROM SESSION:", storedUser);
    if (storedUser) {
      setUserState(JSON.parse(storedUser));
    }
  }, []);

  const setUser = (userData) => {
    sessionStorage.setItem("user", JSON.stringify(userData));
    setUserState(userData);
  };

  const logout = () => {
    sessionStorage.removeItem("user");
    setUserState(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);