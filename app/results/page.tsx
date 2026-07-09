"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { saveAnalysisToHistory } from "@/lib/analysis-history";
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
  BusinessResult,
  LatestAnalysis,
  SelectedIntent,
} from "@/types/business";

type SortOption =
  | "leadScore"
  | "rating"
  | "reviewCount"
  | "reviewCardScore"
  | "webDesignScore";
type SortDirection = "asc" | "desc";

const allCategoriesOption = "Tüm kategoriler";

const demoBusinesses: Array<Omit<BusinessResult, "leadScore">> = [
  {
    businessName: "Moda Kahve Evi",
    category: "Kafe",
    location: "İstanbul / Kadıköy",
    rating: 3.8,
    reviewCount: 284,
    hasWebsite: false,
    hasPhone: true,
    mapsUrl: "https://maps.google.com",
  },
  {
    businessName: "Şehir Çekirdeği",
    category: "Kafe",
    location: "İstanbul / Beşiktaş",
    rating: 4.1,
    reviewCount: 197,
    hasWebsite: false,
    hasPhone: true,
    mapsUrl: "https://maps.google.com",
  },
  {
    businessName: "Kuzey Diş Kliniği",
    category: "Diş Kliniği",
    location: "Ankara / Çankaya",
    rating: 3.9,
    reviewCount: 126,
    hasWebsite: true,
    hasPhone: true,
    mapsUrl: "https://maps.google.com",
  },
  {
    businessName: "Işıltı Güzellik Salonu",
    category: "Güzellik Salonu",
    location: "İzmir / Konak",
    rating: 4.4,
    reviewCount: 342,
    hasWebsite: false,
    hasPhone: true,
    mapsUrl: "https://maps.google.com",
  },
  {
    businessName: "Mahalle Spor Salonu",
    category: "Spor Salonu",
    location: "Bursa / Nilüfer",
    rating: 4.0,
    reviewCount: 88,
    hasWebsite: false,
    hasPhone: false,
    mapsUrl: "https://maps.google.com",
  },
  {
    businessName: "Usta Oto Servis",
    category: "Oto Servis",
    location: "İstanbul / Ataşehir",
    rating: 4.6,
    reviewCount: 411,
    hasWebsite: true,
    hasPhone: true,
    mapsUrl: "https://maps.google.com",
  },
  {
    businessName: "Yeşil Tabak Mutfağı",
    category: "Restoran",
    location: "Antalya / Muratpaşa",
    rating: 4.2,
    reviewCount: 156,
    hasWebsite: true,
    hasPhone: true,
    mapsUrl: "https://maps.google.com",
  },
  {
    businessName: "Kadraj Stüdyo",
    category: "Fotoğraf Stüdyosu",
    location: "İstanbul / Şişli",
    rating: 3.7,
    reviewCount: 52,
    hasWebsite: false,
    hasPhone: true,
    mapsUrl: "https://maps.google.com",
  },
];

function getSelectedIntent(): SelectedIntent {
  if (typeof window === "undefined") {
    return "review-card";
  }

  return window.localStorage.getItem(SELECTED_INTENT_STORAGE_KEY) ===
    "web-design"
    ? "web-design"
    : "review-card";
}

