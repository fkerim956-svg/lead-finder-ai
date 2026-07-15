"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  getAnalysisHistory,
  saveAnalysisToHistory,
  setLatestAnalysis,
} from "@/lib/analysis-history";
import { createMapsSearchUrl } from "@/lib/business-normalization";
import { calculateLeadScore } from "@/lib/lead-score";
import {
  calculateReviewCardScore,
  getReviewCardFitLabel,
} from "@/lib/review-card-score";
import {
  FAVORITES_STORAGE_KEY,
  LATEST_ANALYSIS_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
  SELECTED_INTENT_STORAGE_KEY,
} from "@/lib/storage-keys";
import {
  calculateWebDesignScore,
  getWebDesignFitLabel,
} from "@/lib/web-design-score";
import type {
  AnalysisHistoryItem,
  BusinessResult,
  LatestAnalysis,
  ReviewCardSubscriber,
  SelectedIntent,
} from "@/types/business";

type SortOption =
  | "leadScore"
  | "rating"
  | "reviewCount"
  | "reviewCardScore"
  | "webDesignScore";
type SortDirection = "asc" | "desc";

function getSelectedIntent(): SelectedIntent {
  if (typeof window === "undefined") {
    return "review-card";
  }

  return window.localStorage.getItem(SELECTED_INTENT_STORAGE_KEY) ===
    "web-design"
    ? "web-design"
    : "review-card";
}

function getInitialResultsIntent(): SelectedIntent {
  if (typeof window === "undefined") {
    return "review-card";
  }

  const savedAnalysis = window.localStorage.getItem(LATEST_ANALYSIS_STORAGE_KEY);

  if (savedAnalysis) {
    try {
      const latestAnalysis = JSON.parse(savedAnalysis) as LatestAnalysis;

      if (latestAnalysis.selectedIntent) {
        return latestAnalysis.selectedIntent;
      }
    } catch {
      window.localStorage.removeItem(LATEST_ANALYSIS_STORAGE_KEY);
    }
  }

  return getSelectedIntent();
}

function getSavedLatestAnalysis(): LatestAnalysis | null {
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

function getInitialResultsState() {
  const latestAnalysis = getSavedLatestAnalysis();
  const selectedIntent = latestAnalysis?.selectedIntent ?? getInitialResultsIntent();

  if (!latestAnalysis) {
    return {
      latestAnalysis: null,
      analysisHistory: getAnalysisHistory(),
      selectedIntent,
    };
  }

  const analysisHistory = getAnalysisHistory();
  const latestAnalysisExists =
    latestAnalysis.id &&
    analysisHistory.some((analysis) => analysis.id === latestAnalysis.id);

  if (latestAnalysisExists) {
    return {
      latestAnalysis,
      analysisHistory,
      selectedIntent,
    };
  }

  const savedAnalysis = saveAnalysisToHistory({
    ...latestAnalysis,
    selectedIntent,
  });

  return {
    latestAnalysis: savedAnalysis,
    analysisHistory: getAnalysisHistory(),
    selectedIntent: savedAnalysis.selectedIntent ?? selectedIntent,
  };
}

function getBusinessKey(business: Pick<BusinessResult, "businessName" | "location">) {
  return `${business.businessName.trim().toLocaleLowerCase("tr-TR")}::${business.location.trim().toLocaleLowerCase("tr-TR")}`;
}

function getReviewCardScore(business: BusinessResult): number {
  return calculateReviewCardScore({
    rating: business.rating,
    reviewCount: business.reviewCount,
    hasWebsite: business.hasWebsite,
    hasPhone: business.hasPhone,
  });
}

function getWebScore(business: BusinessResult): number {
  return calculateWebDesignScore(business);
}

function getSafeMapsUrl(
  business: Pick<BusinessResult, "businessName" | "location" | "mapsUrl">,
): string {
  return createMapsSearchUrl(
    business.businessName,
    business.location,
    "",
    "",
    business.mapsUrl,
  );
}

function getAnalysisTitle(
  analysis: Pick<LatestAnalysis, "analysisName" | "district" | "category">,
) {
  const fallbackName = [analysis.district, analysis.category]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return analysis.analysisName?.trim() || fallbackName || analysis.category || "İsimsiz Analiz";
}

function getAnalysisMetaLine(
  analysis: Pick<LatestAnalysis, "city" | "district" | "category">,
) {
  const location = [analysis.city, analysis.district]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" / ");

  return [location, analysis.category?.trim()].filter(Boolean).join(" • ");
}

