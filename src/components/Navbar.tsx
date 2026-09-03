"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useSpoke } from "@/context/SpokeContext";
import { useTheme } from "next-themes";
import { Role } from "@prisma/client";
import { hasClientAccess, hasAdminAccess } from "@/lib/rbac";
import {
  FileText,
  ClipboardList,
  ShieldAlert,
  LayoutDashboard,
  Calendar,
  Sun,
  Moon,
  Clock,
  Wrench,
  Users,
  MapPin,
  LogOut,
  User as UserIcon,
  Search,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { spokeId, setSpokeId, spokes } = useSpoke();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [brandSettings, setBrandSettings] = useState<{
    companyName: string;
    logoUrl?: string | null;
    themeColor: string;
  }>({
    companyName: "MJS Surveys",
    logoUrl: null,
    themeColor: "#0f172a",
  });

  useEffect(() => {
    setMounted(true);
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setBrandSettings({
            companyName: data.companyName || "MJS Surveys",
            logoUrl: data.logoUrl || null,
            themeColor: data.themeColor || "#0f172a",
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isAuthenticated = status === "authenticated" && !!session;
  const userRole = session?.user?.role;

  const navLinks = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, show: true },
    { name: "Schedule", href: "/schedule", icon: Calendar, show: true },
    { name: "Routing Map", href: "/map", icon: MapPin, show: true },
    { name: "Quotes", href: "/quotes", icon: FileText, show: hasClientAccess(userRole) },
    { name: "Orders", href: "/orders", icon: ClipboardList, show: true },
    { name: "Clients", href: "/clients", icon: Users, show: hasClientAccess(userRole) },
    { name: "Quote Reports", href: "/quotes/reports", icon: BarChart3, show: hasClientAccess(userRole) },
    { name: "Order Reports", href: "/orders/reports", icon: ClipboardCheck, show: true },
    { name: "Timesheets", href: "/timesheets", icon: Clock, show: true },
    { name: "Assets", href: "/assets", icon: Wrench, show: true },
    {
      name: "Admin",
      href: "/admin",
      icon: ShieldAlert,
      show: hasAdminAccess(userRole),
    },
  ];

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <header className="bg-slate-900 dark:bg-slate-950 text-white shadow-md border-b border-slate-800 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-2.5 font-bold text-xl tracking-tight text-white hover:text-blue-400 transition-colors"
            >
              {brandSettings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brandSettings.logoUrl}
                  alt={brandSettings.companyName}
                  className="h-8 max-w-[120px] object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm font-black text-base"
                  style={{ backgroundColor: brandSettings.themeColor || "#2563eb" }}
                >
                  {(brandSettings.companyName || "M").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="truncate max-w-[200px]">{brandSettings.companyName}</span>
            </Link>

            {/* Navigation links - rendered only if authenticated */}
            {isAuthenticated && (
              <nav className="hidden lg:flex ml-6 space-x-1">
                {navLinks
                  .filter((link) => link.show)
                  .map((link) => {
                    const Icon = link.icon;
                    const isActive =
                      link.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(link.href);
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-slate-800 dark:bg-slate-800 text-blue-400 border border-slate-700 shadow-sm"
                            : "text-slate-300 hover:bg-slate-800/60 dark:hover:bg-slate-900/60 hover:text-white"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{link.name}</span>
                      </Link>
                    );
                  })}
              </nav>
            )}
          </div>

          {/* Right Controls: Search, Spoke Branch Selector, User Display / Sign Out & Dark Mode Toggle */}
          <div className="flex items-center space-x-2.5">
            {isAuthenticated && (
              <>
                {/* Global Search Bar */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative hidden md:block"
                >
                  <input
                    type="text"
                    placeholder="Search CRM..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-36 lg:w-52 pl-8 pr-3 py-1 bg-slate-800/90 dark:bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:w-60 transition-all"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                </form>

                {/* Spoke Branch Selector */}
                <div className="flex items-center space-x-1.5 bg-slate-800/90 dark:bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <label
                    htmlFor="spoke-select"
                    className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline-block"
                  >
                    Branch:
                  </label>
                  <select
                    id="spoke-select"
                    value={spokeId}
                    onChange={(e) => setSpokeId(e.target.value)}
                    className="bg-slate-900 dark:bg-slate-950 border border-slate-600 text-emerald-300 text-xs font-semibold rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">All Branches (Global)</option>
                    {spokes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.shortName} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Logged in User Name & Role */}
                <div className="flex items-center space-x-2 bg-slate-800/90 dark:bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs shadow-sm">
                  <UserIcon className="w-3.5 h-3.5 text-blue-400" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1.5">
                    <span className="font-medium text-slate-200 truncate max-w-[120px] sm:max-w-[160px]">
                      {session.user.name || session.user.email}
                    </span>
                    {session.user.role && (
                      <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/60 hidden md:inline-block">
                        {session.user.role.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 border border-red-800/60 text-xs font-medium transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            >
              {mounted ? (
                resolvedTheme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-300" />
                )
              ) : (
                <span className="w-4 h-4 inline-block" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar & Navigation Links */}
        {isAuthenticated && (
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearchSubmit} className="relative mb-2">
              <input
                type="text"
                placeholder="Search CRM (Clients, Quotes, Orders)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800/90 dark:bg-slate-900 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </form>
          </div>
        )}

        {/* Mobile Navigation Links */}
        {isAuthenticated && (
          <div className="lg:hidden flex space-x-1 pb-3 overflow-x-auto">
            {navLinks
              .filter((link) => link.show)
              .map((link) => {
                const Icon = link.icon;
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                      isActive
                        ? "bg-slate-800 text-blue-400 border border-slate-700"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
          </div>
        )}
      </div>
    </header>
  );
}
