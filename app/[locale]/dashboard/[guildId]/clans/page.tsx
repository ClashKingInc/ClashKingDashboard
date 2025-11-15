"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Users } from "lucide-react";

// Mock data
const clans = [
  {
    tag: "#CLAN123",
    name: "Elite Warriors",
    badge: "https://api-assets.clashofclans.com/badges/70/xxxx.png",
    level: 15,
    memberCount: 48,
    isConfigured: true,
  },
  {
    tag: "#CLAN456",
    name: "Training Ground",
    badge: "https://api-assets.clashofclans.com/badges/70/yyyy.png",
    level: 12,
    memberCount: 42,
    isConfigured: true,
  },
  {
    tag: "#CLAN789",
    name: "War Masters",
    badge: "https://api-assets.clashofclans.com/badges/70/zzzz.png",
    level: 18,
    memberCount: 50,
    isConfigured: false,
  },
];

export default function ClansPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clan Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your Clash of Clans clans and their Discord integration
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Clan
          </Button>
        </div>

        {/* Clans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clans.map((clan) => (
            <Card key={clan.tag} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={clan.badge} />
                      <AvatarFallback>{clan.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{clan.name}</CardTitle>
                      <CardDescription>{clan.tag}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level</span>
                  <Badge variant="secondary">{clan.level}</Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Members</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{clan.memberCount}/50</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={clan.isConfigured ? "default" : "secondary"}
                    className={clan.isConfigured ? "bg-green-500" : ""}
                  >
                    {clan.isConfigured ? "Configured" : "Setup Required"}
                  </Badge>
                </div>

                <Button variant="outline" className="w-full mt-4">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Card */}
        <Card className="mt-8 border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/20">
          <CardHeader>
            <CardTitle className="text-indigo-900 dark:text-indigo-300">
              📚 Clan Configuration Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-indigo-800 dark:text-indigo-400 space-y-2">
            <p>
              <strong>Step 1:</strong> Click &ldquo;Add Clan&rdquo; and enter your clan tag
            </p>
            <p>
              <strong>Step 2:</strong> Configure member roles, leadership roles, and clan channel
            </p>
            <p>
              <strong>Step 3:</strong> Set up logs for join/leave, donations, wars, and more
            </p>
            <p>
              <strong>Step 4:</strong> Enable auto-greet messages and nickname management
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
