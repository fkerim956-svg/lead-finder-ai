"use client";

import { use, useState } from "react";
import AppShell from "@/components/AppShell";

type SystemStatus = {
  googleApiConfigured: boolean;
  dataSource: "Demo veri";
  version: "MVP";
};

function getSystemStatus(): Promise<SystemStatus> {
  return fetch("/api/system-status").then((response) => {
    if (!response.ok) {
      throw new Error("Sistem durumu alınamadı.");
    }

    return response.json() as Promise<SystemStatus>;
  });
}

export default function SettingsPage() {
  const [systemStatus] = useState<Promise<SystemStatus>>(getSystemStatus);

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
        <header>
          <p className="page-eyebrow">Ayarlar</p>
          <h1 className="page-title mt-5">Uygulama ayarları</h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            Google API yapılandırması ve uygulama durumu burada izlenir. API
            anahtarı güvenlik için tarayıcıda değil, sunucu ortamında tutulur.
          </p>
        </header>

        <section className="card-pop overflow-hidden">
          <div className="border-b-2 border-[#1E293B] bg-[#FBBF24] px-5 py-4">
            <h2 className="font-heading text-xl font-black text-[#1E293B]">
              Google API Ayarları
            </h2>
            <p className="mt-1 text-sm font-bold text-[#1E293B]">
              Google API anahtarı güvenlik için .env.local içinde tutulmalıdır.
            </p>
          </div>

          <div className="p-5">
            <div className="rounded-2xl border-2 border-[#1E293B] bg-[#F5F3FF] px-4 py-3">
              <p className="text-xs font-black uppercase text-slate-500">
                Ortam değişkeni
              </p>
              <p className="mt-2 font-mono text-sm font-black text-[#1E293B]">
                GOOGLE_PLACES_API_KEY
              </p>
            </div>
          </div>
        </section>

        <SystemStatusSection systemStatus={systemStatus} />
      </div>
    </AppShell>
  );
}

function SystemStatusSection({
  systemStatus,
}: {
  systemStatus: Promise<SystemStatus>;
}) {
  const status = use(systemStatus);

  return (
    <section className="card-pop overflow-hidden">
      <div className="border-b-2 border-[#1E293B] bg-[#34D399] px-5 py-4">
        <h2 className="font-heading text-xl font-black text-[#1E293B]">
          Uygulama Durumu
        </h2>
      </div>

      <dl className="grid gap-4 p-5 sm:grid-cols-3">
        <StatusItem
          label="Google API"
          value={status.googleApiConfigured ? "Hazır" : "Bağlı değil"}
          active={status.googleApiConfigured}
        />
        <StatusItem label="Veri Kaynağı" value={status.dataSource} active />
        <StatusItem label="Sürüm" value={status.version} active />
      </dl>
    </section>
  );
}

function StatusItem({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="rounded-2xl border-2 border-[#1E293B] bg-white p-4">
      <dt className="text-xs font-black uppercase text-slate-500">{label}</dt>
      <dd className="mt-3">
        <span className={`badge-pop ${active ? "bg-[#34D399]" : "bg-[#FBBF24]"}`}>
          {value}
        </span>
      </dd>
    </div>
  );
}
