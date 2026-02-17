"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { headers: await getAuth() });
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
      setNotifications(data.notifications || []);
    } catch {
      // silently fail — notification bell is non-critical
    }
  }, [getAuth]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: await getAuth(),
        body: JSON.stringify({}),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {
      // silently fail
    }
  }, [getAuth]);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) markAllRead();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-grape-300 transition hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/[0.08] bg-black/95 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="text-sm font-medium text-white">Notifications</span>
              <Link
                href="/monitoring"
                onClick={() => setOpen(false)}
                className="text-xs text-grape-400 hover:text-grape-200 transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-grape-400">No notifications</p>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-white/[0.04] px-4 py-3 ${!n.readAt ? "bg-white/[0.02]" : ""}`}
                  >
                    <p className="text-xs font-medium text-grape-200">{n.title}</p>
                    <p className="mt-0.5 text-[11px] text-grape-400 line-clamp-2">{n.body}</p>
                    <p className="mt-1 text-[10px] text-grape-500">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
