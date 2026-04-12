"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Home, LogOut, Server } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserInfo } from "@/lib/api/types/auth";
import { logout } from "@/lib/auth/logout";
import { useTranslations } from "next-intl";

interface MobileServerDropdownProps {
  readonly locale: string;
  readonly guildName: string;
  readonly guildIcon?: string;
  readonly isLoading?: boolean;
}

export function MobileServerDropdown({
  locale,
  guildName,
  guildIcon,
  isLoading = false,
}: MobileServerDropdownProps) {
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    router.push(`/${locale}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left outline-none hover:bg-accent/50">
          <Avatar className="h-8 w-8 rounded-md border border-border">
            <AvatarImage src={guildIcon} className="rounded-md" />
            <AvatarFallback className="rounded-md text-sm font-bold bg-secondary text-primary">
              {guildName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-semibold text-foreground">{guildName}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isDropdownOpen && "rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-56 bg-popover/95 backdrop-blur-md border-primary/30 shadow-2xl">
        <DropdownMenuItem asChild className="focus:bg-muted/60 focus:text-primary hover:bg-muted/60 hover:text-primary transition-colors cursor-pointer">
          <Link href="/servers" className="flex items-center gap-2 py-2">
            <Server className="h-4 w-4" />
            <span className="font-medium">{t("switchServer")}</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="focus:bg-muted/60 focus:text-primary hover:bg-muted/60 hover:text-primary transition-colors cursor-pointer">
          <Link href={`/${locale}`} className="flex items-center gap-2 py-2">
            <Home className="h-4 w-4" />
            <span className="font-medium">{t("goHome")}</span>
          </Link>
        </DropdownMenuItem>

        {user && (
          <div className="flex items-center justify-between p-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={user.avatar_url} alt={user.username} />
                <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium text-foreground">
                {user.username}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-muted-foreground hover:bg-muted/60 hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
