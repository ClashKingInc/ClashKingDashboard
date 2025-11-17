"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Plus,
  Trash2,
  Settings,
  Loader2,
  AlertCircle,
  Save,
  Users,
  Trophy,
  Hammer,
  Award,
  Clock,
  Crown,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api/client";
import type {
  RoleType,
  DiscordRole,
  TownhallRole,
  LeagueRole,
  BuilderHallRole,
  StatusRole,
  FamilyPositionRole,
  RoleSettings,
} from "@/lib/api/types/roles";
import { LetterCaseUppercaseIcon } from "@radix-ui/react-icons";

const ROLE_TYPES: Array<{ value: RoleType; label: string; icon: any }> = [
  { value: "townhall", label: "Town Hall", icon: Users },
  { value: "league", label: "League", icon: Trophy },
  { value: "builderhall", label: "Builder Hall", icon: Hammer },
  { value: "status", label: "Status/Tenure", icon: Clock },
  { value: "family_position", label: "Family Position", icon: Crown },
];

const LEAGUES = [
  "Legend League",
  "Titan League I",
  "Titan League II",
  "Titan League III",
  "Champion League I",
  "Champion League II",
  "Champion League III",
  "Master League I",
  "Master League II",
  "Master League III",
];

const FAMILY_POSITIONS = [
  { value: "family_elder_roles", label: "Elder" },
  { value: "family_co-leader_roles", label: "Co-Leader" },
  { value: "family_leader_roles", label: "Leader" },
];

