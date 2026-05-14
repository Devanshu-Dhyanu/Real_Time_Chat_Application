import { useEffect, useRef, useState } from "react";
import { googleAuthApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";

const GOOGLE_SCRIPT_ID = "google-identity-services";

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        existingScript.addEventListener("load", () => resolve(), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services."));
    document.head.appendChild(script);
  });

export default function GoogleAuthButton() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const { setUser } = useAuth();
  const buttonContainerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId || !buttonContainerRef.current) {
      return;
    }

    let isCancelled = false;

    const initializeGoogle = async () => {
      try {
        await loadGoogleScript();
        if (isCancelled || !window.google?.accounts?.id || !buttonContainerRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response.credential) {
              setError("Google sign-in did not return a credential.");
              return;
            }

            try {
              setError("");
              const res = await googleAuthApi({ credential: response.credential });
              setUser(res.data.user);
            } catch (authError) {
              setError(
                authError.response?.data?.message ||
                  "Google sign-in failed. Please try again.",
              );
            }
          },
        });

        buttonContainerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: "outline",
          size: "large",
          width: buttonContainerRef.current.offsetWidth || 320,
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
        });
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError.message || "Unable to load Google sign-in.");
        }
      }
    };

    initializeGoogle();

    return () => {
      isCancelled = true;
    };
  }, [clientId, setUser]);

  if (!clientId) {
    return (
      <p className="auth-inline-note">
        Google sign-in will appear after `VITE_GOOGLE_CLIENT_ID` is configured.
      </p>
    );
  }

  return (
    <>
      <div ref={buttonContainerRef} className="google-btn-slot" />
      {error ? <p className="auth-inline-error">{error}</p> : null}
    </>
  );
}
