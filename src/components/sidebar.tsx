"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Briefcase,
  Mail,
  PenLine,
  LayoutDashboard,
  ChevronLeft,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "ניהול",
    items: [
      { href: "/", label: "מועמדים", icon: Users },
      { href: "/jobs", label: "משרות", icon: Briefcase },
    ],
  },
  {
    title: "דיוור",
    items: [
      { href: "/campaigns", label: "קמפיינים", icon: Mail },
      { href: "/compose", label: "קמפיין חדש", icon: PenLine },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed right-0 top-0 h-full w-64 bg-[#0D0B3E] flex flex-col z-50">
      {/* Brand header */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image
              src="/logo_al_alok.png"
              alt="AL"
              width={32}
              height={32}
              priority
              className="brightness-0 invert"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm leading-tight tracking-wide">
              AL CRM
            </h1>
            <p className="text-white/40 text-[11px] leading-tight mt-0.5">
              גיוס עובדים והשמה
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-5 mb-1.5 text-[11px] font-medium text-white/30 uppercase tracking-wider">
              {section.title}
            </p>
            <div className="space-y-0.5 px-3">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-white/[0.12] text-white"
                        : "text-white/50 hover:text-white/90 hover:bg-white/[0.06]"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#F7941D] rounded-l-full" />
                    )}
                    <Icon
                      className={cn(
                        "w-[18px] h-[18px] flex-shrink-0 transition-colors duration-150",
                        isActive
                          ? "text-[#F7941D]"
                          : "text-white/40 group-hover:text-white/70"
                      )}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/25">v1.0</span>
          <span className="text-[11px] text-white/25">AL CRM</span>
        </div>
      </div>
    </aside>
  );
}
