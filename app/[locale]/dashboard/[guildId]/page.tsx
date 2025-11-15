import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OverviewPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor your ClashKing bot status and quick stats
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Linked Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">245</div>
              <p className="text-xs text-muted-foreground">+12 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">All clans configured</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="bg-green-500">Online</Badge>
              <p className="text-xs text-muted-foreground mt-2">Last restart: 2h ago</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              Get started with configuring your ClashKing bot
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold">Configure General Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Set up nickname conventions, embed colors, and logging channels
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold">Add Your Clans</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Clash of Clans clans and configure roles
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold">Set Up Auto Roles</h3>
                <p className="text-sm text-muted-foreground">
                  Configure automatic role assignment based on Town Hall, trophies, etc.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
