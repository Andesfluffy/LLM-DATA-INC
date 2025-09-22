"use client";
import { useTheme } from "@/src/lib/theme";
import Button from "@/src/components/Button";
import { useEffect, useState } from "react";

export default function ThemeToggle(){
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const label = mounted ? (theme === 'dark' ? 'Light' : 'Dark') : 'Theme';
  return (
    <Button variant="secondary" onClick={()=>setTheme(next)} className="text-xs" aria-label="Toggle theme">
      {label}
    </Button>
  );
}
