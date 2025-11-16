"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RefreshCw, Calendar, Trash2, Clock, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Type definitions
interface AutoBoardConfig {
  id: string;
  type: string;
  board_type: string;
  button_id: string;
  webhook_id: string;
  thread_id: string | null;
  channel_id: string | null;
  days: string[] | null;
  locale: string;
  created_at: string | null;
}

interface ServerAutoBoardsResponse {
  autoboards: AutoBoardConfig[];
  total: number;
  post_count: number;
  refresh_count: number;
  limit: number;
}

// Board type definitions
const BOARD_TYPES = {
  // Clan Boards
  clandetailed: "Clan Detailed",
  clanbasic: "Clan Basic",
  clanmini: "Clan Minimalistic",
  clancompo: "Clan Composition",
  clandonos: "Clan Donations",
  clanactivity: "Clan Activity",
  clancapoverview: "Clan Capital Overview",
  clancapdonos: "Clan Capital Donations",
  clancapraids: "Clan Capital Raids",
  clanwarlog: "Clan War Log",
  clancwlperf: "Clan CWL Performance",
  clangames: "Clan Games",

  // Family Boards
  familyoverview: "Family Overview",
  familycompo: "Family Composition",
  familydonos: "Family Donations",
  familygames: "Family Games",
  familyactivity: "Family Activity",

  // Legend Boards
  legendclan: "Legend Clan",
  legendday: "Legend Day",
  legendseason: "Legend Season",

  // Other
  discordlinks: "Discord Links",
};

const DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
  { value: "endofseason", label: "End of Season" },
];

