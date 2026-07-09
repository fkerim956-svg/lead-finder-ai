"use client";

import Link from "next/link";
import { useState } from "react";
import { LATEST_ANALYSIS_STORAGE_KEY } from "@/lib/storage-keys";
import type { LatestAnalysis } from "@/types/business";

function getLatestAnalysis(): LatestAnalysis | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedAnalysis = window.localStorage.getItem(LATEST_ANALYSIS_STORAGE_KEY);

  if (!savedAnalysis) {
    return null;
  }

  try {
    return JSON.parse(savedAnalysis) as LatestAnalysis;
  } catch {
    window.localStorage.removeItem(LATEST_ANALYSIS_STORAGE_KEY);
    return null;
  }
}

export default function Dashboard() {
  const [latestAnalysis] = useState<LatestAnalysis | null>(getLatestAnalysis);
  const potentialLeads =
    latestAnalysis?.businesses.filter((business) => business.leadScore >= 75).length ?? 0;

  const stats = [
    {
      label: "Toplam Analiz",
      value: latestAnalysis ? "1" : "0",
      accent: "bg-[#FBBF24]",
    },
    {
      label: "Bulunan İşletme",
      value: String(latestAnalysis?.businesses.length ?? 0),
      accent: "bg-[#34D399]",
    },
    {
      label: "Potansiyel Müşteri Adayı",
      value: String(potentialLeads),
      accent: "bg-[#F472B6]",
    },
  ];

  const recentAnalyses = latestAnalysis
    ? [
        {
          location: `${latestAnalysis.city} / ${latestAnalysis.district}`,
          category: latestAnalysis.category,
          businesses: latestAnalysis.businesses.length,
          leads: potentialLeads,
        },
      ]
    : [
        {
          location: "İstanbul / Kadıköy",
          category: "Cafe",
          businesses: 0,
          leads: 0,
        },
        {
          location: "Ankara / Çankaya",
          category: "Diş Kliniği",
          businesses: 0,
          leads: 0,
        },
        {
          location: "İzmir / Konak",
          category: "Güzellik Salonu",
          businesses: 0,
          leads: 0,
        },
      ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="page-eyebrow">Panel</p>
          <h1 className="page-title mt-5">Lead Finder AI</h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            İşletme analizleri, potansiyel müşteri adayları ve son aramalar tek
            yerde. Sıcak, hızlı ve aksiyona hazır bir satış panosu.
          </p>
        </div>

        <div className="card-pop flex flex-col gap-3 bg-white p-4 sm:flex-row">
          <Link href="/new-analysis" className="btn-primary">
            Yeni Analiz
          </Link>
          <Link href="/results" className="btn-secondary">
            Sonuçları Gör
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <article
            key={stat.label}
            className="card-pop relative overflow-hidden p-5 transition motion-safe:hover:-translate-y-1"
          >
            <div
              className={`absolute -right-5 -top-5 h-20 w-20 rounded-[28px] border-2 border-[#1E293B] ${stat.accent} rotate-12`}
            />
            <p className="relative text-sm font-extrabold text-slate-600">
              {stat.label}
            </p>
            <p className="relative mt-4 font-heading text-5xl font-black text-[#1E293B]">
              {stat.value}
            </p>
            <span className="badge-pop relative mt-4 bg-[#FBBF24]">
              0{index + 1}
            </span>
          </article>
        ))}
      </section>

      {latestAnalysis ? (
        <section className="card-pop p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-black text-[#1E293B]">
              Son Analiz
            </h2>
            <span className="badge-pop bg-[#34D399]">Canlı veri</span>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <InfoItem label="Ülke" value={latestAnalysis.country} />
            <InfoItem label="Şehir" value={latestAnalysis.city} />
            <InfoItem label="İlçe" value={latestAnalysis.district} />
            <InfoItem label="Kategori" value={latestAnalysis.category} />
            <InfoItem
              label="Oluşturulma"
              value={new Intl.DateTimeFormat("tr-TR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(latestAnalysis.createdAt))}
            />
          </dl>
        </section>
      ) : null}

      <section className="card-pop overflow-hidden">
        <div className="border-b-2 border-[#1E293B] bg-[#FBBF24] px-5 py-4">
          <h2 className="font-heading text-xl font-black text-[#1E293B]">
            Son Analizler
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#1E293B]">
            {latestAnalysis
              ? "Son oluşturulan analiz aşağıda listeleniyor."
              : "Henüz gerçek analiz verisi bağlanmadı."}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="table-pop min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left">Konum</th>
                <th className="text-left">Kategori</th>
                <th className="text-left">İşletme</th>
                <th className="text-left">Müşteri Adayı</th>
              </tr>
            </thead>
            <tbody>
              {recentAnalyses.map((analysis) => (
                <tr key={`${analysis.location}-${analysis.category}`}>
                  <td className="font-bold">{analysis.location}</td>
                  <td>{analysis.category}</td>
                  <td>{analysis.businesses}</td>
                  <td>{analysis.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
      <dt className="text-xs font-black uppercase text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-extrabold text-[#1E293B]">{value}</dd>
    </div>
  );
}
