import { createContext, useContext, useEffect, useState } from "react";
import { updatePublicKey } from "../api/auth";
import {
  generateAndExportKeyPair,
  getPrivateKeyStorageKey,
  importPrivateKey,
} from "../utils/e2ee";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [encryptionReady, setEncryptionReady] = useState(false);

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

  const updateUser = (partialUserData) => {
    setUserState((prev) => {
      const nextUser = { ...(prev || {}), ...partialUserData };
      sessionStorage.setItem("user", JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const logout = () => {
    sessionStorage.removeItem("user");
    setUserState(null);
    setPrivateKey(null);
    setEncryptionReady(false);
  };

  useEffect(() => {
    if (!user?._id) {
      setPrivateKey(null);
      setEncryptionReady(false);
      return;
    }

    let isCancelled = false;

    const ensureKeys = async () => {
      try {
        setEncryptionReady(false);
        const storageKey = getPrivateKeyStorageKey(user._id);
        let privateKeyString = localStorage.getItem(storageKey);
        let publicKey = user.publicKey;

        if (!privateKeyString || !publicKey) {
          const generatedKeys = await generateAndExportKeyPair();
          privateKeyString = generatedKeys.privateKey;
          publicKey = generatedKeys.publicKey;
          localStorage.setItem(storageKey, privateKeyString);
          const response = await updatePublicKey(user._id, { publicKey });
          if (!isCancelled) {
            updateUser(response.data);
          }
        }

        const importedPrivateKey = await importPrivateKey(privateKeyString);
        if (!isCancelled) {
          setPrivateKey(importedPrivateKey);
          setEncryptionReady(true);
        }
      } catch (error) {
        console.log("Failed to initialize encryption keys", error);
        if (!isCancelled) {
          setPrivateKey(null);
          setEncryptionReady(false);
        }
      }
    };

    ensureKeys();
    return () => {
      isCancelled = true;
    };
  }, [user?._id, user?.publicKey]);

  return (
    <AuthContext.Provider value={{ user, setUser, updateUser, logout, privateKey, encryptionReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
