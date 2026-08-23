"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, Clock3, RefreshCw, Shield, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiUrl } from "@/lib/api/fetch";
import { townHallImageUrl } from "@/lib/theme";

interface SharedRosterMember {
  playerTag: string;
  name: string;
  townhall: number;
  currentClanName?: string;
  currentClanTag?: string;
}

interface SharedRoster {
  id: string;
  name: string;
  description?: string;
  clanName?: string;
  clanTag?: string;
  clanBadgeUrl?: string;
  updatedAt: string;
  members: SharedRosterMember[];
}

function shareId(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("view") ?? "";
}

export default function SharedRosterPage() {
  const [roster, setRoster] = useState<SharedRoster>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    const id = shareId();
    if (!id) {
      setError("This roster link is incomplete.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(apiUrl(`/v2/public/rosters/${encodeURIComponent(id)}`));
      if (!response.ok) {
        throw new Error(response.status === 404 ? "This roster is no longer available." : "The roster could not be loaded.");
      }
      setRoster((await response.json()) as SharedRoster);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The roster could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.12),_transparent_34rem)] bg-background px-4 py-8 text-foreground md:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logos/bot-app-logo.png" alt="ClashKing" width={44} height={44} className="rounded-xl" />
            <div>
              <p className="font-semibold tracking-tight">ClashKing</p>
              <p className="text-xs text-muted-foreground">Shared roster</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Read only</Badge>
        </header>

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        )}

        {!loading && error && (
          <Card className="mx-auto max-w-xl">
            <CardContent className="flex flex-col items-center px-8 py-14 text-center">
              <AlertCircle className="h-9 w-9 text-destructive" />
              <h1 className="mt-4 text-xl font-semibold">Roster unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" className="mt-5 gap-2" onClick={() => void load()}>
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && roster && (
          <div className="space-y-5">
            <Card className="overflow-hidden border-primary/20 bg-card/90 shadow-xl shadow-black/5 backdrop-blur">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  {roster.clanBadgeUrl ? (
                    <Image src={roster.clanBadgeUrl} alt="" width={72} height={72} className="h-16 w-16 object-contain" unoptimized />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                      <Users className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">{roster.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[roster.clanName, roster.clanTag].filter(Boolean).join(" · ") || "Family roster"}
                    </p>
                    {roster.description && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{roster.description}</p>}
                  </div>
                  <div className="flex gap-2 sm:flex-col sm:items-end">
                    <Badge className="gap-1.5"><Users className="h-3.5 w-3.5" /> {roster.members.length} players</Badge>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> Updated {new Date(roster.updatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden bg-card/90 shadow-xl shadow-black/5 backdrop-blur">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead>Town Hall</TableHead>
                      <TableHead>Current clan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.members.map((member, index) => (
                      <TableRow key={`${member.playerTag}-${index}`}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <p className="font-medium">{member.name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{member.playerTag}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Image src={townHallImageUrl(member.townhall)} alt="" width={30} height={30} unoptimized />
                            <span>TH{member.townhall}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p>{member.currentClanName ?? "No clan"}</p>
                          {member.currentClanTag && <p className="font-mono text-xs text-muted-foreground">{member.currentClanTag}</p>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
