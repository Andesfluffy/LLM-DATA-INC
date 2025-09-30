"use client";
import { useEffect, useState } from "react";
import Card, { CardBody, CardHeader } from "@/src/components/Card";
import Button from "@/src/components/Button";
import Input from "@/src/components/Input";
import RequireAuth from "@/src/components/RequireAuth";

type FormState = {
  name: string;
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
};

const demoDefaults: FormState = {
  name: "Primary",
  host: "localhost",
  port: "5432",
  database: "postgres",
  user: "postgres",
  password: "",
};

export default function DataSourcesSettingsPage() {
  const [form, setForm] = useState<FormState>(demoDefaults);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<boolean | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setOrgId(localStorage.getItem("orgId"));
    } catch {
      setOrgId(null);
    }
  }, []);

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function onTest() {
    setTesting(true);
    setTestOk(null);
    setTestMsg(null);
    try {
      const idToken = await (
        await import("@/lib/firebase/client")
      ).auth.currentUser?.getIdToken();
      const res = await fetch("/api/datasources/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          host: form.host,
          port: Number(form.port),
          database: form.database,
          user: form.user,
          password: form.password,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setTestOk(false);
        setTestMsg(payload?.error || "Failed");
      } else {
        setTestOk(true);
        setTestMsg(`${payload.ms} ms`);
      }
    } catch (error: any) {
      setTestOk(false);
      setTestMsg(String(error?.message || error));
    } finally {
      setTesting(false);
    }
  }

  async function onSave() {
    setSaving(true);
    setSaveOk(null);
    setSaveMsg(null);
    try {
      const idToken = await (
        await import("@/lib/firebase/client")
      ).auth.currentUser?.getIdToken();
      const res = await fetch("/api/datasources/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({ ...form, port: Number(form.port) }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setSaveOk(false);
        setSaveMsg(payload?.error || "Failed");
      } else {
        setSaveOk(true);
        setSaveMsg("Saved");
        if (payload?.id) {
          if (payload?.orgId) {
            localStorage.setItem("orgId", payload.orgId);
            setOrgId(payload.orgId);
          }
          localStorage.setItem("datasourceId", payload.id);
        }
      }
    } catch (error: any) {
      setSaveOk(false);
      setSaveMsg(String(error?.message || error));
    } finally {
      setSaving(false);
    }
  }

  const saveTone = saveOk === true ? "text-emerald-300" : saveOk === false ? "text-rose-300" : "text-gray-400";
  const testTone = testOk === true ? "text-emerald-300" : testOk === false ? "text-rose-300" : "text-gray-400";

  return (
    <RequireAuth title="Sign in to manage data sources" description="Configure and test your Postgres connections securely.">
      <div className="max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader
              title="Connection"
              subtitle={
                orgId
                  ? `Configure a Postgres connection for Data Vista (org ${orgId})`
                  : "Configure a Postgres connection for Data Vista"
              }
            />
            <CardBody>
              <div className="space-y-6">
                <div className="rounded-lg border border-[#2A2D3A] bg-[#0B0F12]/40 p-4">
                  <p className="text-sm font-medium text-gray-200">
                    Before you save, make sure you:
                  </p>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-gray-300">
                    <li>
                      Gather the connection details from your Postgres host: hostname or
                      IP, port, database name, and the schema you plan to query.
                    </li>
                    <li>
                      Create or confirm a read-only credential that only has the
                      privileges Data Vista needs (SELECT on the relevant schemas) and
                      note the username/password.
                    </li>
                    <li>
                      Verify the network path: add the Data Vista outbound IPs to your
                      firewall or VPC allow-list and download any SSL certificates
                      required for encrypted connections.
                    </li>
                  </ol>
                </div>
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(event) =>
                    update("name", (event.target as HTMLInputElement).value)
                  }
                  helperText="Human-friendly label, e.g., Primary warehouse or Analytics replica."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Host"
                    value={form.host}
                    onChange={(event) =>
                      update("host", (event.target as HTMLInputElement).value)
                    }
                    helperText="FQDN or IP address such as db.example.com or 10.0.0.15."
                  />
                  <Input
                    label="Port"
                    value={form.port}
                    onChange={(event) =>
                      update("port", (event.target as HTMLInputElement).value)
                    }
                    helperText="Postgres defaults to 5432; match your instance if customized."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Database"
                    value={form.database}
                    onChange={(event) =>
                      update("database", (event.target as HTMLInputElement).value)
                    }
                    helperText="Database name to connect to, e.g., postgres or analytics."
                  />
                  <Input
                    label="User"
                    value={form.user}
                    onChange={(event) =>
                      update("user", (event.target as HTMLInputElement).value)
                    }
                    helperText="Read-only role such as datavista_reader or reporting_user."
                  />
                </div>
                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    update("password", (event.target as HTMLInputElement).value)
                  }
                  helperText="Required for most roles; leave blank only if your org enforces passwordless auth (IAM/SSO)."
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={onSave} disabled={saving} variant="primary">
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <span className={`text-sm ${saveTone}`}>
                    {saveMsg || ""}
                  </span>
                </div>
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer text-gray-300">
                    Need help with VPC allow-listing or SSL setup?
                  </summary>
                  <p className="mt-2">
                    Our onboarding guide walks through adding Data Vista to your
                    firewall/IP allow-list and providing SSL certificates for encrypted
                    connections.
                  </p>
                  <a
                    href="https://docs.datavista.io/onboarding/networking"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-gray-200 underline"
                  >
                    View networking &amp; security setup docs
                  </a>
                  <p className="mt-2">
                    Still stuck? <a className="underline" href="mailto:support@datavista.io">Contact support</a>
                    for dedicated assistance with private networking and certificates.
                  </p>
                </details>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Connection Test"
              subtitle="Verify connectivity and latency"
            />
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button onClick={onTest} disabled={testing} variant="secondary">
                    {testing ? "Testing..." : "Test"}
                  </Button>
                  <span className={`text-sm ${testTone}`}>
                    {testMsg || ""}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  The test runs "select 1" with a 10s timeout.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </RequireAuth>
  );
}