function getBusinessKey(business: Pick<BusinessResult, "businessName" | "location">) {
  return `${business.businessName}-${business.location}`;
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

export default function ResultsPage() {
  const [selectedIntent] = useState<SelectedIntent>(getSelectedIntent);
  const [latestAnalysis] = useState<LatestAnalysis | null>(() => {
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
  });
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
    BusinessResult[]
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
      return JSON.parse(savedSubscribers) as BusinessResult[];
    } catch {
      window.localStorage.removeItem(REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY);
      return [];
    }
  });
  const [websiteMissingOnly, setWebsiteMissingOnly] = useState(
    selectedIntent === "web-design",
  );
  const [phoneAvailableOnly, setPhoneAvailableOnly] = useState(false);
  const [excludeReviewCardSubscribers, setExcludeReviewCardSubscribers] =
    useState(false);
  const [selectedCategory, setSelectedCategory] = useState(allCategoriesOption);
  const [sortBy, setSortBy] = useState<SortOption>(
    selectedIntent === "web-design" ? "webDesignScore" : "reviewCardScore",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);
  const isReviewCardMode = selectedIntent === "review-card";

  useEffect(() => {
    if (!latestAnalysis) {
      return;
    }

    saveAnalysisToHistory({
      ...latestAnalysis,
      selectedIntent: latestAnalysis.selectedIntent ?? selectedIntent,
    });
  }, [latestAnalysis, selectedIntent]);

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
    const businesses = latestAnalysis?.businesses ?? demoBusinesses;

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

  const filteredBusinesses = useMemo(() => {
    return businessesWithScore
      .filter((business) =>
        selectedCategory === allCategoriesOption
          ? true
          : business.category === selectedCategory,
      )
      .filter((business) => (websiteMissingOnly ? !business.hasWebsite : true))
      .filter((business) => (phoneAvailableOnly ? business.hasPhone : true))
      .filter((business) =>
        excludeReviewCardSubscribers
          ? !reviewCardSubscriberKeys.has(getBusinessKey(business))
          : true,
      )
      .toSorted((first, second) => {
        const directionMultiplier = sortDirection === "asc" ? 1 : -1;
        const firstValue = getSortValue(first, sortBy);
        const secondValue = getSortValue(second, sortBy);

        return (firstValue - secondValue) * directionMultiplier;
      });
  }, [
    businessesWithScore,
    excludeReviewCardSubscribers,
    phoneAvailableOnly,
    reviewCardSubscriberKeys,
    selectedCategory,
    sortBy,
    sortDirection,
    websiteMissingOnly,
  ]);

  const categoryOptions = useMemo(() => {
    return [
      allCategoriesOption,
      ...Array.from(
        new Set(businessesWithScore.map((business) => business.category)),
      ).toSorted((first, second) => first.localeCompare(second, "tr")),
    ];
  }, [businessesWithScore]);

  const summary = useMemo(
    () => ({
      totalBusinesses: businessesWithScore.length,
      highPotentialLeads: businessesWithScore.filter((business) => business.leadScore >= 75)
        .length,
      withoutWebsite: businessesWithScore.filter((business) => !business.hasWebsite).length,
    }),
    [businessesWithScore],
  );

  function handleClearFilters() {
    setWebsiteMissingOnly(false);
    setPhoneAvailableOnly(false);
    setExcludeReviewCardSubscribers(false);
    setSelectedCategory(allCategoriesOption);
    setSortBy(isReviewCardMode ? "reviewCardScore" : "webDesignScore");
    setSortDirection("desc");
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

    const rows = filteredBusinesses.map((business) => [
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
      (favorite) =>
        favorite.businessName === business.businessName &&
        favorite.location === business.location,
    );
  }

  function handleAddFavorite(business: BusinessResult) {
    if (isFavorite(business)) {
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
      : [...reviewCardSubscribers, business];

    setReviewCardSubscribers(updatedSubscribers);
    window.localStorage.setItem(
      REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
      JSON.stringify(updatedSubscribers),
    );
  }

  function getLeadScoreExplanation(leadScore: number): string {
    if (leadScore >= 85) {
      return "Çok yüksek potansiyel";
    }

    if (leadScore >= 70) {
      return "Yüksek potansiyel";
    }

    if (leadScore >= 50) {
      return "Orta potansiyel";
    }

    return "Düşük potansiyel";
  }

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
              <p className="mt-3 w-fit rounded-full border-2 border-[#1E293B] bg-[#34D399] px-3 py-1 text-xs font-black text-[#1E293B]">
                {latestAnalysis.country} / {latestAnalysis.city} /{" "}
                {latestAnalysis.district} - {latestAnalysis.category}
              </p>
            ) : null}
          </div>
          <Link href="/" className="btn-secondary w-fit">
            Modu Değiştir
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Toplam İşletme" value={summary.totalBusinesses} color="#FBBF24" />
          <SummaryCard
            label="Yüksek Potansiyelli Müşteri Adayı"
            value={summary.highPotentialLeads}
            color="#34D399"
          />
          <SummaryCard
            label="Web Sitesi Olmayan"
            value={summary.withoutWebsite}
            color="#F472B6"
          />
        </section>

        <section className="card-pop overflow-hidden">
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((isOpen) => !isOpen)}
            aria-expanded={isFilterPanelOpen}
            className="flex w-full flex-col gap-3 border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4 text-left transition hover:bg-[#FBBF24] sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-heading text-xl font-black text-[#1E293B]">
                Filtrele
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-600">
                Kategori, web sitesi ve telefon filtreleri.
              </p>
            </div>
            <span className="badge-pop bg-white">
              {isFilterPanelOpen ? "Kapat" : "Aç"}
            </span>
          </button>

          {isFilterPanelOpen ? (
            <div className="grid gap-5 p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <FilterField label="Kategori">
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="input-pop"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn-secondary w-full md:w-auto"
                >
                  Filtreleri Temizle
                </button>
              </div>

              <div className="grid gap-3 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 md:grid-cols-3">
                <CheckboxField
                  checked={websiteMissingOnly}
                  onChange={setWebsiteMissingOnly}
                  label="Yalnızca web sitesi olmayanlar"
                />
                <CheckboxField
                  checked={phoneAvailableOnly}
                  onChange={setPhoneAvailableOnly}
                  label="Yalnızca telefonu olanlar"
                />
                <CheckboxField
                  checked={excludeReviewCardSubscribers}
                  onChange={setExcludeReviewCardSubscribers}
                  label="Yorum Kart abonelerini listeden çıkar"
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="card-pop overflow-hidden">
          <div className="flex flex-col gap-3 border-b-2 border-[#1E293B] bg-[#FBBF24] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-black text-[#1E293B]">
                İşletme Listesi
              </h2>
              <p className="mt-1 text-sm font-bold text-[#1E293B]">
                {filteredBusinesses.length} işletme gösteriliyor.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredBusinesses.length === 0}
              className="btn-primary"
            >
              CSV İndir
            </button>
          </div>

          <div className="hidden md:block">
            <table className="table-pop w-full table-fixed">
              <thead>
                <tr>
                  <th className="w-[28%] text-left">İşletme</th>
                  {isReviewCardMode ? null : (
                    <th className="text-left">Web Sitesi</th>
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
                  <SortableHeader
                    label="Fırsat Skoru"
                    column="leadScore"
                    activeColumn={sortBy}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="w-[22%] text-left">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {filteredBusinesses.map((business) => {
                  const reviewCardScore = getReviewCardScore(business);
                  const webDesignScore = getWebScore(business);

                  return (
                    <tr key={getBusinessKey(business)}>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold">
                            {business.businessName}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {business.category} • {business.location}
                          </span>
                          {business.hasWebsite ? null : (
                            <span className="badge-pop w-fit bg-[#FBBF24]">
                              Web sitesi yok
                            </span>
                          )}
                        </div>
                      </td>
                      {isReviewCardMode ? null : (
                        <td>
                          <StatusBadge active={business.hasWebsite} label="Web" />
                        </td>
                      )}
                      <td className="font-extrabold">{business.rating.toFixed(1)}</td>
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
                        <span className="badge-pop bg-[#FBBF24]">
                          ⭐ {business.leadScore}/100
                        </span>
                      </td>
                      <td>
                        <BusinessActions
                          business={business}
                          intent={selectedIntent}
                          isFavorite={isFavorite(business)}
                          isSubscriber={isReviewCardSubscriber(business)}
                          onAddFavorite={handleAddFavorite}
                          onAddSubscriber={handleToggleReviewCardSubscriber}
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
            <div className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-3">
              <p className="text-xs font-black uppercase text-slate-500">Sırala</p>
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

            {filteredBusinesses.map((business) => {
              const reviewCardScore = getReviewCardScore(business);
              const webDesignScore = getWebScore(business);

              return (
                <article
                  key={getBusinessKey(business)}
                  className="rounded-[24px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-heading text-xl font-black text-[#1E293B]">
                        {business.businessName}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {business.category} • {business.location}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddFavorite(business)}
                      title={isFavorite(business) ? "Favoride" : "Favoriye ekle"}
                      aria-label={isFavorite(business) ? "Favoride" : "Favoriye ekle"}
                      className="heart-button shrink-0"
                    >
                      {isFavorite(business) ? "❤️" : "♡"}
                    </button>
                  </div>

                  {isReviewCardMode ? null : (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusBadge active={business.hasWebsite} label="Web Sitesi" />
                      <StatusBadge active={business.hasPhone} label="Telefon" />
                      {!business.hasWebsite ? (
                        <span className="badge-pop bg-[#FBBF24]">
                          Web sitesi yok
                        </span>
                      ) : null}
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
                    <MetricBadge
                      label="Fırsat Skoru"
                      value={`⭐ ${business.leadScore}/100`}
                    />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {isReviewCardMode ? (
                      <button
                        type="button"
                        onClick={() => handleToggleReviewCardSubscriber(business)}
                        className={`btn-secondary w-full ${
                          isReviewCardSubscriber(business) ? "bg-[#34D399]" : ""
                        }`}
                      >
                        {isReviewCardSubscriber(business)
                          ? "Abonelikten Çıkar"
                          : "Yorum Kart Abonesi"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedBusiness(business)}
                      className="btn-primary w-full"
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
          onAddFavorite={handleAddFavorite}
          onToggleSubscriber={handleToggleReviewCardSubscriber}
          onClose={() => setSelectedBusiness(null)}
          leadExplanation={getLeadScoreExplanation(selectedBusiness.leadScore)}
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
  onAddFavorite,
  onToggleSubscriber,
  onClose,
  leadExplanation,
}: {
  business: BusinessResult;
  intent: SelectedIntent;
  isFavorite: boolean;
  isSubscriber: boolean;
  onAddFavorite: (business: BusinessResult) => void;
  onToggleSubscriber: (business: BusinessResult) => void;
  onClose: () => void;
  leadExplanation: string;
}) {
  const isReviewCardMode = intent === "review-card";
  const reviewCardScore = getReviewCardScore(business);
  const webDesignScore = getWebScore(business);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
      <section className="hard-shadow-lg max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border-2 border-[#1E293B] bg-white">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4">
          <div>
            <p className="page-eyebrow bg-[#34D399]">
              {isReviewCardMode ? "Yorum Kart Adayı" : "Web Tasarım Adayı"}
            </p>
            <h2 className="mt-3 font-heading text-3xl font-black tracking-tight text-[#1E293B]">
              {business.businessName}
            </h2>
            <p className="mt-2 text-sm font-extrabold text-slate-600">
              {isReviewCardMode
                ? "Yorum ve güven artırma hizmetleri için değerlendirilebilir."
                : "Web sitesi ve dijital vitrin teklifi için değerlendirilebilir."}
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
          <DetailItem label="Fırsat Skoru" value={`⭐ ${business.leadScore}/100`} />
          <DetailItem label="Potansiyel" value={leadExplanation} />
          {isReviewCardMode ? (
            <>
              <DetailItem
                label="Yorum Kart Skoru"
                value={`${reviewCardScore}/100 - ${getReviewCardFitLabel(
                  reviewCardScore,
                )}`}
              />
              <DetailItem
                label="Yorum Kart Aboneliği"
                value={isSubscriber ? "Abone" : "Abone değil"}
              />
            </>
          ) : (
            <DetailItem
              label="Web Tasarım Skoru"
              value={`${webDesignScore}/100 - ${getWebDesignFitLabel(
                webDesignScore,
              )}`}
            />
          )}
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-[#1E293B] px-5 py-4 sm:flex-row sm:justify-end">
          <a
            href={getSafeMapsUrl(business)}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            Google Maps’te Aç
          </a>
          <button
            type="button"
            onClick={() => onAddFavorite(business)}
            title={isFavorite ? "Favoride" : "Favoriye ekle"}
            aria-label={isFavorite ? "Favoride" : "Favoriye ekle"}
            className="heart-button"
          >
            {isFavorite ? "❤️" : "♡"}
          </button>
          {isReviewCardMode ? (
            <button
              type="button"
              onClick={() => onToggleSubscriber(business)}
              className="btn-secondary"
            >
              {isSubscriber ? "Abonelikten Çıkar" : "Yorum Kart Abonesi"}
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="btn-secondary">
            Kapat
          </button>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <article className="card-pop relative overflow-hidden p-5 transition motion-safe:hover:-translate-y-1">
      <div
        className="absolute -right-4 -top-5 h-20 w-20 rotate-12 rounded-[28px] border-2 border-[#1E293B]"
        style={{ backgroundColor: color }}
      />
      <p className="relative text-sm font-extrabold text-slate-600">{label}</p>
      <p className="relative mt-4 font-heading text-5xl font-black text-[#1E293B]">
        {value}
      </p>
    </article>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-black text-[#1E293B]">{label}</span>
      {children}
    </label>
  );
}

function CheckboxField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-extrabold text-[#1E293B]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-[#8B5CF6]"
      />
      {label}
    </label>
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
      className={`min-h-11 rounded-full border-2 border-[#1E293B] px-3 text-sm font-black transition ${
        isActive ? "bg-[#8B5CF6] text-white" : "bg-white hover:bg-[#FBBF24]"
      }`}
    >
      {label} {indicator}
    </button>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-extrabold text-[#1E293B]">{value}</p>
    </div>
  );
}

function BusinessActions({
  business,
  intent,
  isFavorite,
  isSubscriber,
  onAddFavorite,
  onAddSubscriber,
  onOpenDetail,
}: {
  business: BusinessResult;
  intent: SelectedIntent;
  isFavorite: boolean;
  isSubscriber: boolean;
  onAddFavorite: (business: BusinessResult) => void;
  onAddSubscriber: (business: BusinessResult) => void;
  onOpenDetail: (business: BusinessResult) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onAddFavorite(business)}
        title={isFavorite ? "Favoride" : "Favoriye ekle"}
        aria-label={isFavorite ? "Favoride" : "Favoriye ekle"}
        className="heart-button"
      >
        {isFavorite ? "❤️" : "♡"}
      </button>
      {intent === "review-card" ? (
        <button
          type="button"
          onClick={() => onAddSubscriber(business)}
          className={`badge-pop min-h-10 ${isSubscriber ? "bg-[#34D399]" : "bg-white hover:bg-[#FBBF24]"}`}
        >
          {isSubscriber ? "Abonelikten Çıkar" : "Yorum Kart"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onOpenDetail(business)}
        className="btn-secondary min-h-10 px-3 text-xs"
      >
        Detay
      </button>
    </div>
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
    <div className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-[#1E293B]">{value}</p>
      {helper ? (
        <p className="mt-1 text-xs font-extrabold text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span className={`badge-pop ${active ? "bg-[#34D399]" : "bg-[#FBBF24]"}`}>
      {label ? `${label}: ` : ""}
      {active ? "Var" : "Yok"}
    </span>
  );
}
