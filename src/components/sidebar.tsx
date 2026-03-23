"use client";

import Link from "next/link";
import Image from "next/image";
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
    <aside className="fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 flex flex-col z-50 shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Image
          src="/logo_al_alok.png"
          alt="AL גיוס עובדים והשמה"
          width={120}
          height={120}
          priority
        />
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
                  ? "bg-[#1B1464] text-white font-medium"
                  : "text-[#1F2937] hover:bg-[#1B1464]/10 hover:text-[#1B1464]"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">AL CRM v1.0</p>
      </div>
    </aside>
  );
}