function getIntentLabel(intent: SelectedIntent | undefined): string {
  if (intent === "review-card") {
    return "Yorum Kart";
  }

  if (intent === "web-design") {
    return "Web Tasarım";
  }

  return "Genel";
}

function formatAnalysisDate(createdAt: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

export default function ResultsPage() {
  const [initialResultsState] = useState(getInitialResultsState);
  const [selectedIntent, setSelectedIntent] =
    useState<SelectedIntent>(initialResultsState.selectedIntent);
  const [latestAnalysis, setLatestAnalysisState] = useState<LatestAnalysis | null>(
    initialResultsState.latestAnalysis,
  );
  const [analysisHistory, setAnalysisHistory] =
    useState<AnalysisHistoryItem[]>(initialResultsState.analysisHistory);
  const [favorites, setFavorites] = useState<BusinessResult[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const savedFavorites = window.localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!savedFavorites) {
      return [];
    }

    try {
      return JSON.parse(savedFavorites) as BusinessResult[];
    } catch {
      window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
      return [];
    }
  });
  const [reviewCardSubscribers, setReviewCardSubscribers] = useState<
    ReviewCardSubscriber[]
  >(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const savedSubscribers = window.localStorage.getItem(
      REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
    );

    if (!savedSubscribers) {
      return [];
    }

    try {
      return JSON.parse(savedSubscribers) as ReviewCardSubscriber[];
    } catch {
      window.localStorage.removeItem(REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY);
      return [];
    }
  });
  const [sortBy, setSortBy] = useState<SortOption>(
    selectedIntent === "web-design" ? "webDesignScore" : "reviewCardScore",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);
  const isReviewCardMode = selectedIntent === "review-card";

  const pageContent = isReviewCardMode
    ? {
        label: "Yorum Kart",
        title: "Yorum Kart Adayları",
        subtitle:
          "Puan ve yorum toplama ihtiyacı olan işletmeleri önceliklendirin.",
      }
    : {
        label: "Web Tasarım",
        title: "Web Tasarım Adayları",
        subtitle:
          "Web sitesi olmayan ve dijital vitrini zayıf işletmeleri önceliklendirin.",
      };

  const businessesWithScore = useMemo<BusinessResult[]>(() => {
    const businesses = latestAnalysis?.businesses ?? [];

    return businesses.map((business) => ({
      ...business,
      leadScore: calculateLeadScore({
        rating: business.rating,
        reviewCount: business.reviewCount,
        hasWebsite: business.hasWebsite,
        hasPhone: business.hasPhone,
      }),
      mapsUrl: getSafeMapsUrl(business),
    }));
  }, [latestAnalysis]);

  const reviewCardSubscriberKeys = useMemo(() => {
    return new Set(reviewCardSubscribers.map(getBusinessKey));
  }, [reviewCardSubscribers]);

  const sortedBusinesses = useMemo(() => {
    return businessesWithScore.toSorted((first, second) => {
      const directionMultiplier = sortDirection === "asc" ? 1 : -1;
      const firstValue = getSortValue(first, sortBy);
      const secondValue = getSortValue(second, sortBy);

      return (firstValue - secondValue) * directionMultiplier;
    });
  }, [businessesWithScore, sortBy, sortDirection]);

  function handleOpenHistoryAnalysis(analysis: AnalysisHistoryItem) {
    const openedAnalysis = setLatestAnalysis(analysis);
    const nextIntent = openedAnalysis.selectedIntent ?? selectedIntent;

    setLatestAnalysisState(openedAnalysis);
    setSelectedIntent(nextIntent);
    setSortBy(nextIntent === "web-design" ? "webDesignScore" : "reviewCardScore");
    setSortDirection("desc");
    setSelectedBusiness(null);
    setAnalysisHistory(getAnalysisHistory());
    setIsHistoryPanelOpen(false);
  }

  function handleSort(nextSortBy: SortOption) {
    if (sortBy === nextSortBy) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortBy(nextSortBy);
    setSortDirection("asc");
  }

  function escapeCsvValue(value: string | number | boolean): string {
    const stringValue = String(value);

    if (
      stringValue.includes(",") ||
      stringValue.includes("\"") ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replaceAll("\"", "\"\"")}"`;
    }

    return stringValue;
  }

  function handleDownloadCsv() {
    const headers = isReviewCardMode
      ? [
          "İşletme Adı",
          "Kategori",
          "Konum",
          "Google Puanı",
          "Yorum Sayısı",
          "Web Sitesi",
          "Telefon",
          "Yorum Kart Skoru",
          "Lead Score",
          "Google Maps Linki",
        ]
      : [
          "İşletme Adı",
          "Kategori",
          "Konum",
          "Google Puanı",
          "Yorum Sayısı",
          "Web Sitesi",
          "Telefon",
          "Web Tasarım Skoru",
          "Lead Score",
          "Google Maps Linki",
        ];

    const rows = sortedBusinesses.map((business) => [
      business.businessName,
      business.category,
      business.location,
      business.rating.toFixed(1),
      business.reviewCount,
      business.hasWebsite ? "Var" : "Yok",
      business.hasPhone ? "Var" : "Yok",
      isReviewCardMode ? getReviewCardScore(business) : getWebScore(business),
      business.leadScore,
      getSafeMapsUrl(business),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "lead-finder-results.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function isFavorite(business: BusinessResult): boolean {
    return favorites.some(
      (favorite) => getBusinessKey(favorite) === getBusinessKey(business),
    );
  }

  function handleToggleFavorite(business: BusinessResult) {
    if (isFavorite(business)) {
      const updatedFavorites = favorites.filter(
        (favorite) => getBusinessKey(favorite) !== getBusinessKey(business),
      );

      setFavorites(updatedFavorites);
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(updatedFavorites),
      );
      return;
    }

    const updatedFavorites = [...favorites, business];

    setFavorites(updatedFavorites);
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
  }

  function isReviewCardSubscriber(business: BusinessResult): boolean {
    return reviewCardSubscriberKeys.has(getBusinessKey(business));
  }

  function handleToggleReviewCardSubscriber(business: BusinessResult) {
    const isSubscriber = isReviewCardSubscriber(business);
    const updatedSubscribers = isSubscriber
      ? reviewCardSubscribers.filter(
          (subscriber) => getBusinessKey(subscriber) !== getBusinessKey(business),
        )
      : [
          ...reviewCardSubscribers,
          {
            ...business,
            subscribedAt: new Date().toISOString(),
          },
        ];

    setReviewCardSubscribers(updatedSubscribers);
    window.localStorage.setItem(
      REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
      JSON.stringify(updatedSubscribers),
    );
  }

  const currentAnalysisMetaLine = latestAnalysis
    ? getAnalysisMetaLine(latestAnalysis)
    : "";

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="page-eyebrow">{pageContent.label} Modu</p>
            <h1 className="page-title mt-5">{pageContent.title}</h1>
            <p className="muted-text mt-4 max-w-3xl text-base font-medium leading-7">
              {pageContent.subtitle}
            </p>
            {latestAnalysis ? (
              <p className="mt-3 w-fit rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#2563EB]">
                {[latestAnalysis.country, currentAnalysisMetaLine]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            ) : null}
          </div>
          <Link href="/" className="btn-secondary w-fit">
            Modu Değiştir
          </Link>
        </header>

        <section className="card-pop overflow-visible p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">
                Şu an açık rapor:
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold text-[#0F172A]">
                {latestAnalysis
                  ? getAnalysisTitle(latestAnalysis)
                  : "Henüz açık bir analiz bulunmuyor."}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-[#64748B]">
                {currentAnalysisMetaLine ? <span>{currentAnalysisMetaLine}</span> : null}
                {latestAnalysis ? (
                  <>
                    <span>{latestAnalysis.businesses.length} işletme</span>
                    <span>{formatAnalysisDate(latestAnalysis.createdAt)}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={sortedBusinesses.length === 0}
                className="btn-secondary"
              >
                CSV İndir
              </button>
              <button
                type="button"
                onClick={() => setIsHistoryPanelOpen((isOpen) => !isOpen)}
                aria-expanded={isHistoryPanelOpen}
                className="btn-primary"
              >
                Rapor Değiştir
              </button>
            </div>
          </div>

          {isHistoryPanelOpen ? (
            <div className="mt-4 grid gap-2 border-t border-[#E2E8F0] pt-4">
              {analysisHistory.length === 0 ? (
                <p className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm font-medium text-[#64748B]">
                  Henüz kayıtlı analiz yok. Yeni analiz oluşturduğunda veya
                  manuel veri yüklediğinde burada görünecek.
                </p>
              ) : (
                analysisHistory.map((analysis) => {
                  const isCurrentAnalysis =
                    latestAnalysis?.id && latestAnalysis.id === analysis.id;

                  return (
                    <article
                      key={analysis.id}
                      className={`rounded-lg border p-3 ${
                        isCurrentAnalysis
                          ? "border-[#2563EB] bg-[#EFF6FF]"
                          : "border-[#E2E8F0] bg-white"
                      }`}
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                          <h3 className="font-heading text-base font-semibold text-[#0F172A]">
                            {getAnalysisTitle(analysis)}
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#64748B]">
                            <span>
                              {formatAnalysisDate(analysis.createdAt)}
                            </span>
                            <span>
                              {getIntentLabel(analysis.selectedIntent)}
                            </span>
                            {getAnalysisMetaLine(analysis) ? (
                              <span>
                                {getAnalysisMetaLine(analysis)}
                              </span>
                            ) : null}
                            <span>
                              {analysis.businesses.length} işletme
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenHistoryAnalysis(analysis)}
                          className={isCurrentAnalysis ? "btn-secondary" : "btn-primary"}
                        >
                          {isCurrentAnalysis ? "Açık" : "Aç"}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          ) : null}
        </section>

        {!latestAnalysis ? (
          <section className="card-pop grid gap-4 bg-white p-5">
            <div>
              <h2 className="font-heading text-2xl font-black text-[#1E293B]">
                Henüz açık bir analiz bulunmuyor.
              </h2>
              <p className="mt-2 text-sm font-bold text-slate-600">
                Dashboard üzerinden kayıtlı bir analizi açabilir veya yeni analiz
                oluşturabilirsin.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard" className="btn-primary">
                Dashboard&apos;a Git
              </Link>
              <Link href="/new-analysis" className="btn-secondary">
                Yeni Analiz
              </Link>
            </div>
          </section>
        ) : null}

        <section className="card-pop overflow-visible">
          <div className="flex flex-col gap-1 border-b border-[#E2E8F0] bg-white px-5 py-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-[#0F172A]">
                İşletme Listesi
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {sortedBusinesses.length} işletme gösteriliyor.
              </p>
            </div>
          </div>

          <div className="hidden md:block">
            <table className="table-pop w-full table-fixed">
              <thead>
                <tr>
                  <th className="text-left">İşletme</th>
                  {isReviewCardMode ? null : (
                    <th className="w-[104px] text-left">Web Sitesi</th>
                  )}
                  <SortableHeader
                    label="Puan"
                    column="rating"
                    activeColumn={sortBy}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Yorum"
                    column="reviewCount"
                    activeColumn={sortBy}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  {isReviewCardMode ? (
                    <SortableHeader
                      label="Yorum Kart Skoru"
                      column="reviewCardScore"
                      activeColumn={sortBy}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  ) : (
                    <SortableHeader
                      label="Web Tasarım Skoru"
                      column="webDesignScore"
                      activeColumn={sortBy}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  )}
                  <th className="w-[220px] text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {sortedBusinesses.map((business) => {
                  const reviewCardScore = getReviewCardScore(business);
                  const webDesignScore = getWebScore(business);

                  return (
                    <tr key={getBusinessKey(business)}>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-[#0F172A]">
                            {business.businessName}
                          </span>
                          <span className="text-xs text-[#64748B]">
                            {business.category} • {business.location}
                          </span>
                        </div>
                      </td>
                      {isReviewCardMode ? null : (
                        <td>
                          <WebsiteStatusBadge hasWebsite={business.hasWebsite} />
                        </td>
                      )}
                      <td className="font-semibold">{business.rating.toFixed(1)}</td>
                      <td>{business.reviewCount}</td>
                      <td>
                        {isReviewCardMode ? (
                          <ScoreBadge
                            score={reviewCardScore}
                            label={getReviewCardFitLabel(reviewCardScore)}
                            color="#EDE9FE"
                          />
                        ) : (
                          <ScoreBadge
                            score={webDesignScore}
                            label={getWebDesignFitLabel(webDesignScore)}
                            color="#DBEAFE"
                          />
                        )}
                      </td>
                      <td>
                        <BusinessActions
                          business={business}
                          isFavorite={isFavorite(business)}
                          isSubscriber={isReviewCardSubscriber(business)}
                          isReviewCardMode={isReviewCardMode}
                          onToggleFavorite={handleToggleFavorite}
                          onToggleSubscriber={handleToggleReviewCardSubscriber}
                          onOpenDetail={setSelectedBusiness}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 p-4 md:hidden">
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <p className="text-xs font-semibold text-[#64748B]">Sırala</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(isReviewCardMode
                  ? [
                      ["Puan", "rating"],
                      ["Yorum", "reviewCount"],
                      ["Yorum Kart", "reviewCardScore"],
                      ["Fırsat", "leadScore"],
                    ]
                  : [
                      ["Web Tasarım", "webDesignScore"],
                      ["Puan", "rating"],
                      ["Yorum", "reviewCount"],
                      ["Fırsat", "leadScore"],
                    ]
                ).map(([label, column]) => (
                  <MobileSortButton
                    key={column}
                    label={label}
                    column={column as SortOption}
                    activeColumn={sortBy}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                ))}
              </div>
            </div>

            {sortedBusinesses.map((business) => {
              const reviewCardScore = getReviewCardScore(business);
              const webDesignScore = getWebScore(business);

              return (
                <article
                  key={getBusinessKey(business)}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-semibold text-[#0F172A]">
                        {business.businessName}
                      </h3>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {business.category} • {business.location}
                      </p>
                    </div>
                  </div>

                  {isReviewCardMode ? null : (
                    <div className="mt-4">
                      <WebsiteStatusBadge hasWebsite={business.hasWebsite} showLabel />
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricBadge label="Puan" value={business.rating.toFixed(1)} />
                    <MetricBadge label="Yorum" value={String(business.reviewCount)} />
                    {isReviewCardMode ? (
                      <MetricBadge
                        label="Yorum Kart"
                        value={`${reviewCardScore}/100`}
                        helper={getReviewCardFitLabel(reviewCardScore)}
                      />
                    ) : (
                      <MetricBadge
                        label="Web Tasarım"
                        value={`${webDesignScore}/100`}
                        helper={getWebDesignFitLabel(webDesignScore)}
                      />
                    )}
                  </div>

                  <div
                    className={`mt-4 grid gap-2 ${
                      isReviewCardMode
                        ? "grid-cols-[44px_44px_44px_1fr]"
                        : "grid-cols-[44px_44px_1fr]"
                    }`}
                  >
                    <FavoriteToggle
                      business={business}
                      isFavorite={isFavorite(business)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                    <MapsIconButton business={business} />
                    {isReviewCardMode ? (
                      <SubscriberToggle
                        business={business}
                        isSubscriber={isReviewCardSubscriber(business)}
                        onToggleSubscriber={handleToggleReviewCardSubscriber}
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedBusiness(business)}
                      className="btn-secondary min-h-11 px-3 text-sm"
                    >
                      Detay
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {selectedBusiness ? (
        <BusinessDetailModal
          business={selectedBusiness}
          intent={selectedIntent}
          isFavorite={isFavorite(selectedBusiness)}
          isSubscriber={isReviewCardSubscriber(selectedBusiness)}
          onToggleFavorite={handleToggleFavorite}
          onToggleSubscriber={handleToggleReviewCardSubscriber}
          onClose={() => setSelectedBusiness(null)}
        />
      ) : null}
    </AppShell>
  );
}

function getSortValue(business: BusinessResult, sortBy: SortOption): number {
  if (sortBy === "rating") {
    return business.rating;
  }

  if (sortBy === "reviewCount") {
    return business.reviewCount;
  }

  if (sortBy === "reviewCardScore") {
    return getReviewCardScore(business);
  }

  if (sortBy === "webDesignScore") {
    return getWebScore(business);
  }

  return business.leadScore;
}

function BusinessDetailModal({
  business,
  intent,
  isFavorite,
  isSubscriber,
  onToggleFavorite,
  onToggleSubscriber,
  onClose,
}: {
  business: BusinessResult;
  intent: SelectedIntent;
  isFavorite: boolean;
  isSubscriber: boolean;
  onToggleFavorite: (business: BusinessResult) => void;
  onToggleSubscriber: (business: BusinessResult) => void;
  onClose: () => void;
}) {
  const isReviewCardMode = intent === "review-card";
  const reviewCardScore = getReviewCardScore(business);
  const webDesignScore = getWebScore(business);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] bg-white px-5 py-4">
          <div>
            <p className="page-eyebrow">
              {isReviewCardMode ? "Yorum Kart Adayı" : "Web Tasarım Adayı"}
            </p>
            <h2 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-[#0F172A]">
              {business.businessName}
            </h2>
            <p className="mt-2 text-sm font-medium text-[#64748B]">
              {business.category} • {business.location}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4">
            Kapat
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <DetailItem label="Kategori" value={business.category} />
          <DetailItem label="Konum" value={business.location} />
          <DetailItem label="Puan" value={business.rating.toFixed(1)} />
          <DetailItem label="Yorum Sayısı" value={String(business.reviewCount)} />
          <DetailItem
            label="Web Sitesi"
            value={business.hasWebsite ? "Var" : "Web sitesi yok"}
          />
          <DetailItem label="Telefon" value={business.hasPhone ? "Var" : "Yok"} />
          {isReviewCardMode ? (
            <>
              <DetailItem
                label="Yorum Kart Skoru"
                value={`${reviewCardScore}/100 - ${getReviewCardFitLabel(
                  reviewCardScore,
                )}`}
              />
              <DetailItem label="Genel Fırsat Skoru" value={`⭐ ${business.leadScore}/100`} />
              <DetailItem
                label="Yorum Kart Aboneliği"
                value={isSubscriber ? "Abone" : "Abone değil"}
              />
              <DetailItem
                label="Favori Durumu"
                value={isFavorite ? "Favoride" : "Favoride değil"}
              />
            </>
          ) : (
            <>
              <DetailItem
                label="Web Tasarım Skoru"
                value={`${webDesignScore}/100 - ${getWebDesignFitLabel(
                  webDesignScore,
                )}`}
              />
              <DetailItem label="Genel Fırsat Skoru" value={`⭐ ${business.leadScore}/100`} />
              <DetailItem
                label="Favori Durumu"
                value={isFavorite ? "Favoride" : "Favoride değil"}
              />
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-5 py-4 sm:flex-row sm:justify-end">
          <a
            href={getSafeMapsUrl(business)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
          >
            Google Maps
          </a>
          <button
            type="button"
            onClick={() => onToggleFavorite(business)}
            title={isFavorite ? "Favoriden çıkar" : "Favoriye ekle"}
            aria-label={isFavorite ? "Favoriden çıkar" : "Favoriye ekle"}
            className="heart-button"
          >
            {isFavorite ? "❤️" : "♡"}
          </button>
          {isReviewCardMode ? (
            <SubscriberToggle
              business={business}
              isSubscriber={isSubscriber}
              onToggleSubscriber={onToggleSubscriber}
            />
          ) : null}
          <button type="button" onClick={onClose} className="btn-secondary">
            Kapat
          </button>
        </div>
      </section>
    </div>
  );
}

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortOption;
  activeColumn: SortOption;
  direction: SortDirection;
  onSort: (column: SortOption) => void;
}) {
  const isActive = activeColumn === column;
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "";

  return (
    <th className="text-left">
      <button
        type="button"
        onClick={() => onSort(column)}
        title={`${label} kolonuna göre sırala`}
        aria-label={`${label} kolonuna göre sırala`}
        className="inline-flex min-h-9 items-center gap-1 rounded-full border-2 border-transparent px-2 py-1 font-black transition hover:border-[#1E293B] hover:bg-white hover:underline"
      >
        <span>{label}</span>
        {indicator ? <span aria-hidden="true">{indicator}</span> : null}
      </button>
    </th>
  );
}

function MobileSortButton({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortOption;
  activeColumn: SortOption;
  direction: SortDirection;
  onSort: (column: SortOption) => void;
}) {
  const isActive = activeColumn === column;
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "";

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      aria-label={`${label} değerine göre sırala`}
      className={`min-h-10 rounded-lg border px-3 text-sm font-medium transition ${
        isActive
          ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]"
          : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F1F5F9]"
      }`}
    >
      {label} {indicator}
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}

function BusinessActions({
  business,
  isFavorite,
  isSubscriber,
  isReviewCardMode,
  onToggleFavorite,
  onToggleSubscriber,
  onOpenDetail,
}: {
  business: BusinessResult;
  isFavorite: boolean;
  isSubscriber: boolean;
  isReviewCardMode: boolean;
  onToggleFavorite: (business: BusinessResult) => void;
  onToggleSubscriber: (business: BusinessResult) => void;
  onOpenDetail: (business: BusinessResult) => void;
}) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
      <FavoriteToggle
        business={business}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />
      <MapsIconButton business={business} />
      {isReviewCardMode ? (
        <SubscriberToggle
          business={business}
          isSubscriber={isSubscriber}
          onToggleSubscriber={onToggleSubscriber}
        />
      ) : null}
      <button
        type="button"
        onClick={() => onOpenDetail(business)}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-3 text-xs font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(37,99,235,0.28)]"
      >
        Detay
      </button>
    </div>
  );
}

function FavoriteToggle({
  business,
  isFavorite,
  onToggleFavorite,
}: {
  business: BusinessResult;
  isFavorite: boolean;
  onToggleFavorite: (business: BusinessResult) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggleFavorite(business)}
      title={isFavorite ? "Favorilerden çıkar" : "Favoriye ekle"}
      aria-label={isFavorite ? "Favorilerden çıkar" : "Favoriye ekle"}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-semibold transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(37,99,235,0.28)] md:h-10 md:w-10 ${
        isFavorite
          ? "border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]"
          : "border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
      }`}
    >
      {isFavorite ? "❤️" : "♡"}
    </button>
  );
}

function MapsIconButton({ business }: { business: BusinessResult }) {
  return (
    <a
      href={getSafeMapsUrl(business)}
      target="_blank"
      rel="noreferrer"
      title="Google Maps'te aç"
      aria-label="Google Maps'te aç"
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-lg text-[#0F172A] transition hover:bg-[#F8FAFC] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(37,99,235,0.28)] md:h-10 md:w-10"
    >
      <span aria-hidden="true">📍</span>
    </a>
  );
}

function SubscriberToggle({
  business,
  isSubscriber,
  onToggleSubscriber,
}: {
  business: BusinessResult;
  isSubscriber: boolean;
  onToggleSubscriber: (business: BusinessResult) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggleSubscriber(business)}
      aria-label={
        isSubscriber
          ? "Yorum Kart aboneliğinden çıkar"
          : "Yorum Kart abonesi yap"
      }
      title={isSubscriber ? "Abone — çıkarmak için tıkla" : "Abone yap"}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-bold transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A] md:h-10 md:w-10 ${
        isSubscriber
          ? "border-[#16A34A] bg-[#16A34A] text-white hover:bg-[#15803D]"
          : "border-[#16A34A] bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]"
      }`}
    >
      ✓
    </button>
  );
}

function ScoreBadge({
  score,
  label,
  color,
}: {
  score: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="badge-pop" style={{ backgroundColor: color }}>
        {score}/100
      </span>
      <span className="text-xs font-extrabold text-slate-500">{label}</span>
    </div>
  );
}

function MetricBadge({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0F172A]">{value}</p>
      {helper ? (
        <p className="mt-1 text-xs text-[#64748B]">{helper}</p>
      ) : null}
    </div>
  );
}

function WebsiteStatusBadge({
  hasWebsite,
  showLabel = false,
}: {
  hasWebsite: boolean;
  showLabel?: boolean;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        hasWebsite
          ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
          : "border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]"
      }`}
    >
      {showLabel ? "Web sitesi: " : ""}
      {hasWebsite ? "Var" : "Yok"}
    </span>
  );
}

