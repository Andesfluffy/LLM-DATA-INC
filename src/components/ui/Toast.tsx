"use client";

import { Toaster, toast as rtoast } from "react-hot-toast";

const fontStack = "var(--font-inter), 'Inter', 'Segoe UI', 'Roboto', sans-serif";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={14}
      containerStyle={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        padding: 0,
        pointerEvents: "none",
        width: "100%",
        maxWidth: "420px",
      }}
      toastOptions={{
        duration: 4600,
        style: {
          background: "rgba(13, 13, 13, 0.96)",
          color: "rgb(250, 250, 250)",
          fontFamily: fontStack,
          fontSize: "0.95rem",
          fontWeight: 600,
          letterSpacing: "0.015em",
          borderRadius: "18px",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 22px 60px rgba(0, 0, 0, 0.6)",
          padding: "1rem 1.2rem",
          backdropFilter: "blur(14px)",
          pointerEvents: "auto",
          maxWidth: "min(90vw, 420px)",
        },
        success: {
          iconTheme: {
            primary: "#34d399",
            secondary: "#000000",
          },
          style: {
            borderColor: "rgba(52, 211, 153, 0.3)",
          },
        },
        error: {
          iconTheme: {
            primary: "#f87171",
            secondary: "#000000",
          },
          style: {
            borderColor: "rgba(248, 113, 113, 0.3)",
          },
        },
        loading: {
          style: {
            borderColor: "rgba(255, 255, 255, 0.1)",
          },
        },
      }}
    />
  );
}

export const toast = rtoast;
