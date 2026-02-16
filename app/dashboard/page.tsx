"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutDashboard, Plus, Loader2 } from "lucide-react";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody } from "@/src/components/Card";
import Button from "@/src/components/Button";
import EmptyState from "@/src/components/EmptyState";
import DashboardWidgetCard from "@/src/components/DashboardWidgetCard";
import AddWidgetModal from "@/src/components/AddWidgetModal";
import { toast } from "@/src/components/ui/Toast";

type WidgetData = {
  id: string;
  displayType: string;
  savedQuery: {
    id: string;
    question: string;
    sql: string | null;
    name: string | null;
  };
};

type DashboardData = {
  id: string;
  name: string;
  widgets: WidgetData[];
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuth();

      // Get or create dashboard
      const listRes = await fetch("/api/dashboards", { headers });
      if (!listRes.ok) throw new Error("Failed to load dashboards");
      const listData = await listRes.json();

      let dashboardId: string;
      if (listData.dashboards?.length > 0) {
        dashboardId = listData.dashboards[0].id;
      } else {
        // Auto-create default dashboard
        const createRes = await fetch("/api/dashboards", {
          method: "POST",
          headers,
          body: JSON.stringify({ name: "My Dashboard" }),
        });
        if (!createRes.ok) throw new Error("Failed to create dashboard");
        const created = await createRes.json();
        dashboardId = created.id;
      }

      // Load dashboard with widgets
      const res = await fetch(`/api/dashboards/${dashboardId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
      }
    } catch (e: any) {
      console.error("Dashboard load failed:", e);
    } finally {
      setLoading(false);
    }
  }, [getAuth]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleAddWidget = useCallback(async (savedQueryId: string) => {
    if (!dashboard) return;
    try {
      const headers = await getAuth();
      const res = await fetch(`/api/dashboards/${dashboard.id}/widgets`, {
        method: "POST",
        headers,
        body: JSON.stringify({ savedQueryId, position: dashboard.widgets.length }),
      });
      if (res.ok) {
        toast.success("Added to dashboard");
        loadDashboard();
      } else {
        toast.error("Failed to add widget");
      }
    } catch {
      toast.error("Failed to add widget");
    }
  }, [dashboard, getAuth, loadDashboard]);

  const handleRemoveWidget = useCallback(async (widgetId: string) => {
    if (!dashboard) return;
    try {
      const headers = await getAuth();
      const res = await fetch(`/api/dashboards/${dashboard.id}/widgets`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ widgetId }),
      });
      if (res.ok) {
        setDashboard((prev) =>
          prev ? { ...prev, widgets: prev.widgets.filter((w) => w.id !== widgetId) } : prev
        );
        toast.success("Removed from dashboard");
      }
    } catch {
      toast.error("Failed to remove widget");
    }
  }, [dashboard, getAuth]);

  return (
    <RequireAuth title="Sign in to view your dashboard" description="Your personalized data dashboard.">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-grape-300">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {dashboard?.name || "Dashboard"}
              </h1>
              <p className="text-sm text-grape-400">Your pinned queries, updated live</p>
            </div>
          </div>
          <Button variant="primary" onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Widget
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center gap-2 py-16 justify-center text-sm text-grape-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your dashboard...
          </div>
        ) : dashboard && dashboard.widgets.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dashboard.widgets.map((widget) => (
              <DashboardWidgetCard
                key={widget.id}
                widget={widget}
                onRemove={handleRemoveWidget}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardBody>
              <EmptyState
                title="Your dashboard is empty"
                message="Pin your favorite questions here to see live results every time you visit. Ask questions from the Home page, then click 'Pin to Dashboard'."
              />
              <div className="flex justify-center mt-4">
                <Button variant="secondary" onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Add your first widget
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <AddWidgetModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddWidget}
      />
    </RequireAuth>
  );
}
