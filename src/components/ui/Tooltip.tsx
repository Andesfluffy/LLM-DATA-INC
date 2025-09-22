"use client";
import React, { ReactNode, useState } from "react";

export default function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
  <span className="relative inline-flex" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>setOpen(false)}>
      {children}
      {open && (
        <span className="absolute z-40 bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-xl bg-gradient-to-tr from-blue-700 to-pink-500 text-white text-xs px-3 py-2 shadow-lg border border-pink-500/30 backdrop-blur-xl">
          {content}
        </span>
      )}
    </span>
  );
}

