"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, RefreshCw, UserRoundCheck, X } from "lucide-react";
import { ServersHeader } from "@/components/servers-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type CreatorStatus = "pending" | "approved" | "rejected";

interface CreatorApplication {
  user_id: string;
  status: CreatorStatus;
  display_name: string;
  channel_url: string;
  application_note: string;
  review_note: string;
  submitted_at: string;
}

export default function CreatorApplicationsPage() {
  const [status, setStatus] = useState<CreatorStatus>("pending");
  const [items, setItems] = useState<CreatorApplication[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Sign in with an administrator account to review creators.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`/api/v2/admin/stats/creator-applications?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || "Could not load creator applications");
      setItems(data.items || []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load creator applications");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => void load(), [load]);

  async function review(item: CreatorApplication, nextStatus: "approved" | "rejected") {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setSaving(item.user_id);
    try {
      const response = await fetch(`/api/v2/admin/stats/creator-applications/${encodeURIComponent(item.user_id)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, review_note: notes[item.user_id] || "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || "Could not review creator");
      setItems((current) => current.filter((candidate) => candidate.user_id !== item.user_id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not review creator");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ServersHeader />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-24 sm:pt-28">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <UserRoundCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Creator applications</h1>
            <p className="mt-2 text-muted-foreground">Approve channels that can attach localized YouTube guides to curated army presets.</p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="mb-6 flex gap-2">
          {(["pending", "approved", "rejected"] as const).map((value) => (
            <Button key={value} variant={status === value ? "default" : "outline"} onClick={() => setStatus(value)} className="capitalize">
              {value}
            </Button>
          ))}
        </div>

        {error && <Card className="mb-5 border-destructive/50"><CardContent className="pt-6 text-destructive">{error}</CardContent></Card>}
        {!loading && !error && items.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No {status} creator applications.</CardContent></Card>
        )}

        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.user_id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{item.display_name}</CardTitle>
                    <CardDescription>Submitted {new Date(item.submitted_at).toLocaleString()}</CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">{item.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <a href={item.channel_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-medium text-primary hover:underline">
                  Open YouTube channel <ExternalLink className="h-4 w-4" />
                </a>
                {item.application_note && <p className="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm">{item.application_note}</p>}
                {status === "pending" && (
                  <>
                    <Textarea
                      placeholder="Optional review note"
                      value={notes[item.user_id] || ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.user_id]: event.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => review(item, "approved")} disabled={saving === item.user_id}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button variant="destructive" onClick={() => review(item, "rejected")} disabled={saving === item.user_id}>
                        <X className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </>
                )}
                {status !== "pending" && item.review_note && <p className="text-sm text-muted-foreground">Review note: {item.review_note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