export default function AutoBoardsPage() {
  const params = useParams();
  const guildId = params?.guildId as string;

  const [loading, setLoading] = useState(true);
  const [autoboardsData, setAutoboardsData] = useState<ServerAutoBoardsResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New autoboard form state
  const [newType, setNewType] = useState<"post" | "refresh">("post");
  const [newBoardType, setNewBoardType] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Fetch autoboards
  useEffect(() => {
    const fetchAutoBoards = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/v2/server/${guildId}/autoboards`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch autoboards');
        }

        const data: ServerAutoBoardsResponse = await response.json();
        setAutoboardsData(data);
      } catch (error) {
        console.error('Error fetching autoboards:', error);
      } finally {
        setLoading(false);
      }
    };

    if (guildId) {
      fetchAutoBoards();
    }
  }, [guildId]);

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleCreateAutoBoard = async () => {
    if (!newBoardType) {
      alert('Please select a board type');
      return;
    }

    if (newType === 'post' && selectedDays.length === 0) {
      alert('Please select at least one day for auto-post');
      return;
    }

    setCreating(true);
    try {
      // For demo purposes, using dummy webhook/channel IDs
      // In production, you'd need to fetch these from a channel selector
      const autoboardData = {
        type: newType,
        board_type: newBoardType,
        button_id: `${newBoardType}:${guildId}:page=0`,
        webhook_id: "0", // Placeholder - should be selected from available channels
        channel_id: "0",
        days: newType === 'post' ? selectedDays : null,
        locale: "en-US"
      };

      const response = await fetch(`/api/v2/server/${guildId}/autoboards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(autoboardData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create autoboard');
      }

      // Refresh autoboards list
      const refreshResponse = await fetch(`/api/v2/server/${guildId}/autoboards`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (refreshResponse.ok) {
        const data: ServerAutoBoardsResponse = await refreshResponse.json();
        setAutoboardsData(data);
      }

      setCreateDialogOpen(false);
      setNewBoardType("");
      setSelectedDays([]);
      setNewType("post");
    } catch (error) {
      console.error('Error creating autoboard:', error);
      alert(error instanceof Error ? error.message : 'Failed to create autoboard. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAutoBoard = async (autoboardId: string) => {
    setDeleting(autoboardId);
    try {
      const response = await fetch(`/api/v2/server/${guildId}/autoboards/${autoboardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete autoboard');
      }

      // Refresh autoboards list
      const refreshResponse = await fetch(`/api/v2/server/${guildId}/autoboards`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (refreshResponse.ok) {
        const data: ServerAutoBoardsResponse = await refreshResponse.json();
        setAutoboardsData(data);
      }
    } catch (error) {
      console.error('Error deleting autoboard:', error);
      alert('Failed to delete autoboard. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const getBoardTypeName = (boardType: string): string => {
    return BOARD_TYPES[boardType as keyof typeof BOARD_TYPES] || boardType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">AutoBoards</h1>
          <p className="text-muted-foreground">
            Automatically post and refresh clan, family, and legend boards
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-primary hover:bg-primary/90"
              disabled={autoboardsData ? autoboardsData.total >= autoboardsData.limit : false}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create AutoBoard
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create AutoBoard</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Set up automatic posting or refreshing for a board
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="autoboard-type" className="text-foreground">Automation Type</Label>
                <Select value={newType} onValueChange={(val) => setNewType(val as "post" | "refresh")}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="post">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Auto Post - Scheduled daily posts
                      </div>
                    </SelectItem>
                    <SelectItem value="refresh">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Auto Refresh - Continuous updates (30-60 min)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="board-type" className="text-foreground">Board Type</Label>
                <Select value={newBoardType} onValueChange={setNewBoardType}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Select a board type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-[300px]">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Clan Boards</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('clan'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Family Boards</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('family'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Legend Boards</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => key.startsWith('legend'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Other</div>
                    {Object.entries(BOARD_TYPES)
                      .filter(([key]) => !key.startsWith('clan') && !key.startsWith('family') && !key.startsWith('legend'))
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {newType === 'post' && (
                <div className="space-y-2">
                  <Label className="text-foreground">Post Days (select at least one)</Label>
                  <div className="grid grid-cols-2 gap-3 p-4 border border-border rounded-lg bg-background">
                    {DAYS.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={day.value}
                          checked={selectedDays.includes(day.value)}
                          onCheckedChange={() => handleDayToggle(day.value)}
                        />
                        <label
                          htmlFor={day.value}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer"
                        >
                          {day.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Posts occur at 5:00 AM UTC daily reset time
                  </p>
                </div>
              )}

              {newType === 'refresh' && (
                <div className="p-4 border border-border rounded-lg bg-background/50">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Auto Refresh Info</p>
                      <p className="text-xs text-muted-foreground">
                        The board will automatically refresh every 30-60 minutes with the latest data. Perfect for keeping
                        stats current without manual updates.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAutoBoard}
                disabled={creating || !newBoardType || (newType === 'post' && selectedDays.length === 0)}
                className="bg-primary hover:bg-primary/90"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total AutoBoards</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{autoboardsData?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {autoboardsData?.limit ? `${autoboardsData.total} / ${autoboardsData.limit} used` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Auto Post</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{autoboardsData?.post_count || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled boards</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Auto Refresh</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{autoboardsData?.refresh_count || 0}</div>
            <p className="text-xs text-muted-foreground">Continuous updates</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Available Slots</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {autoboardsData ? autoboardsData.limit - autoboardsData.total : 0}
            </div>
            <p className="text-xs text-muted-foreground">Remaining capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* AutoBoards List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Active AutoBoards</CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your automatic board posting and refreshing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!autoboardsData || autoboardsData.autoboards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No AutoBoards configured</p>
              <p className="text-sm">Create your first AutoBoard to automate board updates</p>
            </div>
          ) : (
            <div className="space-y-3">
              {autoboardsData.autoboards.map((autoboard) => (
                <div
                  key={autoboard.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/50"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {getBoardTypeName(autoboard.board_type)}
                      </h3>
                      <Badge
                        variant={autoboard.type === 'post' ? 'default' : 'secondary'}
                        className={autoboard.type === 'post' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}
                      >
                        {autoboard.type === 'post' ? (
                          <>
                            <Calendar className="w-3 h-3 mr-1" />
                            Auto Post
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Auto Refresh
                          </>
                        )}
                      </Badge>
                    </div>
                    {autoboard.type === 'post' && autoboard.days && autoboard.days.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Posts on: {autoboard.days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}
                      </p>
                    )}
                    {autoboard.type === 'refresh' && (
                      <p className="text-sm text-muted-foreground">
                        Updates every 30-60 minutes
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteAutoBoard(autoboard.id)}
                    disabled={deleting === autoboard.id}
                  >
                    {deleting === autoboard.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
