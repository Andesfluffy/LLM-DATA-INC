"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAuth from "@/src/components/RequireAuth";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Input from "@/src/components/Input";
import { Loader2, Plus, Trash2, ToggleLeft, ToggleRight, Bell } from "lucide-react";
import { toast } from "@/src/components/ui/Toast";

type AlertRule = {
  id: string;
  metric: string;
  threshold: number;
  cooldownMinutes: number;
  recipients: string[];
  channel: "EMAIL" | "IN_APP";
  isEnabled: boolean;
  createdAt: string;
};

const metricOptions = [
  { value: "revenue_drop", label: "Revenue Drop %" },
  { value: "expense_spike", label: "Expense Spike %" },
  { value: "refund_spike", label: "Refund Spike %" },
  { value: "margin_compression", label: "Margin Compression %" },
];

export default function AlertRulesPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    metric: "revenue_drop",
    threshold: 15,
    cooldownMinutes: 60,
    recipients: "",
    channel: "IN_APP" as "EMAIL" | "IN_APP",
  });

  const getAuth = useCallback(async () => {
    const idToken = await (await import("@/lib/firebase/client")).auth.currentUser?.getIdToken();
    return {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    };
  }, []);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts/rules", { headers: await getAuth() });
      if (!res.ok) throw new Error("Failed to load alert rules");
      const data = await res.json();
      setRules(data.rules || []);
    } catch (error: any) {
      toast.error(error.message || "Could not load rules");
    } finally {
      setLoading(false);
    }
  }, [getAuth]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const createRule = useCallback(async () => {
    const recipients = form.recipients.split(",").map((r) => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast.error("Add at least one recipient (email or user ID)");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/alerts/rules", {
        method: "POST",
        headers: await getAuth(),
        body: JSON.stringify({
          metric: form.metric,
          threshold: form.threshold,
          cooldownMinutes: form.cooldownMinutes,
          recipients,
          channel: form.channel,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create rule");
      }
      toast.success("Alert rule created");
      setShowCreate(false);
      setForm({ metric: "revenue_drop", threshold: 15, cooldownMinutes: 60, recipients: "", channel: "IN_APP" });
      await loadRules();
    } catch (error: any) {
      toast.error(error.message || "Creation failed");
    } finally {
      setCreating(false);
    }
  }, [form, getAuth, loadRules]);

  const toggleRule = useCallback(async (rule: AlertRule) => {
    try {
      const res = await fetch(`/api/alerts/rules/${rule.id}`, {
        method: "PATCH",
        headers: await getAuth(),
        body: JSON.stringify({ isEnabled: !rule.isEnabled }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r));
    } catch (error: any) {
      toast.error(error.message || "Toggle failed");
    }
  }, [getAuth]);

  const deleteRule = useCallback(async (ruleId: string) => {
    try {
      const res = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: "DELETE",
        headers: await getAuth(),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Rule deleted");
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    }
  }, [getAuth]);

  return (
    <RequireAuth title="Sign in to manage alerts" description="Configure anomaly detection alert rules.">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Alert Rules" subtitle="Define thresholds for anomaly detection. When breached, alerts are sent via your chosen channel." />
          <CardBody>
            <Button onClick={() => setShowCreate(!showCreate)}>
              <Plus className="h-4 w-4 mr-2" /> New Alert Rule
            </Button>
          </CardBody>
        </Card>

        {/* Create Form */}
        {showCreate && (
          <Card>
            <CardHeader title="Create Alert Rule" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-grape-300">Metric</label>
                  <select
                    value={form.metric}
                    onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))}
                    className="w-full rounded-lg border border-white/[0.1] bg-black px-3 py-2 text-sm text-white"
                  >
                    {metricOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Threshold (%)"
                  type="number"
                  value={String(form.threshold)}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: Number((e.target as HTMLInputElement).value) }))}
                />
                <Input
                  label="Cooldown (minutes)"
                  type="number"
                  value={String(form.cooldownMinutes)}
                  onChange={(e) => setForm((f) => ({ ...f, cooldownMinutes: Number((e.target as HTMLInputElement).value) }))}
                  helperText="Minimum time between duplicate alerts."
                />
                <Input
                  label="Recipients (comma-separated)"
                  value={form.recipients}
                  onChange={(e) => setForm((f) => ({ ...f, recipients: (e.target as HTMLInputElement).value }))}
                  placeholder="user@example.com"
                />
                <div>
                  <label className="mb-1 block text-xs text-grape-300">Channel</label>
                  <select
                    value={form.channel}
                    onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value as "EMAIL" | "IN_APP" }))}
                    className="w-full rounded-lg border border-white/[0.1] bg-black px-3 py-2 text-sm text-white"
                  >
                    <option value="IN_APP">In-App Notification</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={createRule} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Rule
                </Button>
                <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Rules List */}
        <Card>
          <CardHeader title="Active Rules" subtitle="Toggle or delete existing alert rules." />
          <CardBody>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-grape-300">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading rules...
              </div>
            ) : rules.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto h-10 w-10 text-grape-400 mb-3" />
                <p className="text-sm text-grape-300">No alert rules configured.</p>
                <p className="text-xs text-grape-400 mt-1">Create your first rule to start receiving anomaly alerts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {metricOptions.find((m) => m.value === rule.metric)?.label || rule.metric}
                        </span>
                        <span className="rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[10px] text-grape-300">
                          {rule.channel}
                        </span>
                        {!rule.isEnabled && (
                          <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] text-red-400">
                            disabled
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-grape-400">
                        Threshold: {rule.threshold}% | Cooldown: {rule.cooldownMinutes}min | Recipients: {rule.recipients.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleRule(rule)} className="text-grape-300 hover:text-white transition-colors">
                        {rule.isEnabled ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <button onClick={() => deleteRule(rule.id)} className="text-grape-300 hover:text-red-400 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </RequireAuth>
  );
}
