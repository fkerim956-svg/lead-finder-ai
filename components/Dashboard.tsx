"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  clearAnalysisHistory,
  getAnalysisHistory,
  removeAnalysisFromHistory,
  renameAnalysisInHistory,
  setLatestAnalysis,
} from "@/lib/analysis-history";
import {
  FAVORITES_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
} from "@/lib/storage-keys";
import type { AnalysisHistoryItem, BusinessResult } from "@/types/business";

function getStoredBusinessCount(storageKey: string): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const savedValue = window.localStorage.getItem(storageKey);

  if (!savedValue) {
    return 0;
  }

  try {
    return (JSON.parse(savedValue) as BusinessResult[]).length;
  } catch {
    window.localStorage.removeItem(storageKey);
    return 0;
  }
}

function getIntentLabel(intent: AnalysisHistoryItem["selectedIntent"]): string {
  if (intent === "review-card") {
    return "Yorum Kart";
  }

  if (intent === "web-design") {
    return "Web Tasarım";
  }

  return "Genel";
}

function getAnalysisTitle(analysis: AnalysisHistoryItem): string {
  return analysis.analysisName?.trim() || `${analysis.district} ${analysis.category}`;
}

export default function Dashboard() {
  const router = useRouter();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>(getAnalysisHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);
  const [editingAnalysisName, setEditingAnalysisName] = useState("");
  const [favoritesCount] = useState(() => getStoredBusinessCount(FAVORITES_STORAGE_KEY));
  const [subscriberCount] = useState(() =>
    getStoredBusinessCount(REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY),
  );
  const totalBusinesses = history.reduce(
    (total, analysis) => total + analysis.businesses.length,
    0,
  );
  const filteredHistory = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedQuery) {
      return history;
    }

    return history.filter((analysis) => {
      const searchableText = [
        getAnalysisTitle(analysis),
        analysis.city,
        analysis.district,
        analysis.category,
        getIntentLabel(analysis.selectedIntent),
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedQuery);
    });
  }, [history, searchQuery]);

  const stats = [
    {
      label: "Toplam Analiz",
      value: String(history.length),
      accent: "bg-[#FBBF24]",
    },
    {
      label: "Bulunan İşletme",
      value: String(totalBusinesses),
      accent: "bg-[#34D399]",
    },
    {
      label: "Favoriler",
      value: String(favoritesCount),
      accent: "bg-[#F472B6]",
    },
    {
      label: "Yorum Kart Aboneleri",
      value: String(subscriberCount),
      accent: "bg-[#EDE9FE]",
    },
  ];

  function handleOpenAnalysis(analysis: AnalysisHistoryItem) {
    setLatestAnalysis(analysis);
    router.push("/results");
  }

  function handleRemoveAnalysis(id: string) {
    setHistory(removeAnalysisFromHistory(id));
  }

  function handleClearHistory() {
    clearAnalysisHistory();
    setHistory([]);
    setEditingAnalysisId(null);
    setEditingAnalysisName("");
  }

  function handleStartRename(analysis: AnalysisHistoryItem) {
    setEditingAnalysisId(analysis.id);
    setEditingAnalysisName(getAnalysisTitle(analysis));
  }

  function handleSaveRename(id: string) {
    setHistory(renameAnalysisInHistory(id, editingAnalysisName));
    setEditingAnalysisId(null);
    setEditingAnalysisName("");
  }

  function handleCancelRename() {
    setEditingAnalysisId(null);
    setEditingAnalysisName("");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="page-eyebrow">Panel</p>
          <h1 className="page-title mt-5">Lead Finder AI</h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            Analiz geçmişi, favoriler ve satış aksiyonları tek yerde. Yeni
            Google Maps analizleri ve manuel yüklenen veriler burada kalıcı
            olarak listelenir.
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section className="card-pop overflow-hidden">
        <div className="flex flex-col gap-3 border-b-2 border-[#1E293B] bg-[#FBBF24] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl font-black text-[#1E293B]">
              Son Analizler
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#1E293B]">
              Google API demo sonuçları ve manuel yüklenen veriler burada
              tutulur.
            </p>
          </div>
          {history.length > 0 ? (
            <button type="button" onClick={handleClearHistory} className="btn-danger">
              Tüm Geçmişi Temizle
            </button>
          ) : null}
        </div>

        {history.length > 0 ? (
          <div className="border-b-2 border-[#1E293B] bg-[#FFFDF5] p-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-black text-[#1E293B]">
                Analizlerde ara
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Üsküdar, cafe, web tasarım..."
                className="input-pop"
              />
            </label>
          </div>
        ) : null}

        {history.length === 0 ? (
          <div className="p-5">
            <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
              Henüz kayıtlı analiz yok. Yeni analiz oluşturarak veya manuel veri
              yükleyerek başlayın.
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-5">
            <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
              Aramanızla eşleşen analiz bulunamadı.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4">
            {filteredHistory.map((analysis) => (
              <article
                key={analysis.id}
                className="rounded-[24px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    {editingAnalysisId === analysis.id ? (
                      <div className="grid max-w-xl gap-3">
                        <label className="grid gap-2">
                          <span className="text-sm font-black text-[#1E293B]">
                            Analiz adı
                          </span>
                          <input
                            type="text"
                            value={editingAnalysisName}
                            onChange={(event) =>
                              setEditingAnalysisName(event.target.value)
                            }
                            className="input-pop"
                          />
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => handleSaveRename(analysis.id)}
                            className="btn-primary"
                          >
                            Kaydet
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            className="btn-secondary"
                          >
                            Vazgeç
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-heading text-2xl font-black text-[#1E293B]">
                          {getAnalysisTitle(analysis)}
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="badge-pop bg-[#F5F3FF]">
                            {new Intl.DateTimeFormat("tr-TR", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(analysis.createdAt))}
                          </span>
                          <span className="badge-pop bg-[#34D399]">
                            {getIntentLabel(analysis.selectedIntent)}
                          </span>
                          <span className="badge-pop bg-white">
                            {analysis.city} / {analysis.district}
                          </span>
                          <span className="badge-pop bg-[#FBBF24]">
                            {analysis.category}
                          </span>
                          <span className="badge-pop bg-[#EDE9FE]">
                            {analysis.businesses.length} işletme
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleStartRename(analysis)}
                      className="btn-secondary"
                    >
                      Yeniden Adlandır
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAnalysis(analysis)}
                      className="btn-primary"
                    >
                      Sonuçları Aç
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAnalysis(analysis.id)}
                      className="btn-danger"
                    >
                      Analizi Sil
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
