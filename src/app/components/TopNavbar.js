// src/app/components/TopNavbar.jsx
"use client";

import { useCallback } from "react";
import { ChevronDown, User, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      router.push("/login"); // Redirect ke login setelah logout
    } catch (err) {
      console.error("Logout error:", err.message);
    }
  }, [logout, router]);

  // Fallback data display
  const userRole = user?.profile?.role || "Operator";
  const userEmail = user?.email || "";
  // Ambil nama dari profile, atau ambil bagian depan email jika nama kosong
  const userName = user?.profile?.name || userEmail.split("@")[0] || "User";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Section: Brand & Region */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-primary tracking-tight">
            e-PlanDISDIK
          </h1>
          <div className="hidden md:block w-px h-6 bg-border" />
          <span className="hidden md:inline-block text-sm text-muted-foreground font-medium">
            Kab. Garut
          </span>
        </div>

        {/* Right Section: User Profile */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-8 w-8 border border-border/50">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {/* Tampilkan Inisial Nama (Lebih personal daripada icon User biasa) */}
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="hidden md:flex flex-col items-start text-xs">
                  <span className="font-semibold text-foreground/80">
                    {userName}
                  </span>
                  <span className="text-muted-foreground capitalize">
                    {userRole}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 rounded-xl p-2 shadow-md border-border/50"
            >
              {/* Header Info User */}
              <DropdownMenuLabel className="font-normal p-3 bg-muted/40 rounded-lg mb-1">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {userName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg py-2.5"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
