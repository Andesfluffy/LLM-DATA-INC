"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Input from "@/src/components/Input";
import { Loader2, Save, Clock } from "lucide-react";
import { toast } from "@/src/components/ui/Toast";

type Schedule = {
  weeklyReportDay: number;
  weeklyReportHour: number;
  weeklyReportMinute: number;
  timezone: string;
  revenueDropThreshold: number;
  expenseSpikeThreshold: number;
  refundSpikeThreshold: number;
  marginDropThreshold: number;
  enabled: boolean;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const defaultSchedule: Schedule = {
  weeklyReportDay: 1,
  weeklyReportHour: 9,
  weeklyReportMinute: 0,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  revenueDropThreshold: 0.15,
  expenseSpikeThreshold: 0.20,
  refundSpikeThreshold: 0.20,
  marginDropThreshold: 0.10,
  enabled: true,
};

export default function MonitorSchedulePage() {
  const [schedule, setSchedule] = useState<Schedule>(defaultSchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/monitor/schedule", { headers: await getAuth() });
      if (!res.ok) throw new Error("Failed to load schedule");
      const data = await res.json();
      if (data.schedule) {
        setSchedule(data.schedule);
      }
    } catch (error: any) {
      toast.error(error.message || "Could not load schedule");
    } finally {
      setLoading(false);
    }
  }, [getAuth]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const saveSchedule = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/monitor/schedule", {
        method: "PUT",
        headers: await getAuth(),
        body: JSON.stringify(schedule),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Save failed");
      }
      toast.success("Monitor schedule saved");
    } catch (error: any) {
      toast.error(error.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }, [schedule, getAuth]);

  const update = (key: keyof Schedule, value: any) => {
    setSchedule((s) => ({ ...s, [key]: value }));
  };

  if (loading) {
    return (
      <RequireAuth title="Sign in to configure monitoring" description="Set up automated monitoring schedule.">
        <div className="flex items-center justify-center py-16 text-grape-300">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading schedule...
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth title="Sign in to configure monitoring" description="Set up automated monitoring schedule.">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Monitoring Schedule" subtitle="Configure when automated monitoring runs and what thresholds trigger alerts." />
          <CardBody>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-grape-200">
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(e) => update("enabled", e.target.checked)}
                  className="h-4 w-4 rounded border-grape-400"
                />
                Enable automated monitoring
              </label>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Schedule" subtitle="When should the weekly monitoring run?" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-grape-300">Day of Week</label>
                <select
                  value={schedule.weeklyReportDay}
                  onChange={(e) => update("weeklyReportDay", Number(e.target.value))}
                  className="w-full rounded-lg border border-white/[0.1] bg-black px-3 py-2 text-sm text-white"
                >
                  {dayNames.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-grape-300">Hour (24h)</label>
                <select
                  value={schedule.weeklyReportHour}
                  onChange={(e) => update("weeklyReportHour", Number(e.target.value))}
                  className="w-full rounded-lg border border-white/[0.1] bg-black px-3 py-2 text-sm text-white"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </div>
              <Input
                label="Timezone"
                value={schedule.timezone}
                onChange={(e) => update("timezone", (e.target as HTMLInputElement).value)}
                placeholder="UTC"
              />
            </div>
            <p className="mt-2 text-xs text-grape-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Monitoring will run every {dayNames[schedule.weeklyReportDay]} at {String(schedule.weeklyReportHour).padStart(2, "0")}:{String(schedule.weeklyReportMinute).padStart(2, "0")} {schedule.timezone}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Anomaly Thresholds" subtitle="Set the percentage thresholds that trigger anomaly alerts." />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Revenue Drop Threshold (%)"
                type="number"
                value={String(Math.round(schedule.revenueDropThreshold * 100))}
                onChange={(e) => update("revenueDropThreshold", Number((e.target as HTMLInputElement).value) / 100)}
                helperText="Alert if revenue drops by more than this percentage week-over-week."
              />
              <Input
                label="Expense Spike Threshold (%)"
                type="number"
                value={String(Math.round(schedule.expenseSpikeThreshold * 100))}
                onChange={(e) => update("expenseSpikeThreshold", Number((e.target as HTMLInputElement).value) / 100)}
                helperText="Alert if expenses increase by more than this percentage."
              />
              <Input
                label="Refund Spike Threshold (%)"
                type="number"
                value={String(Math.round(schedule.refundSpikeThreshold * 100))}
                onChange={(e) => update("refundSpikeThreshold", Number((e.target as HTMLInputElement).value) / 100)}
                helperText="Alert if refund volume spikes beyond this percentage."
              />
              <Input
                label="Margin Drop Threshold (%)"
                type="number"
                value={String(Math.round(schedule.marginDropThreshold * 100))}
                onChange={(e) => update("marginDropThreshold", Number((e.target as HTMLInputElement).value) / 100)}
                helperText="Alert if margin compresses by more than this percentage."
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveSchedule} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Schedule
          </Button>
        </div>
      </div>
    </RequireAuth>
  );
}
