"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "מועמדים", icon: "👤" },
  { href: "/jobs", label: "משרות", icon: "💼" },
  { href: "/campaigns", label: "קמפיינים", icon: "📧" },
  { href: "/compose", label: "קמפיין חדש", icon: "✏️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed right-0 top-0 h-full w-64 bg-[#1B1464] text-white flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold text-[#F7941D]">AL</h1>
        <p className="text-xs text-white/60 mt-1">גיוס עובדים והשמה</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-white/15 text-[#F7941D] font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/40 text-center">AL CRM v1.0</p>
      </div>
    </aside>
  );
}
