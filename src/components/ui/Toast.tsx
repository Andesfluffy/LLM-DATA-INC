"use client";
import { Toaster, toast as rtoast } from "react-hot-toast";

export function AppToaster() {
  return <Toaster position="top-right" />;
}

export const toast = rtoast;

