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

function getIntentBadgeClass(intent: AnalysisHistoryItem["selectedIntent"]): string {
  if (intent === "review-card") {
    return "badge-review";
  }

  if (intent === "web-design") {
    return "badge-web";
  }

  return "badge-neutral";
}

function getAnalysisTitle(analysis: AnalysisHistoryItem): string {
  const fallbackName = [analysis.district, analysis.category]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return analysis.analysisName?.trim() || fallbackName || analysis.category || "İsimsiz Analiz";
}

function getLocationCategoryLine(analysis: AnalysisHistoryItem): string {
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
      value: history.length,
      accent: "border-t-blue-500",
      valueClass: "metric-blue",
      markerClass: "bg-blue-50 text-blue-700 border-blue-200",
      marker: "A",
    },
    {
      label: "Toplam İşletme",
      value: totalBusinesses,
      accent: "border-t-cyan-600",
      valueClass: "metric-cyan",
      markerClass: "bg-cyan-50 text-cyan-700 border-cyan-200",
      marker: "İ",
    },
    {
      label: "Favoriler",
      value: favoritesCount,
      accent: "border-t-rose-400",
      valueClass: "text-rose-600",
      markerClass: "bg-rose-50 text-rose-700 border-rose-200",
      marker: "F",
    },
    {
      label: "Yorum Kart Aboneleri",
      value: subscriberCount,
      accent: "border-t-green-600",
      valueClass: "metric-green",
      markerClass: "bg-green-50 text-green-700 border-green-200",
      marker: "Y",
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
    if (selectedAnalysisIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `${selectedAnalysisIds.length} analiz geçmişten silinecek. Favoriler, Aboneler ve Muhasebe kayıtları korunacak. Devam edilsin mi?`,
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

  function handleClearSelection() {
    setSelectedAnalysisIds([]);
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Analizlerinizi yönetin ve son raporlarınıza hızlıca ulaşın.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/new-analysis" className="btn-primary">
            Yeni Analiz
          </Link>
          <Link href="/results" className="btn-secondary">
            Sonuçları Gör
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-xl border border-t-2 border-slate-200 bg-white p-4 shadow-sm ${stat.accent}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${stat.valueClass}`}>
                  {stat.value}
                </p>
              </div>
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${stat.markerClass}`}
                aria-hidden="true"
              >
                {stat.marker}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Son Analizler
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Kayıtlı raporlarınızı arayın, açın, düzenleyin veya güvenli şekilde silin.
              </p>
            </div>

            {history.length > 0 ? (
              <div className="flex flex-col gap-3 lg:min-w-[360px]">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">
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
          </div>
        </div>

        {history.length > 0 ? (
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleVisibleSelection}
                className="btn-secondary"
              >
                {allVisibleSelected ? "Görünür Seçimi Kaldır" : "Görünürleri Seç"}
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={selectedAnalysisIds.length === 0}
                className="btn-secondary"
              >
                Seçimi Kaldır
              </button>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
                Seçilen: {selectedAnalysisIds.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedAnalysisIds.length === 0}
                className="btn-danger"
              >
                Seçilenleri Sil
              </button>
              <button type="button" onClick={handleClearHistory} className="btn-danger">
                Tüm Geçmişi Temizle
              </button>
            </div>
          </div>
        ) : null}

        {history.length === 0 ? (
          <div className="p-5">
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Henüz kayıtlı analiz yok. Yeni analiz oluşturduğunuzda burada görünecek.
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-5">
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Aramanızla eşleşen analiz bulunamadı.
            </div>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="table-pop">
                <thead>
                  <tr>
                    <th className="w-12 text-left">Seçim</th>
                    <th className="text-left">Analiz</th>
                    <th className="text-left">Mod</th>
                    <th className="text-left">Konum / Kategori</th>
                    <th className="text-left">İşletme</th>
                    <th className="text-left">Tarih</th>
                    <th className="text-right">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((analysis) => {
                    const isSelected = selectedAnalysisIds.includes(analysis.id);

                    return (
                      <tr key={analysis.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleAnalysis(analysis.id)}
                            aria-label={`${getAnalysisTitle(analysis)} seç`}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </td>
                        <td>
                          <p className="font-semibold text-slate-950">
                            {getAnalysisTitle(analysis)}
                          </p>
                        </td>
                        <td>
                          <span className={getIntentBadgeClass(analysis.selectedIntent)}>
                            {getIntentLabel(analysis.selectedIntent)}
                          </span>
                        </td>
                        <td className="max-w-sm text-sm text-slate-600">
                          {getLocationCategoryLine(analysis) || "-"}
                        </td>
                        <td className="text-sm font-medium text-slate-700">
                          {analysis.businesses.length}
                        </td>
                        <td className="text-sm text-slate-600">
                          {formatAnalysisDate(analysis.createdAt)}
                        </td>
                        <td>
                          <div className="flex justify-end gap-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenAnalysis(analysis)}
                              className="btn-secondary"
                            >
                              Aç
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(analysis)}
                              className="btn-secondary"
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAnalysis(analysis.id)}
                              className="btn-danger"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {filteredHistory.map((analysis) => {
                const isSelected = selectedAnalysisIds.includes(analysis.id);

                return (
                  <article
                    key={analysis.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-slate-950">
                          {getAnalysisTitle(analysis)}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {getLocationCategoryLine(analysis) || "-"}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleAnalysis(analysis.id)}
                        aria-label={`${getAnalysisTitle(analysis)} seç`}
                        className="mt-1 h-5 w-5 shrink-0 accent-blue-600"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className={getIntentBadgeClass(analysis.selectedIntent)}>
                        {getIntentLabel(analysis.selectedIntent)}
                      </span>
                      <span className="badge-pop">{analysis.businesses.length} işletme</span>
                      <span className="badge-pop">
                        {formatAnalysisDate(analysis.createdAt)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAnalysis(analysis)}
                        className="btn-secondary"
                      >
                        Aç
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(analysis)}
                        className="btn-secondary"
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAnalysis(analysis.id)}
                        className="btn-danger"
                      >
                        Sil
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {editingAnalysis ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6">
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Analiz Yönetimi</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Analizi Düzenle
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingAnalysis(null)}
                className="btn-ghost"
                aria-label="Kapat"
              >
                Kapat
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-slate-700">
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
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Şehir</span>
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

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">İlçe</span>
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

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-slate-700">
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
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {editError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditingAnalysis(null)}
                className="btn-secondary"
              >
                İptal
              </button>
              <button type="button" onClick={handleSaveEdit} className="btn-primary">
                Kaydet
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
