"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type SystemStatus = {
  googleApiConfigured: boolean;
  dataSource: "Demo veri";
  version: "MVP";
};

const fallbackSystemStatus: SystemStatus = {
  googleApiConfigured: false,
  dataSource: "Demo veri",
  version: "MVP",
};

export default function SettingsPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/system-status")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Sistem durumu alınamadı.");
        }

        return response.json() as Promise<SystemStatus>;
      })
      .then((status) => {
        if (isMounted) {
          setSystemStatus(status);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSystemStatus(fallbackSystemStatus);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const status = systemStatus ?? fallbackSystemStatus;
  const googleApiLabel = systemStatus
    ? status.googleApiConfigured
      ? "Hazır"
      : "Yapılandırılmadı"
    : "Kontrol ediliyor";

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Ayarlar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Sistem bağlantılarını, veri kaynağını ve uygulama saklama davranışını
            güvenli şekilde takip edin.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatusCard
            label="Google API"
            value={googleApiLabel}
            tone={
              systemStatus
                ? status.googleApiConfigured
                  ? "success"
                  : "warning"
                : "info"
            }
          />
          <StatusCard
            label="Veri Kaynağı"
            value={status.googleApiConfigured ? "Google / Demo fallback" : "Demo / Manuel Veri Modu"}
            tone={status.googleApiConfigured ? "info" : "neutral"}
          />
          <StatusCard label="Sürüm" value={status.version} tone="neutral" />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <InfoPanel title="Sistem Durumu">
            <dl className="grid gap-3">
              <InfoRow label="Google API" value={googleApiLabel} />
              <InfoRow
                label="Veri modu"
                value={status.googleApiConfigured ? "API hazır, demo fallback aktif" : "Demo / Manuel Veri Modu"}
              />
              <InfoRow label="Uygulama sürümü" value={status.version} />
            </dl>
          </InfoPanel>

          <InfoPanel title="Google API / Veri Kaynağı">
            <p className="text-sm leading-6 text-slate-600">
              Google Places API anahtarı güvenlik için sunucu ortamında tutulmalıdır.
              Bu ekranda API key gösterilmez ve tarayıcıya yazılmaz.
            </p>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Ortam değişkeni
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                GOOGLE_PLACES_API_KEY
              </p>
            </div>
          </InfoPanel>

          <InfoPanel title="Veri Saklama">
            <p className="text-sm leading-6 text-slate-600">
              Veriler şu anda bu tarayıcıda saklanır. Farklı bir cihazda otomatik
              olarak görünmez.
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-slate-600">
              <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                Analiz geçmişi, favoriler, aboneler ve muhasebe kayıtları localStorage
                üzerinde tutulur.
              </li>
              <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                Şu aşamada cloud sync veya merkezi database bağlantısı yoktur.
              </li>
            </ul>
          </InfoPanel>

          <InfoPanel title="Uygulama Bilgisi">
            <dl className="grid gap-3">
              <InfoRow label="Ürün" value="Lead Finder AI" />
              <InfoRow label="Aşama" value="MVP" />
              <InfoRow label="Güvenli secret yönetimi" value="Sunucu ortam değişkeni" />
            </dl>
          </InfoPanel>
        </section>
      </div>
    </AppShell>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "info" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "info"
          ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${toneClass}`}
      >
        {value}
      </p>
    </article>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
