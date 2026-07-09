"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Panel", href: "/" },
  { label: "Yeni Analiz", href: "/new-analysis" },
  { label: "Sonuçlar", href: "/results" },
  { label: "Favoriler", href: "/favorites" },
  { label: "Ayarlar", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b-2 border-[#1E293B] bg-[#FFFDF5] px-5 py-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r-2">
      <Link
        href="/"
        className="card-pop block rotate-[-1deg] bg-white p-4 transition-transform hover:rotate-0"
      >
        <p className="font-heading text-2xl font-black text-[#1E293B]">
          Lead Finder AI
        </p>
        <p className="mt-1 w-fit rounded-full border-2 border-[#1E293B] bg-[#34D399] px-3 py-1 text-xs font-extrabold text-[#1E293B]">
          Satış zekası
        </p>
      </Link>

      <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`min-h-11 whitespace-nowrap rounded-full border-2 border-[#1E293B] px-4 py-2.5 text-sm font-extrabold transition motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 ${
                isActive
                  ? "bg-[#8B5CF6] text-white shadow-[4px_4px_0_#1E293B]"
                  : "bg-white text-[#1E293B] hover:bg-[#FBBF24] hover:shadow-[4px_4px_0_#1E293B]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
