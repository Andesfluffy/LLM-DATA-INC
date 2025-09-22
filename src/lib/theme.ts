"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getPreferred(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? "dark" : "light";
}

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark"); else root.classList.remove("dark");
}

export function useTheme(): [Theme, (t: Theme)=>void] {
  const [theme, setTheme] = useState<Theme>(getPreferred());
  useEffect(() => { applyTheme(theme); localStorage.setItem("theme", theme); }, [theme]);
  useEffect(() => { applyTheme(theme); }, []);
  return [theme, setTheme];
}

