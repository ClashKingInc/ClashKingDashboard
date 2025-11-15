"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Gift,
  Swords,
  Castle,
  Trophy,
  TrendingUp,
  Webhook,
  Hash,
  Save,
  RotateCcw,
  Bell,
  CheckCircle2,
  XCircle
} from "lucide-react";

// Mock data for Discord channels
const mockChannels = [
  { id: "1", name: "general" },
  { id: "2", name: "clan-logs" },
  { id: "3", name: "war-logs" },
  { id: "4", name: "donation-logs" },
  { id: "5", name: "activity-logs" },
  { id: "6", name: "legend-logs" },
];

interface LogConfig {
  enabled: boolean;
  type: "webhook" | "channel";
  webhookUrl: string;
  channelId: string;
}

interface LogsSettings {
  joinLeave: LogConfig;
  donations: LogConfig;
  wars: LogConfig;
  capital: LogConfig;
  legends: LogConfig;
  upgrades: LogConfig;
}

const defaultLogConfig: LogConfig = {
  enabled: false,
  type: "channel",
  webhookUrl: "",
  channelId: "",
};

const logTypes = [
  {
    key: "joinLeave" as const,
    title: "Join/Leave Logs",
    description: "Track when members join or leave the clan",
    icon: Users,
    color: "bg-blue-500",
    stats: { today: 5, total: 234 },
  },
  {
    key: "donations" as const,
    title: "Donation Logs",
    description: "Monitor troop and spell donations",
    icon: Gift,
    color: "bg-green-500",
    stats: { today: 142, total: 8923 },
  },
  {
    key: "wars" as const,
    title: "War Logs",
    description: "Track war attacks and results",
    icon: Swords,
    color: "bg-red-500",
    stats: { today: 8, total: 456 },
  },
  {
    key: "capital" as const,
    title: "Capital Logs",
    description: "Monitor clan capital contributions and raids",
    icon: Castle,
    color: "bg-purple-500",
    stats: { today: 23, total: 1567 },
  },
  {
    key: "legends" as const,
    title: "Legend Logs",
    description: "Track Legend League attacks and trophies",
    icon: Trophy,
    color: "bg-yellow-500",
    stats: { today: 12, total: 890 },
  },
  {
    key: "upgrades" as const,
    title: "Upgrade Logs",
    description: "Monitor building and troop upgrades",
    icon: TrendingUp,
    color: "bg-orange-500",
    stats: { today: 34, total: 2341 },
  },
];

