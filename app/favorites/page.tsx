"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { createMapsSearchUrl } from "@/lib/business-normalization";
import {
  calculateReviewCardScore,
} from "@/lib/review-card-score";
import {
  FAVORITES_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
  SELECTED_INTENT_STORAGE_KEY,
} from "@/lib/storage-keys";
import {
  calculateWebDesignScore,
} from "@/lib/web-design-score";
import type { BusinessResult, ReviewCardSubscriber } from "@/types/business";

type FavoriteBusiness = BusinessResult & {
  note?: string;
  tag?: string;
  selectedIntent?: SelectedIntent;
};

type SelectedIntent = "review-card" | "web-design";
type SortColumn = "rating" | "reviewCount" | "primaryScore";
type SortDirection = "asc" | "desc";

const tagOptions = [
  { label: "Durum yok", value: "" },
  { label: "Görüşmeye Gidilecek", value: "Görüşmeye Gidilecek" },
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

function getFavorites(): FavoriteBusiness[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedFavorites = window.localStorage.getItem(FAVORITES_STORAGE_KEY);

  if (!savedFavorites) {
    return [];
  }

  try {
    return JSON.parse(savedFavorites) as FavoriteBusiness[];
  } catch {
    window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
    return [];
  }
}

function getReviewCardSubscribers(): ReviewCardSubscriber[] {
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
}

function getReviewCardScore(business: FavoriteBusiness): number {
  return calculateReviewCardScore({
    rating: business.rating,
    reviewCount: business.reviewCount,
    hasWebsite: business.hasWebsite,
    hasPhone: business.hasPhone,
  });
}

function getWebDesignScore(business: FavoriteBusiness): number {
  return calculateWebDesignScore(business);
}

function getSafeMapsUrl(business: FavoriteBusiness): string {
  return createMapsSearchUrl(
    business.businessName,
    business.location,
    "",
    "",
    business.mapsUrl,
  );
}

function getBusinessKey(business: Pick<FavoriteBusiness, "businessName" | "location">) {
  return `${business.businessName.trim().toLocaleLowerCase("tr-TR")}::${business.location.trim().toLocaleLowerCase("tr-TR")}`;
}

function getFavoriteIntent(
  business: FavoriteBusiness,
  fallbackIntent: SelectedIntent,
): SelectedIntent {
  return business.selectedIntent === "web-design" ||
    business.selectedIntent === "review-card"
    ? business.selectedIntent
    : fallbackIntent;
}

function getPrimaryScore(
  business: FavoriteBusiness,
  fallbackIntent: SelectedIntent,
): number {
  return getFavoriteIntent(business, fallbackIntent) === "web-design"
    ? getWebDesignScore(business)
    : getReviewCardScore(business);
}

function getScoreColumnLabel(
  businesses: FavoriteBusiness[],
  fallbackIntent: SelectedIntent,
): string {
  const intents = new Set(
    businesses.map((business) => getFavoriteIntent(business, fallbackIntent)),
  );

  if (intents.size > 1) {
    return "Ana Skor";
  }

  return intents.has("web-design") ? "Web Tasarım Skoru" : "Yorum Kart Skoru";
}

export default function FavoritesPage() {
  const [selectedIntent] = useState<SelectedIntent>(getSelectedIntent);
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>(getFavorites);
  const [sortColumn, setSortColumn] = useState<SortColumn>("primaryScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedDetailBusiness, setSelectedDetailBusiness] =
    useState<FavoriteBusiness | null>(null);
  const [reviewCardSubscribers, setReviewCardSubscribers] = useState<
    ReviewCardSubscriber[]
  >(getReviewCardSubscribers);
  const [searchQuery, setSearchQuery] = useState("");
  const isReviewCardMode = selectedIntent === "review-card";
  const scoreColumnLabel = getScoreColumnLabel(favorites, selectedIntent);

  const reviewCardSubscriberKeys = useMemo(() => {
    return new Set(
      reviewCardSubscribers.map((subscriber) => getBusinessKey(subscriber)),
    );
  }, [reviewCardSubscribers]);

  const summaryStats = useMemo(() => {
    const meetingCount = favorites.filter(
      (business) => business.tag === "Görüşmeye Gidilecek",
    ).length;
    const subscriberCount = favorites.filter((business) =>
      reviewCardSubscriberKeys.has(getBusinessKey(business)),
    ).length;

    return {
      totalFavorites: favorites.length,
      meetingCount,
      subscriberCount,
    };
  }, [favorites, reviewCardSubscriberKeys]);

  const filteredFavorites = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedSearch) {
      return favorites;
    }

    return favorites.filter((business) => {
      const searchableText = [
        business.businessName,
        business.category,
        business.location,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedSearch);
    });
  }, [favorites, searchQuery]);

  const sortedFavorites = useMemo(() => {
    return [...filteredFavorites].sort((firstBusiness, secondBusiness) => {
      const firstValue = getSortValue(firstBusiness, sortColumn, selectedIntent);
      const secondValue = getSortValue(secondBusiness, sortColumn, selectedIntent);
      const directionMultiplier = sortDirection === "asc" ? 1 : -1;

      return (firstValue - secondValue) * directionMultiplier;
    });
  }, [filteredFavorites, selectedIntent, sortColumn, sortDirection]);

  function saveFavorites(updatedFavorites: FavoriteBusiness[]) {
    setFavorites(updatedFavorites);
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
  }

  function saveReviewCardSubscribers(
    updatedSubscribers: ReviewCardSubscriber[],
  ) {
    setReviewCardSubscribers(updatedSubscribers);
    window.localStorage.setItem(
      REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
      JSON.stringify(updatedSubscribers),
    );
  }

  function isReviewCardSubscriber(business: FavoriteBusiness) {
    return reviewCardSubscriberKeys.has(getBusinessKey(business));
  }

  function handleToggleSubscriber(business: FavoriteBusiness) {
    const businessKey = getBusinessKey(business);

    if (isReviewCardSubscriber(business)) {
      saveReviewCardSubscribers(
        reviewCardSubscribers.filter(
          (subscriber) => getBusinessKey(subscriber) !== businessKey,
        ),
      );
      return;
    }

    saveReviewCardSubscribers([
      ...reviewCardSubscribers,
      {
        ...business,
        subscribedAt: new Date().toISOString(),
        status: "Aktif Abone",
      },
    ]);
  }

  function handleRemoveFavorite(business: FavoriteBusiness) {
    const updatedFavorites = favorites.filter(
      (favorite) => getBusinessKey(favorite) !== getBusinessKey(business),
    );

    if (
      selectedDetailBusiness &&
      getBusinessKey(selectedDetailBusiness) === getBusinessKey(business)
    ) {
      setSelectedDetailBusiness(null);
    }

    saveFavorites(updatedFavorites);
  }

  function handleUpdateFavorite(
    business: FavoriteBusiness,
    updates: Pick<FavoriteBusiness, "note" | "tag">,
  ) {
    const updatedFavorites = favorites.map((favorite) => {
      const isSameBusiness =
        getBusinessKey(favorite) === getBusinessKey(business);

      return isSameBusiness ? { ...favorite, ...updates } : favorite;
    });

    if (
      selectedDetailBusiness &&
      getBusinessKey(selectedDetailBusiness) === getBusinessKey(business)
    ) {
      setSelectedDetailBusiness({ ...selectedDetailBusiness, ...updates });
    }

    saveFavorites(updatedFavorites);
  }

  function handleSort(nextColumn: SortColumn) {
    if (nextColumn === sortColumn) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortColumn(nextColumn);
    setSortDirection("desc");
  }

  function handleMobileSort(nextColumn: SortColumn) {
    setSortColumn(nextColumn);
    setSortDirection("desc");
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
        <header>
          <p className="page-eyebrow">{isReviewCardMode ? "Yorum Kart" : "Web Tasarım"} Modu</p>
          <h1 className="page-title mt-5">Favoriler</h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            Görüşmeye gidilecek işletmeleri sade bir listede takip edin.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Toplam Favori"
            value={summaryStats.totalFavorites}
            color="#EDE9FE"
          />
          <SummaryCard
            label="Görüşmeye Gidilecek"
            value={summaryStats.meetingCount}
            color="#FBBF24"
          />
          <SummaryCard
            label="Abone Yapıldı"
            value={summaryStats.subscriberCount}
            color="#34D399"
          />
        </section>

        {favorites.length === 0 ? (
          <section className="card-pop bg-white p-6">
            <h2 className="font-heading text-xl font-semibold text-[#0F172A]">
              Henüz favori işletme yok.
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Sonuçlar sayfasından görüşmek istediğiniz işletmeleri favorilere ekleyin.
            </p>
            <a href="/results" className="btn-primary mt-5 inline-flex w-fit">
              Sonuçlara Git
            </a>
          </section>
        ) : (
          <section className="grid gap-4">
            <div className="card-pop p-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-[#0F172A]">
                  Favorilerde ara
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="İşletme adı, kategori veya konum ara..."
                  className="input-pop w-full"
                />
              </label>
            </div>

            <div className="card-pop overflow-visible">
              <div className="border-b border-[#E2E8F0] bg-white px-5 py-4">
                <h2 className="font-heading text-lg font-semibold text-[#0F172A]">
                  Favori İşletmeler
                </h2>
                <p className="mt-1 text-sm text-[#64748B]">
                  {sortedFavorites.length} işletme gösteriliyor.
                </p>
              </div>

              <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] p-3 lg:hidden">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold text-[#64748B]">
                    Sırala
                  </span>
                  <select
                    value={sortColumn}
                    onChange={(event) =>
                      handleMobileSort(event.target.value as SortColumn)
                    }
                    className="input-pop min-h-10 w-full text-sm"
                  >
                    <option value="rating">Puan</option>
                    <option value="reviewCount">Yorum</option>
                    <option value="primaryScore">{scoreColumnLabel}</option>
                  </select>
                </label>
              </div>

              <div className="hidden border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] lg:grid lg:grid-cols-[minmax(280px,1fr)_110px_120px_170px_170px] lg:items-center">
                <span>İşletme</span>
                <FavoriteSortableHeader
                  label="Puan"
                  column="rating"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <FavoriteSortableHeader
                  label="Yorum"
                  column="reviewCount"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <FavoriteSortableHeader
                  label={scoreColumnLabel}
                  column="primaryScore"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <span className="text-right">Aksiyonlar</span>
              </div>

              {sortedFavorites.length === 0 ? (
                <div className="p-5">
                  <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
                    Aramaya uygun favori işletme bulunamadı.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {sortedFavorites.map((business) => (
                    <FavoriteCompactItem
                      key={`${business.businessName}-${business.location}`}
                      business={business}
                      fallbackIntent={selectedIntent}
                      isSubscriber={isReviewCardSubscriber(business)}
                      onOpenDetail={setSelectedDetailBusiness}
                      onToggleSubscriber={handleToggleSubscriber}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {selectedDetailBusiness ? (
        <FavoriteDetailModal
          business={selectedDetailBusiness}
          fallbackIntent={selectedIntent}
          isSubscriber={isReviewCardSubscriber(selectedDetailBusiness)}
          onUpdateFavorite={handleUpdateFavorite}
          onToggleSubscriber={handleToggleSubscriber}
          onRemoveFavorite={handleRemoveFavorite}
          onClose={() => setSelectedDetailBusiness(null)}
        />
      ) : null}
    </AppShell>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <article className="card-pop bg-white p-4">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-2 font-heading text-2xl font-semibold text-[#0F172A]">
        {value}
      </p>
    </article>
  );
}

function FavoriteCompactItem({
  business,
  fallbackIntent,
  isSubscriber,
  onOpenDetail,
  onToggleSubscriber,
}: {
  business: FavoriteBusiness;
  fallbackIntent: SelectedIntent;
  isSubscriber: boolean;
  onOpenDetail: (business: FavoriteBusiness) => void;
  onToggleSubscriber: (business: FavoriteBusiness) => void;
}) {
  const businessIntent = getFavoriteIntent(business, fallbackIntent);
  const isReviewCardBusiness = businessIntent === "review-card";
  const primaryScore = getPrimaryScore(business, fallbackIntent);
  const primaryScoreLabel = isReviewCardBusiness
    ? "Yorum Kart Skoru"
    : "Web Tasarım Skoru";

  return (
    <article className="grid gap-4 bg-white p-4 transition hover:bg-[#F8FAFC] lg:grid-cols-[minmax(280px,1fr)_110px_120px_170px_170px] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-base font-semibold text-[#0F172A]">
            {business.businessName}
          </h3>
          <span className="badge-pop bg-[#EFF6FF] text-[#2563EB]">
            {isReviewCardBusiness ? "Yorum Kart" : "Web Tasarım"}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#64748B]">
          {business.category} • {business.location}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
          <CompactMetric label="Puan" value={business.rating.toFixed(1)} />
          <CompactMetric label="Yorum" value={business.reviewCount} />
          <CompactMetric label={primaryScoreLabel} value={`${primaryScore}/100`} />
        </div>
      </div>

      <DesktopMetricValue value={business.rating.toFixed(1)} />
      <DesktopMetricValue value={business.reviewCount} />
      <DesktopMetricValue value={`${primaryScore}/100`} />

      <div
        className={`grid gap-2 lg:flex lg:flex-nowrap lg:items-center lg:justify-end lg:whitespace-nowrap ${
          isReviewCardBusiness
            ? "grid-cols-[44px_44px_1fr]"
            : "grid-cols-[44px_1fr]"
        }`}
      >
        <MapsIconButton business={business} />
        {isReviewCardBusiness ? (
          <SubscriberButton
            business={business}
            isSubscriber={isSubscriber}
            onToggleSubscriber={onToggleSubscriber}
          />
        ) : null}
        <button
          type="button"
          onClick={() => onOpenDetail(business)}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-3 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(37,99,235,0.28)] lg:h-10 lg:text-xs"
        >
          Detay
        </button>
      </div>
    </article>
  );
}

function FavoriteDetailModal({
  business,
  fallbackIntent,
  isSubscriber,
  onUpdateFavorite,
  onToggleSubscriber,
  onRemoveFavorite,
  onClose,
}: {
  business: FavoriteBusiness;
  fallbackIntent: SelectedIntent;
  isSubscriber: boolean;
  onUpdateFavorite: (
    business: FavoriteBusiness,
    updates: Pick<FavoriteBusiness, "note" | "tag">,
  ) => void;
  onToggleSubscriber: (business: FavoriteBusiness) => void;
  onRemoveFavorite: (business: FavoriteBusiness) => void;
  onClose: () => void;
}) {
  const businessIntent = getFavoriteIntent(business, fallbackIntent);
  const isReviewCardMode = businessIntent === "review-card";
  const reviewCardScore = getReviewCardScore(business);
  const webDesignScore = getWebDesignScore(business);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] bg-white px-5 py-4">
          <div>
            <p className="page-eyebrow">
              {isReviewCardMode ? "Yorum Kart" : "Web Tasarım"}
            </p>
            <h2 className="mt-3 font-heading text-2xl font-semibold text-[#0F172A]">
              {business.businessName}
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              {business.category} • {business.location}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4">
            Kapat
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricBadge label="Puan" value={business.rating.toFixed(1)} />
            <MetricBadge label="Yorum" value={String(business.reviewCount)} />
            {isReviewCardMode ? (
              <MetricBadge
                label="Yorum Kart"
                value={`${reviewCardScore}/100`}
              />
            ) : (
            <MetricBadge
                label="Web Tasarım"
                value={`${webDesignScore}/100`}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge active={business.hasWebsite} label="Web Sitesi" />
            <StatusBadge active={business.hasPhone} label="Telefon" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#0F172A]">Durum</span>
              <TagSelect
                value={business.tag ?? ""}
                onChange={(tag) => onUpdateFavorite(business, { tag })}
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-[#0F172A]">Not</span>
              <textarea
                value={business.note ?? ""}
                onChange={(event) =>
                  onUpdateFavorite(business, { note: event.target.value })
                }
                placeholder="Satış notu ekle"
                className="input-pop min-h-28"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
          <a
            href={getSafeMapsUrl(business)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
          >
            Google Maps
          </a>
          {isReviewCardMode ? (
            <SubscriberButton
              business={business}
              isSubscriber={isSubscriber}
              onToggleSubscriber={onToggleSubscriber}
            />
          ) : null}
          <button
            type="button"
            onClick={() => onRemoveFavorite(business)}
            className="btn-danger min-h-11 px-4 text-sm"
          >
            Favoriden Çıkar
          </button>
        </div>
      </section>
    </div>
  );
}

function getSortValue(
  business: FavoriteBusiness,
  column: SortColumn,
  fallbackIntent: SelectedIntent,
): number {
  if (column === "rating") {
    return business.rating;
  }

  if (column === "reviewCount") {
    return business.reviewCount;
  }

  if (column === "primaryScore") {
    return getPrimaryScore(business, fallbackIntent);
  }

  return getPrimaryScore(business, fallbackIntent);
}

function FavoriteSortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = activeColumn === column;
  const indicator = isActive ? (direction === "asc" ? "↑" : "↓") : "";

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`inline-flex min-h-8 w-fit items-center gap-1 rounded-md px-2 py-1 text-left text-xs font-semibold transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(37,99,235,0.28)] ${
        isActive
          ? "bg-[#EFF6FF] text-[#2563EB]"
          : "text-[#475569] hover:bg-white hover:text-[#0F172A]"
      }`}
      aria-label={`${label} başlığına göre sırala`}
      title={`${label} başlığına göre sırala`}
    >
      <span>{label}</span>
      {indicator ? <span aria-hidden="true">{indicator}</span> : null}
    </button>
  );
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}

function DesktopMetricValue({ value }: { value: string | number }) {
  return (
    <div className="hidden text-sm font-semibold text-[#0F172A] lg:block">
      {value}
    </div>
  );
}

function MapsIconButton({ business }: { business: FavoriteBusiness }) {
  return (
    <a
      href={getSafeMapsUrl(business)}
      target="_blank"
      rel="noreferrer"
      title="Google Maps'te aç"
      aria-label="Google Maps'te aç"
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-lg text-[#0F172A] transition hover:bg-[#F8FAFC] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[rgba(37,99,235,0.28)] lg:h-10 lg:w-10"
    >
      <span aria-hidden="true">📍</span>
    </a>
  );
}

function SubscriberButton({
  business,
  isSubscriber,
  onToggleSubscriber,
  wide = false,
}: {
  business: FavoriteBusiness;
  isSubscriber: boolean;
  onToggleSubscriber: (business: FavoriteBusiness) => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggleSubscriber(business)}
      className={`${wide ? "w-full" : ""} inline-flex h-11 w-11 items-center justify-center rounded-lg border text-lg font-bold transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A] lg:h-10 lg:w-10 ${
        isSubscriber
          ? "border-[#16A34A] bg-[#16A34A] text-white hover:bg-[#15803D]"
          : "border-[#16A34A] bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7]"
      }`}
      aria-label={
        isSubscriber
          ? "Yorum Kart aboneliğinden çıkar"
          : "Yorum Kart abonesi yap"
      }
      title={isSubscriber ? "Abone — çıkarmak için tıkla" : "Abone yap"}
    >
      ✓
    </button>
  );
}
function TagSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (tag: string) => void;
}) {
  const selectedValue = tagOptions.some((option) => option.value === value)
    ? value
    : "";

  return (
    <select
      value={selectedValue}
      onChange={(event) => onChange(event.target.value)}
      className="input-pop w-full"
    >
      {tagOptions.map((option) => (
        <option key={option.value || "empty"} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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

function StatusBadge({ active, label }: { active: boolean; label?: string }) {
  return (
    <span className={`badge-pop ${active ? "bg-[#F0FDF4] text-[#166534]" : "bg-[#F1F5F9] text-[#475569]"}`}>
      {label ? `${label}: ` : ""}
      {active ? "Var" : "Yok"}
    </span>
  );
}

