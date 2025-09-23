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
          background: "rgba(13, 16, 22, 0.96)",
          color: "rgb(var(--fg))",
          fontFamily: fontStack,
          fontSize: "0.95rem",
          fontWeight: 600,
          letterSpacing: "0.015em",
          borderRadius: "18px",
          border: "1px solid rgba(249, 115, 22, 0.45)",
          boxShadow: "0 22px 60px rgba(0, 0, 0, 0.45)",
          padding: "1rem 1.2rem",
          backdropFilter: "blur(14px)",
          pointerEvents: "auto",
          maxWidth: "min(90vw, 420px)",
        },
        success: {
          iconTheme: {
            primary: "#F97316",
            secondary: "#0C0C0E",
          },
        },
        error: {
          iconTheme: {
            primary: "#F87171",
            secondary: "#0C0C0E",
          },
          style: {
            borderColor: "rgba(248, 113, 113, 0.55)",
          },
        },
        loading: {
          style: {
            borderColor: "rgba(96, 165, 250, 0.45)",
          },
        },
      }}
    />
  );
}

export const toast = rtoast;
