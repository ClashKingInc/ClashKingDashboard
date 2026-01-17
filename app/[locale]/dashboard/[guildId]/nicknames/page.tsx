"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, User, Eye, ChevronDown, ChevronRight, Pencil, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api/client";
import { apiCache } from "@/lib/api-cache";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

type Settings = {
  change_nickname: boolean;
  nickname_rule: string;
  non_family_nickname_rule: string;
};

const SAMPLE_VALUES: Record<string, string> = {
  "{discord_name}": "JohnDoe#1234",
  "{discord_display_name}": "John",
  "{player_name}": "Chief John",
  "{player_tag}": "#2PP",
  "{player_townhall}": "16",
  "{player_townhall_small}": "¹⁶",
  "{player_warstars}": "1234",
  "{player_role}": "Leader",
  "{player_clan}": "RCS Clan",
  "{player_league}": "Legend",
  "{player_clan_abbreviation}": "RCS",
};

export default function NicknamesPage() {
  const params = useParams();
  const guildId = params.guildId as string;
  const t = useTranslations("NicknamesPage");
  const tCommon = useTranslations("Common");

  const PLACEHOLDERS = useMemo(
    () => [
      { key: "{discord_name}", desc: t("placeholders.discordName"), example: "JohnDoe#1234" },
      { key: "{discord_display_name}", desc: t("placeholders.discordDisplayName"), example: "John" },
      { key: "{player_name}", desc: t("placeholders.playerName"), example: "Chief John" },
      { key: "{player_tag}", desc: t("placeholders.playerTag"), example: "#2PP" },
      { key: "{player_townhall}", desc: t("placeholders.playerTownhall"), example: "16" },
      { key: "{player_townhall_small}", desc: t("placeholders.playerTownhallSmall"), example: "¹⁶" },
      { key: "{player_warstars}", desc: t("placeholders.playerWarstars"), example: "1234" },
      { key: "{player_role}", desc: t("placeholders.playerRole"), example: "Leader" },
      { key: "{player_clan}", desc: t("placeholders.playerClan"), example: "RCS Clan" },
      { key: "{player_league}", desc: t("placeholders.playerLeague"), example: "Legend" },
      { key: "{player_clan_abbreviation}", desc: t("placeholders.playerClanAbbr"), example: "RCS" },
    ],
    [t]
  );

  const [settings, setSettings] = useState<Settings>({
    change_nickname: true,
    nickname_rule: "[{player_clan_abbreviation}] {player_name}",
    non_family_nickname_rule: "{player_name}",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingFormatting, setIsSavingFormatting] = useState(false);
  const [isSavingAutomatic, setIsSavingAutomatic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const [draftNicknameRule, setDraftNicknameRule] = useState(settings.nickname_rule);
  const [draftNonFamilyRule, setDraftNonFamilyRule] = useState(settings.non_family_nickname_rule);
  const [isFamilyPlaceholdersOpen, setIsFamilyPlaceholdersOpen] = useState(false);
  const [isNonFamilyPlaceholdersOpen, setIsNonFamilyPlaceholdersOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.servers.getSettings(guildId);
        if (!response.data) throw new Error("No data returned");

        setSettings({
          change_nickname: response.data.change_nickname ?? false,
          nickname_rule: response.data.nickname_rule ?? "[{player_clan_abbreviation}] {player_name}",
          non_family_nickname_rule: response.data.non_family_nickname_rule ?? "{player_name}",
        });
        setDraftNicknameRule(response.data.nickname_rule ?? "[{player_clan_abbreviation}] {player_name}");
        setDraftNonFamilyRule(response.data.non_family_nickname_rule ?? "{player_name}");
      } catch (err) {
        setError(tCommon("error"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  const generatePreview = (rule: string) => {
    return Object.keys(SAMPLE_VALUES).reduce((acc, key) => {
      return acc.replace(new RegExp(key, "g"), SAMPLE_VALUES[key]);
    }, rule);
  };

  const handleToggleAutomatic = async (checked: boolean) => {
    setIsSavingAutomatic(true);
    setError(null);
    setSettings((prev) => ({ ...prev, change_nickname: checked }));

    try {
      await apiClient.servers.updateSettings(guildId, { change_nickname: checked });
      await apiCache.invalidate(`settings-${guildId}`);
      toast({
        title: tCommon("success"),
        description: t("automaticChangesSuccess"),
      });
    } catch (err) {
      setError(tCommon("error"));
      setSettings((prev) => ({ ...prev, change_nickname: !checked }));
    } finally {
      setIsSavingAutomatic(false);
    }
  };

  const handleSaveFormatting = async () => {
    setIsSavingFormatting(true);
    setError(null);

    try {
      await apiClient.servers.updateSettings(guildId, {
        nickname_rule: draftNicknameRule,
        non_family_nickname_rule: draftNonFamilyRule,
      });
      await apiCache.invalidate(`settings-${guildId}`);
      setSettings((prev) => ({
        ...prev,
        nickname_rule: draftNicknameRule,
        non_family_nickname_rule: draftNonFamilyRule,
      }));
      setIsEditDialogOpen(false);
      toast({
        title: tCommon("success"),
        description: t("templateChangedSuccess"),
      });
    } catch (err) {
      setError(tCommon("error"));
    } finally {
      setIsSavingFormatting(false);
    }
  };

  const handleCancelEditing = () => {
    setDraftNicknameRule(settings.nickname_rule);
    setDraftNonFamilyRule(settings.non_family_nickname_rule);
    setIsEditDialogOpen(false);
    setError(null);
  };

  const renderPlaceholders = (onSelect: (value: string) => void) => (
    <div className="mt-2 bg-secondary/30 border border-border rounded-lg p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PLACEHOLDERS.map((p) => (
          <div key={p.key} className="flex items-start gap-2">
            <Badge
              variant="secondary"
              className="text-xs font-mono cursor-pointer hover:bg-primary/20"
              onClick={() => onSelect(p.key)}
            >
              {p.key}
            </Badge>
            <span className="text-xs text-muted-foreground">{p.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-4">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-foreground">{t("automaticTitle")}</CardTitle>
                <CardDescription className="text-xs">{t("automaticSubtitle")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">{t("automaticChanges")}</p>
                <p className="text-xs text-muted-foreground">{t("automaticChangesDesc")}</p>
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Skeleton className="h-6 w-11 rounded-full animate-pulse" />
                ) : (
                  <Switch
                    id="change-nicknames"
                    checked={settings.change_nickname}
                    disabled={isSavingAutomatic}
                    onCheckedChange={handleToggleAutomatic}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground">{t("card.title")}</CardTitle>
                  <CardDescription className="text-xs">{t("card.description")}</CardDescription>
                </div>
              </div>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                    onClick={() => {
                      setDraftNicknameRule(settings.nickname_rule);
                      setDraftNonFamilyRule(settings.non_family_nickname_rule);
                      setError(null);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {tCommon("edit")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">{t("card.title")}</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      {t("card.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-3">
                  <Label htmlFor="family-convention" className="text-sm font-medium">
                    {t("familyFormat")}
                  </Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full animate-pulse" />
                  ) : (
                    <Input
                      id="family-convention"
                      value={draftNicknameRule}
                      onChange={(e) => setDraftNicknameRule(e.target.value)}
                      placeholder="[{player_clan_abbreviation}] {player_name}"
                      className="bg-secondary border-border font-mono text-sm"
                    />
                  )}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <p className="text-xs font-medium text-primary">{t("preview")}</p>
                    </div>
                    {isLoading ? (
                      <Skeleton className="h-9 w-full animate-pulse" />
                    ) : (
                      <p className="text-sm font-mono bg-background/50 border border-border rounded px-3 py-2">
                        {generatePreview(draftNicknameRule)}
                      </p>
                    )}
                  </div>
                </div>

                <Collapsible open={isFamilyPlaceholdersOpen} onOpenChange={setIsFamilyPlaceholdersOpen}>
                  <CollapsibleTrigger className="w-full text-left">
                    <div className="px-3 pb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-[#DC2626]">{t("availablePlaceholders")}</p>
                        {isFamilyPlaceholdersOpen ? (
                          <ChevronDown className="h-4 w-4 text-[#DC2626] transition-transform duration-200" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-[#DC2626] transition-transform duration-200" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {renderPlaceholders((value) => setDraftNicknameRule((prev) => prev + value))}
                  </CollapsibleContent>
                </Collapsible>

                <div className="space-y-3">
                  <Label htmlFor="non-family-convention" className="text-sm font-medium">
                    {t("nonFamilyFormat")}
                  </Label>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full animate-pulse" />
                  ) : (
                    <Input
                      id="non-family-convention"
                      value={draftNonFamilyRule}
                      onChange={(e) => setDraftNonFamilyRule(e.target.value)}
                      placeholder="{player_name}"
                      className="bg-secondary border-border font-mono text-sm"
                    />
                  )}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <p className="text-xs font-medium text-primary">{t("preview")}</p>
                    </div>
                    {isLoading ? (
                      <Skeleton className="h-9 w-full animate-pulse" />
                    ) : (
                      <p className="text-sm font-mono bg-background/50 border border-border rounded px-3 py-2">
                        {generatePreview(draftNonFamilyRule)}
                      </p>
                    )}
                  </div>
                </div>

                <Collapsible open={isNonFamilyPlaceholdersOpen} onOpenChange={setIsNonFamilyPlaceholdersOpen}>
                  <CollapsibleTrigger className="w-full text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium text-[#DC2626]">{t("availablePlaceholders")}</p>
                      {isNonFamilyPlaceholdersOpen ? (
                        <ChevronDown className="h-4 w-4 text-[#DC2626] transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#DC2626] transition-transform duration-200" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {renderPlaceholders((value) => setDraftNonFamilyRule((prev) => prev + value))}
                  </CollapsibleContent>
                </Collapsible>

                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={handleCancelEditing}
                      disabled={isSavingFormatting}
                      className="border-border"
                    >
                      {tCommon("cancel")}
                    </Button>
                    <Button
                      onClick={handleSaveFormatting}
                      disabled={isSavingFormatting}
                    >
                      {isSavingFormatting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      {tCommon("save")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t("familyFormat")}</Label>
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm font-mono">
                  {settings.nickname_rule}
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-primary">{t("preview")}</p>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-full animate-pulse" />
                  ) : (
                    <p className="text-sm font-mono bg-background/50 border border-border rounded px-3 py-2">
                      {generatePreview(settings.nickname_rule)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">{t("nonFamilyFormat")}</Label>
                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm font-mono">
                  {settings.non_family_nickname_rule}
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <p className="text-xs font-medium text-primary">{t("preview")}</p>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-full animate-pulse" />
                  ) : (
                    <p className="text-sm font-mono bg-background/50 border border-border rounded px-3 py-2">
                      {generatePreview(settings.non_family_nickname_rule)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
