"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryNavigationItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Yeni Analiz", href: "/new-analysis" },
  { label: "Sonuçlar", href: "/results" },
  { label: "Favoriler", href: "/favorites" },
  { label: "Aboneler", href: "/subscribers" },
  { label: "Muhasebe", href: "/accounting" },
];

const settingsNavigationItem = { label: "Ayarlar", href: "/settings" };

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden border-r border-[#E2E8F0] bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:flex-none lg:flex-col lg:self-start lg:overflow-y-auto">
        <Link
          href="/"
          className="block w-full border-b border-[#E2E8F0] px-5 py-5 transition-colors hover:bg-[#F8FAFC]"
        >
          <p className="font-heading text-lg font-semibold tracking-tight text-[#0F172A]">
            Lead Finder AI
          </p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Satış zekası</p>
        </Link>

        <nav className="flex w-full flex-col gap-1 px-3 py-4">
          {primaryNavigationItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-[#E2E8F0] px-3 py-4">
          <SidebarLink
            href={settingsNavigationItem.href}
            label={settingsNavigationItem.label}
            active={pathname.startsWith(settingsNavigationItem.href)}
          />
        </div>
      </aside>

      <aside className="border-b border-[#E2E8F0] bg-white px-4 py-4 lg:hidden">
        <Link
          href="/"
          className="block rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 transition-colors hover:bg-[#F8FAFC]"
        >
          <p className="font-heading text-lg font-semibold tracking-tight text-[#0F172A]">
            Lead Finder AI
          </p>
          <p className="mt-1 text-xs font-medium text-[#64748B]">Satış zekası</p>
        </Link>

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {primaryNavigationItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              label={item.label}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="mt-3 border-t border-[#E2E8F0] pt-3">
          <SidebarLink
            href={settingsNavigationItem.href}
            label={settingsNavigationItem.label}
            active={pathname.startsWith(settingsNavigationItem.href)}
          />
        </div>
      </aside>
    </>
  );
}

function SidebarLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(37,99,235,0.28)] lg:w-full ${
        active
          ? "bg-[#EFF6FF] text-[#2563EB]"
          : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
      }`}
    >
      {label}
    </Link>
  );
}