export default function LogsPage() {
  const [settings, setSettings] = useState<LogsSettings>({
    joinLeave: { ...defaultLogConfig },
    donations: { ...defaultLogConfig },
    wars: { ...defaultLogConfig },
    capital: { ...defaultLogConfig },
    legends: { ...defaultLogConfig },
    upgrades: { ...defaultLogConfig },
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const updateLogConfig = (key: keyof LogsSettings, updates: Partial<LogConfig>) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    // In real implementation, this would save to API
    console.log("Saving settings:", settings);
    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    setSettings({
      joinLeave: { ...defaultLogConfig },
      donations: { ...defaultLogConfig },
      wars: { ...defaultLogConfig },
      capital: { ...defaultLogConfig },
      legends: { ...defaultLogConfig },
      upgrades: { ...defaultLogConfig },
    });
    setHasUnsavedChanges(false);
  };

  const enabledCount = Object.values(settings).filter(config => config.enabled).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logging Configuration</h1>
            <p className="text-muted-foreground mt-1">
              Configure webhooks and channels for different activity logs
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasUnsavedChanges}
              className="border-border"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Logs</p>
                  <p className="text-3xl font-bold text-foreground">{enabledCount}/6</p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Events Today</p>
                  <p className="text-3xl font-bold text-foreground">
                    {logTypes.reduce((sum, log) => sum + (settings[log.key].enabled ? log.stats.today : 0), 0)}
                  </p>
                </div>
                <div className="rounded-full bg-green-500/10 p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-3xl font-bold text-foreground">
                    {logTypes.reduce((sum, log) => sum + (settings[log.key].enabled ? log.stats.total : 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-full bg-blue-500/10 p-3">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <Card className="bg-amber-500/10 border-amber-500/50">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-amber-500/20 p-1">
                  <Bell className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleSave}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Save Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Log Configuration Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {logTypes.map((logType) => {
            const config = settings[logType.key];
            const Icon = logType.icon;

            return (
              <Card
                key={logType.key}
                className={`bg-card border-border transition-all duration-200 ${
                  config.enabled ? "ring-2 ring-primary/20" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg ${logType.color} p-2.5`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-foreground">
                          {logType.title}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground text-sm">
                          {logType.description}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) =>
                        updateLogConfig(logType.key, { enabled: checked })
                      }
                    />
                  </div>
                </CardHeader>

                {config.enabled && (
                  <>
                    <Separator className="bg-border" />
                    <CardContent className="pt-6 space-y-4">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">Today</div>
                          <div className="text-xl font-bold text-foreground">{logType.stats.today}</div>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                          <div className="text-xs text-muted-foreground mb-1">Total</div>
                          <div className="text-xl font-bold text-foreground">
                            {logType.stats.total.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Delivery Type Selection */}
                      <Tabs
                        value={config.type}
                        onValueChange={(value) =>
                          updateLogConfig(logType.key, { type: value as "webhook" | "channel" })
                        }
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2 bg-secondary">
                          <TabsTrigger value="channel" className="data-[state=active]:bg-primary">
                            <Hash className="h-4 w-4 mr-2" />
                            Channel
                          </TabsTrigger>
                          <TabsTrigger value="webhook" className="data-[state=active]:bg-primary">
                            <Webhook className="h-4 w-4 mr-2" />
                            Webhook
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="channel" className="mt-4 space-y-2">
                          <Label htmlFor={`${logType.key}-channel`}>Select Channel</Label>
                          <Select
                            value={config.channelId}
                            onValueChange={(value) =>
                              updateLogConfig(logType.key, { channelId: value })
                            }
                          >
                            <SelectTrigger
                              id={`${logType.key}-channel`}
                              className="bg-secondary border-border"
                            >
                              <SelectValue placeholder="Select a channel" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockChannels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  #{channel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Logs will be sent to the selected channel
                          </p>
                        </TabsContent>

                        <TabsContent value="webhook" className="mt-4 space-y-2">
                          <Label htmlFor={`${logType.key}-webhook`}>Webhook URL</Label>
                          <Input
                            id={`${logType.key}-webhook`}
                            type="url"
                            placeholder="https://discord.com/api/webhooks/..."
                            value={config.webhookUrl}
                            onChange={(e) =>
                              updateLogConfig(logType.key, { webhookUrl: e.target.value })
                            }
                            className="bg-secondary border-border font-mono text-xs"
                          />
                          <p className="text-xs text-muted-foreground">
                            Logs will be sent to the provided webhook
                          </p>
                        </TabsContent>
                      </Tabs>

                      {/* Configuration Status */}
                      <div className="flex items-center gap-2 pt-2">
                        {(config.type === "channel" && config.channelId) ||
                        (config.type === "webhook" && config.webhookUrl) ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Configured
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-amber-500" />
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              Configuration required
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </>
                )}

                {!config.enabled && (
                  <CardContent className="pt-0">
                    <div className="bg-secondary/30 border border-dashed border-border rounded-lg p-6 text-center">
                      <XCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Enable this log type to configure it
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Bell className="h-5 w-5" />
              About Logging
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Channels:</strong> Logs will be posted directly to the selected Discord channel. The bot needs permission to send messages in that channel.
            </p>
            <p>
              <strong className="text-foreground">Webhooks:</strong> Logs will be sent via webhook, allowing for custom names and avatars. Create a webhook in your Discord channel settings.
            </p>
            <p>
              <strong className="text-foreground">Real-time:</strong> All logs are processed in real-time as events occur in Clash of Clans.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
