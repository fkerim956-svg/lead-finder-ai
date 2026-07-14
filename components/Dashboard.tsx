"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  clearAnalysisHistory,
  getAnalysisHistory,
  removeAnalysesFromHistory,
  removeAnalysisFromHistory,
  setLatestAnalysis,
  updateAnalysisMetadata,
} from "@/lib/analysis-history";
import {
  FAVORITES_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
} from "@/lib/storage-keys";
import type { AnalysisHistoryItem, BusinessResult } from "@/types/business";

type EditFormState = {
  id: string;
  analysisName: string;
  city: string;
  district: string;
  category: string;
};

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
  const fallbackName = [analysis.district, analysis.category]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return analysis.analysisName?.trim() || fallbackName || analysis.category || "İsimsiz Analiz";
}

function getAnalysisMetaLine(analysis: AnalysisHistoryItem): string {
  const location = [analysis.city, analysis.district]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" / ");

  return [location, analysis.category?.trim()].filter(Boolean).join(" • ");
}

function formatAnalysisDate(createdAt: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function validateMetadata(form: EditFormState): string {
  if (!form.analysisName.trim()) {
    return "Analiz adı boş bırakılamaz.";
  }

  if (form.analysisName.trim().length > 100) {
    return "Analiz adı en fazla 100 karakter olabilir.";
  }

  if (
    form.city.trim().length > 60 ||
    form.district.trim().length > 60 ||
    form.category.trim().length > 60
  ) {
    return "Şehir, ilçe ve kategori en fazla 60 karakter olabilir.";
  }

  return "";
}

export default function Dashboard() {
  const router = useRouter();
  const [history, setHistory] = useState<AnalysisHistoryItem[]>(getAnalysisHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnalysisIds, setSelectedAnalysisIds] = useState<string[]>([]);
  const [editingAnalysis, setEditingAnalysis] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState("");
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
  const visibleAnalysisIds = filteredHistory.map((analysis) => analysis.id);
  const selectedVisibleCount = selectedAnalysisIds.filter((id) =>
    visibleAnalysisIds.includes(id),
  ).length;
  const allVisibleSelected =
    visibleAnalysisIds.length > 0 && selectedVisibleCount === visibleAnalysisIds.length;

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

  function refreshHistory(nextHistory: AnalysisHistoryItem[]) {
    setHistory(nextHistory);
    setSelectedAnalysisIds((currentIds) =>
      currentIds.filter((id) => nextHistory.some((analysis) => analysis.id === id)),
    );
  }

  function handleOpenAnalysis(analysis: AnalysisHistoryItem) {
    setLatestAnalysis(analysis);
    router.push("/results");
  }

  function handleRemoveAnalysis(id: string) {
    const confirmed = window.confirm(
      "Bu analiz geçmişten silinecek. Favoriler, Aboneler ve Muhasebe kayıtları etkilenmeyecek. Devam edilsin mi?",
    );

    if (!confirmed) {
      return;
    }

    refreshHistory(removeAnalysisFromHistory(id));
  }

  function handleDeleteSelected() {
    const count = selectedAnalysisIds.length;

    if (count === 0) {
      return;
    }

    const confirmed = window.confirm(
      `${count} analiz geçmişten silinecek. Favoriler, Aboneler ve Muhasebe kayıtları korunacak. Devam edilsin mi?`,
    );

    if (!confirmed) {
      return;
    }

    refreshHistory(removeAnalysesFromHistory(selectedAnalysisIds));
  }

  function handleClearHistory() {
    const confirmed = window.confirm(
      "Bu işlem geri alınamaz. Tüm analiz geçmişi silinecek. Favoriler, Aboneler, Muhasebe ve NFC stok kayıtları korunacaktır. Devam edilsin mi?",
    );

    if (!confirmed) {
      return;
    }

    clearAnalysisHistory();
    setHistory([]);
    setSelectedAnalysisIds([]);
    setEditingAnalysis(null);
    setEditError("");
  }

  function handleToggleAnalysis(id: string) {
    setSelectedAnalysisIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id],
    );
  }

  function handleToggleVisibleSelection() {
    setSelectedAnalysisIds((currentIds) => {
      const hiddenSelectedIds = currentIds.filter(
        (id) => !visibleAnalysisIds.includes(id),
      );

      if (allVisibleSelected) {
        return hiddenSelectedIds;
      }

      return [...hiddenSelectedIds, ...visibleAnalysisIds];
    });
  }

  function handleStartEdit(analysis: AnalysisHistoryItem) {
    setEditingAnalysis({
      id: analysis.id,
      analysisName: getAnalysisTitle(analysis),
      city: analysis.city ?? "",
      district: analysis.district ?? "",
      category: analysis.category ?? "Manuel Veri",
    });
    setEditError("");
  }

  function handleSaveEdit() {
    if (!editingAnalysis) {
      return;
    }

    const validationError = validateMetadata(editingAnalysis);

    if (validationError) {
      setEditError(validationError);
      return;
    }

    const nextHistory = updateAnalysisMetadata(editingAnalysis.id, {
      analysisName: editingAnalysis.analysisName,
      city: editingAnalysis.city,
      district: editingAnalysis.district,
      category: editingAnalysis.category,
    });

    setHistory(nextHistory);
    setEditingAnalysis(null);
    setEditError("");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
      <header className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="page-eyebrow">Panel</p>
          <h1 className="page-title mt-5">Lead Finder AI</h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            Analiz geçmişi, favoriler ve satış aksiyonları tek yerde. Yeni Google
            Maps analizleri ve manuel yüklenen veriler burada kalıcı olarak
            listelenir.
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
        </div>

        {history.length > 0 ? (
          <div className="grid gap-4 border-b-2 border-[#1E293B] bg-[#FFFDF5] p-5">
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex min-h-11 items-center gap-3 text-sm font-black text-[#1E293B]">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleVisibleSelection}
                  className="h-5 w-5 accent-[#8B5CF6]"
                />
                Tümünü Seç
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="badge-pop bg-white">
                  Seçilen: {selectedAnalysisIds.length}
                </span>
                {selectedAnalysisIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="btn-danger"
                  >
                    Seçilenleri Sil ({selectedAnalysisIds.length})
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {history.length === 0 ? (
          <div className="p-5">
            <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
              Henüz kayıtlı analiz yok.
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
            {filteredHistory.map((analysis) => {
              const metaLine = getAnalysisMetaLine(analysis);
              const isSelected = selectedAnalysisIds.includes(analysis.id);

              return (
                <article
                  key={analysis.id}
                  className="rounded-[24px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]"
                >
                  <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                    <label className="flex min-h-11 items-center gap-3 text-sm font-black text-[#1E293B]">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleAnalysis(analysis.id)}
                        className="h-5 w-5 accent-[#8B5CF6]"
                      />
                      Seç
                    </label>

                    <div>
                      <h3 className="font-heading text-2xl font-black text-[#1E293B]">
                        {getAnalysisTitle(analysis)}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="badge-pop bg-[#F5F3FF]">
                          {formatAnalysisDate(analysis.createdAt)}
                        </span>
                        <span className="badge-pop bg-[#34D399]">
                          {getIntentLabel(analysis.selectedIntent)}
                        </span>
                        {metaLine ? (
                          <span className="badge-pop bg-white">{metaLine}</span>
                        ) : null}
                        <span className="badge-pop bg-[#EDE9FE]">
                          {analysis.businesses.length} işletme
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(analysis)}
                        className="btn-secondary"
                      >
                        Analizi Düzenle
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
              );
            })}
          </div>
        )}

        {history.length > 0 ? (
          <div className="border-t-2 border-[#1E293B] bg-[#FFFDF5] p-5">
            <button type="button" onClick={handleClearHistory} className="btn-danger">
              Tüm Analiz Geçmişini Temizle
            </button>
          </div>
        ) : null}
      </section>

      {editingAnalysis ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1E293B]/35 px-4 py-6">
          <section className="card-pop max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="page-eyebrow">Analiz Yönetimi</p>
                <h2 className="mt-3 font-heading text-3xl font-black text-[#1E293B]">
                  Analizi Düzenle
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingAnalysis(null)}
                className="btn-ghost min-h-11"
                aria-label="Vazgeç"
              >
                Kapat
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#1E293B]">
                  Analiz adı
                </span>
                <input
                  type="text"
                  value={editingAnalysis.analysisName}
                  onChange={(event) =>
                    setEditingAnalysis((current) =>
                      current
                        ? { ...current, analysisName: event.target.value }
                        : current,
                    )
                  }
                  className="input-pop"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-[#1E293B]">
                    Şehir
                  </span>
                  <input
                    type="text"
                    value={editingAnalysis.city}
                    onChange={(event) =>
                      setEditingAnalysis((current) =>
                        current ? { ...current, city: event.target.value } : current,
                      )
                    }
                    className="input-pop"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-[#1E293B]">İlçe</span>
                  <input
                    type="text"
                    value={editingAnalysis.district}
                    onChange={(event) =>
                      setEditingAnalysis((current) =>
                        current
                          ? { ...current, district: event.target.value }
                          : current,
                      )
                    }
                    className="input-pop"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-black text-[#1E293B]">
                    Kategori
                  </span>
                  <input
                    type="text"
                    value={editingAnalysis.category}
                    onChange={(event) =>
                      setEditingAnalysis((current) =>
                        current
                          ? { ...current, category: event.target.value }
                          : current,
                      )
                    }
                    className="input-pop"
                  />
                </label>
              </div>
            </div>

            {editError ? (
              <p className="mt-4 rounded-2xl border-2 border-[#1E293B] bg-[#FFE4E6] p-3 text-sm font-black text-[#7F1D1D]">
                {editError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={handleSaveEdit} className="btn-primary">
                Değişiklikleri Kaydet
              </button>
              <button
                type="button"
                onClick={() => setEditingAnalysis(null)}
                className="btn-secondary"
              >
                Vazgeç
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