export default function RolesPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([]);
  const [roleSettings, setRoleSettings] = useState<RoleSettings>({
    server_id: guildId,
    auto_eval_status: false,
    auto_eval_nickname: false,
    autoeval_triggers: [],
    autoeval_log: undefined,
    blacklisted_roles: [],
    role_treatment: [],
  });

  const [allRoles, setAllRoles] = useState<any>({
    townhall: [],
    league: [],
    builderhall: [],
    builder_league: [],
    achievement: [],
    status: [],
    family_position: [],
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentRoleType, setCurrentRoleType] = useState<RoleType>("townhall");
  const [newRole, setNewRole] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [guildId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [rolesRes, settingsRes, discordRolesRes] = await Promise.all([
        apiClient.roles.getAllRoles(guildId),
        apiClient.roles.getRoleSettings(guildId),
        apiClient.roles.getDiscordRoles(guildId),
      ]);

      if (rolesRes.data) {
        // Normalize role data from API
        // CRITICAL: Convert all Discord IDs to strings immediately to prevent precision loss
        // Discord Snowflake IDs are 64-bit integers that get rounded when stored as JS numbers
        const normalizedRoles = {
          townhall: rolesRes.data.roles.townhall?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
            th: typeof r.th === 'string' ? parseInt(r.th.replace(/^th/i, '')) : r.th,
          })) || [],
          league: rolesRes.data.roles.league?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
          builderhall: rolesRes.data.roles.builderhall?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
          builder_league: rolesRes.data.roles.builder_league?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
          achievement: rolesRes.data.roles.achievement?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
          status: rolesRes.data.roles.status?.map((r: any) => ({
            ...r,
            id: String(r.role || r.id),
          })) || [],
          family_position: rolesRes.data.roles.family_position?.map((r: any) => ({
            ...r,
            role_id: String(r.role || r.role_id),
          })) || [],
        };
        setAllRoles(normalizedRoles);
      }

      if (settingsRes.data) {
        setRoleSettings(settingsRes.data);
      }

      if (discordRolesRes.data) {
        setDiscordRoles(discordRolesRes.data.roles);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load roles");
      console.error("Failed to load roles:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      await apiClient.roles.updateRoleSettings(guildId, {
        auto_eval_status: roleSettings.auto_eval_status,
        auto_eval_nickname: roleSettings.auto_eval_nickname,
        autoeval_triggers: roleSettings.autoeval_triggers,
        autoeval_log: roleSettings.autoeval_log,
        blacklisted_roles: roleSettings.blacklisted_roles,
        role_treatment: roleSettings.role_treatment,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRole = async () => {
    try {
      setError(null);

      // Transform data to match backend format
      let roleData = { ...newRole };

      // For townhall roles, convert th: 17 → th: "th17"
      if (currentRoleType === "townhall" && typeof roleData.th === "number") {
        roleData.th = `th${roleData.th}`;
      }

      // For builderhall roles, convert bh: 9 → bh: "bh9"
      if (currentRoleType === "builderhall" && typeof roleData.bh === "number") {
        roleData.bh = `bh${roleData.bh}`;
      }

      await apiClient.roles.createRole(guildId, currentRoleType, roleData);

      await loadData();
      setIsAddDialogOpen(false);
      setNewRole({});
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add role");
    }
  };

  const handleDeleteRole = async (roleType: RoleType, roleId: string | number) => {
    try {
      setError(null);

      await apiClient.roles.deleteRole(guildId, roleType, roleId);

      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete role");
    }
  };

  const renderRoleForm = () => {
    switch (currentRoleType) {
      case "townhall":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="role">Discord Role</Label>
              <Select
                value={newRole.role_id?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {discordRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="th">Town Hall Level</Label>
              <Select
                value={newRole.th?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, th: parseInt(value) })}
              >
                <SelectTrigger id="th">
                  <SelectValue placeholder="Select TH level" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 17 }, (_, i) => i + 1).map((th) => (
                    <SelectItem key={th} value={th.toString()}>
                      TH {th}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "league":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="role">Discord Role</Label>
              <Select
                value={newRole.role_id?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {discordRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="league">League</Label>
              <Select
                value={newRole.league}
                onValueChange={(value) => setNewRole({ ...newRole, league: value })}
              >
                <SelectTrigger id="league">
                  <SelectValue placeholder="Select league" />
                </SelectTrigger>
                <SelectContent>
                  {LEAGUES.map((league) => (
                    <SelectItem key={league} value={league}>
                      {league}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "builderhall":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="role">Discord Role</Label>
              <Select
                value={newRole.role_id?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {discordRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bh">Builder Hall Level</Label>
              <Select
                value={newRole.bh?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, bh: parseInt(value) })}
              >
                <SelectTrigger id="bh">
                  <SelectValue placeholder="Select BH level" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((bh) => (
                    <SelectItem key={bh} value={bh.toString()}>
                      BH {bh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "status":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="role">Discord Role</Label>
              <Select
                value={newRole.id?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, id: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {discordRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="months">Months in Server</Label>
              <Input
                id="months"
                type="number"
                min="1"
                value={newRole.months || ""}
                onChange={(e) => setNewRole({ ...newRole, months: parseInt(e.target.value) })}
                placeholder="6"
              />
            </div>
          </>
        );

      case "family_position":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="role">Discord Role</Label>
              <Select
                value={newRole.role_id?.toString()}
                onValueChange={(value) => setNewRole({ ...newRole, role_id: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {discordRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Family Position</Label>
              <Select
                value={newRole.type}
                onValueChange={(value) => setNewRole({ ...newRole, type: value })}
              >
                <SelectTrigger id="position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {FAMILY_POSITIONS.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const renderRolesList = (roleType: RoleType) => {
    const roles = allRoles[roleType] || [];

    if (roles.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>No {roleType.replace("_", " ")} roles configured</p>
          <p className="text-sm mt-2">Click "Add Role" to create one</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Discord Role</TableHead>
            <TableHead>Criteria</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role: any, index: number) => {
            // Get the role ID from either role_id or id field (already converted to string in loadData)
            const roleId = role.role_id || role.id;

            // Find matching Discord role by comparing string IDs
            const discordRole = discordRoles.find((r) => r.id === roleId);

            let criteria = "";

            switch (roleType) {
              case "townhall":
                criteria = role.th
                  ? ["TH", role.th.toString().toUpperCase().replace(/^TH\s*/, "").replace(/^TH/, "").trim()]
                    .filter(Boolean)
                    .join(" ")
                  : "";
                break;
              case "league":
                criteria = role.league;
                break;
              case "builderhall":
                criteria = `BH ${role.bh}`;
                break;
              case "status":
                criteria = `${role.months} month${role.months > 1 ? "s" : ""}`;
                break;
              case "family_position":
                criteria = FAMILY_POSITIONS.find((p) => p.value === role.type)?.label || role.type;
                break;
            }

            return (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: discordRole && discordRole.color !== 0
                          ? `#${discordRole.color.toString(16).padStart(6, "0")}`
                          : "#99AAB5" // Discord default role color (grey)
                      }}
                    />
                    <span>{discordRole?.name || "Unknown Role"}</span>
                  </div>
                </TableCell>
                <TableCell>{criteria}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRole(roleType, role.role_id || role.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate statistics
  const totalRoles = Object.values(allRoles).reduce((sum, roles) => sum + roles.length, 0);
  const activeRoleTypes = Object.entries(allRoles).filter(([_, roles]) => roles.length > 0).length;
  const totalRoleTypes = 7; // townhall, league, builderhall, builder_league, achievement, status, family_position

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10">
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Role Management</h1>
            <p className="text-muted-foreground mt-1">
              Configure automatic role assignment based on player stats
            </p>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-purple-500/30 bg-purple-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-purple-500">{totalRoles}</div>
                <Shield className="h-8 w-8 text-purple-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Configured role assignments
              </p>
            </CardContent>
          </Card>

          <Card className={`bg-card ${roleSettings.auto_eval_status ? 'border-green-500/30 bg-green-500/5' : 'border-gray-500/30 bg-gray-500/5'}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auto-Evaluation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className={`text-3xl font-bold ${roleSettings.auto_eval_status ? 'text-green-500' : 'text-gray-500'}`}>
                  {roleSettings.auto_eval_status ? 'ON' : 'OFF'}
                </div>
                <Settings className={`h-8 w-8 ${roleSettings.auto_eval_status ? 'text-green-500/50' : 'text-gray-500/50'}`} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {roleSettings.auto_eval_status ? 'Automatically assigning roles' : 'Manual role assignment only'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-500">{activeRoleTypes}/{totalRoleTypes}</div>
                <Trophy className="h-8 w-8 text-blue-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Role types in use
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-orange-500/30 bg-orange-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Discord Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-orange-500">{discordRoles.length}</div>
                <Users className="h-8 w-8 text-orange-500/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Available on server
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Error/Success Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-500/30 bg-green-500/5">
            <AlertCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600">Changes saved successfully!</AlertDescription>
          </Alert>
        )}

        {/* Auto-Eval Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Auto-Evaluation Settings
                </CardTitle>
                <CardDescription>
                  Configure automatic role evaluation and assignment
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-eval">Enable Auto-Evaluation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically assign and remove roles based on player stats
                </p>
              </div>
              <Switch
                id="auto-eval"
                checked={roleSettings.auto_eval_status}
                onCheckedChange={(checked) =>
                  setRoleSettings({ ...roleSettings, auto_eval_status: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="auto-nickname">Auto-Update Nicknames</Label>
                <p className="text-sm text-muted-foreground">
                  Update nicknames when roles are evaluated
                </p>
              </div>
              <Switch
                id="auto-nickname"
                checked={roleSettings.auto_eval_nickname}
                onCheckedChange={(checked) =>
                  setRoleSettings({ ...roleSettings, auto_eval_nickname: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Role Types Tabs */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Configured Roles</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Role</DialogTitle>
                    <DialogDescription>
                      Configure a new automatic role assignment rule
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-type">Role Type</Label>
                      <Select
                        value={currentRoleType}
                        onValueChange={(value) => {
                          setCurrentRoleType(value as RoleType);
                          setNewRole({});
                        }}
                      >
                        <SelectTrigger id="role-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {renderRoleForm()}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={handleAddRole}
                      disabled={!newRole.role_id && !newRole.id}
                    >
                      Add Role
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="townhall" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                {ROLE_TYPES.map((type) => (
                  <TabsTrigger key={type.value} value={type.value}>
                    <type.icon className="mr-2 h-4 w-4" />
                    {type.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {ROLE_TYPES.map((type) => (
                <TabsContent key={type.value} value={type.value} className="mt-6">
                  {renderRolesList(type.value)}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-blue-400">💡 How Auto-Roles Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-300">
            <p>
              <strong>Automatic Evaluation:</strong> When enabled, the bot will periodically check players and assign/remove roles based on their current stats.
            </p>
            <p>
              <strong>Role Priority:</strong> If multiple roles match a player's stats, the highest level role will be assigned.
            </p>
            <p>
              <strong>Manual Override:</strong> Server admins can manually assign roles, which will not be removed by auto-evaluation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
