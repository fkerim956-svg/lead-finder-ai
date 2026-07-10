"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { createMapsSearchUrl } from "@/lib/business-normalization";
import {
  calculateReviewCardScore,
  generateReviewCardMessage,
  getReviewCardCandidateReasons,
  getReviewCardMessageTypeLabel,
  getReviewCardPlacementSuggestion,
  getReviewCardRiskLevel,
  getReviewCardSalesAngle,
  type ReviewCardMessageType,
} from "@/lib/review-card-score";
import {
  FAVORITES_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
  SELECTED_INTENT_STORAGE_KEY,
} from "@/lib/storage-keys";
import {
  calculateWebDesignScore,
  getWebDesignFitLabel,
} from "@/lib/web-design-score";
import type { BusinessResult, ReviewCardSubscriber } from "@/types/business";

type FavoriteBusiness = BusinessResult & {
  note?: string;
  tag?: string;
};

type SelectedIntent = "review-card" | "web-design";
type SortColumn = "rating" | "reviewCount" | "leadScore" | "reviewCardScore" | "webDesignScore";
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

function createSalesMessage(
  business: FavoriteBusiness,
  intent: SelectedIntent,
  messageType: ReviewCardMessageType = "professional-whatsapp",
): string {
  if (intent === "web-design") {
    const websiteText = business.hasWebsite
      ? "Web siteniz olduğunu gördüm; yine de Google Maps görünürlüğünüzden gelen ziyaretçilerin daha güven veren ve dönüşüm odaklı bir sayfaya yönlenmesi için bazı iyileştirme fırsatları olabilir."
      : "Google profilinizde web sitesi görünmüyor. Bu durum sizi araştıran müşterilerin güvenini ve iletişime geçme oranını düşürebilir.";
    const webDesignScore = getWebDesignScore(business);

    return `Merhaba ${business.businessName} ekibi, kısa bir gözlemimi paylaşmak istedim.

Google profilinizde ${business.rating.toFixed(1)} puan ve ${business.reviewCount} yorum görünüyor. ${websiteText}

İşletmeler için modern, hızlı ve mobil uyumlu web siteleri hazırlıyoruz. Amaç; Google Maps’ten gelen müşteriye daha güçlü bir dijital vitrin göstermek ve iletişim taleplerini artırmak. Lead Finder AI analizinde işletmeniz ${webDesignScore}/100 web tasarım uygunluk skoru aldı (${getWebDesignFitLabel(webDesignScore)}).

İsterseniz size ücretsiz kısa bir web görünürlük önerisi paylaşabilirim.`;
  }

  return generateReviewCardMessage(business, messageType);
}

export default function FavoritesPage() {
  const [selectedIntent] = useState<SelectedIntent>(getSelectedIntent);
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>(getFavorites);
  const [sortColumn, setSortColumn] = useState<SortColumn>(
    selectedIntent === "web-design" ? "webDesignScore" : "reviewCardScore",
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedMessageBusiness, setSelectedMessageBusiness] =
    useState<FavoriteBusiness | null>(null);
  const [selectedMessageType, setSelectedMessageType] =
    useState<ReviewCardMessageType>("professional-whatsapp");
  const [selectedMessage, setSelectedMessage] = useState("");
  const [selectedPresentationBusiness, setSelectedPresentationBusiness] =
    useState<FavoriteBusiness | null>(null);
  const [selectedDetailBusiness, setSelectedDetailBusiness] =
    useState<FavoriteBusiness | null>(null);
  const [presentationSlideIndex, setPresentationSlideIndex] = useState(0);
  const [reviewCardSubscribers, setReviewCardSubscribers] = useState<
    ReviewCardSubscriber[]
  >(getReviewCardSubscribers);
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const isReviewCardMode = selectedIntent === "review-card";

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
    const averageLeadScore =
      favorites.length > 0
        ? Math.round(
            favorites.reduce(
              (totalScore, business) => totalScore + business.leadScore,
              0,
            ) / favorites.length,
          )
        : 0;

    return {
      totalFavorites: favorites.length,
      meetingCount,
      subscriberCount,
      averageLeadScore,
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
      const firstValue = getSortValue(firstBusiness, sortColumn);
      const secondValue = getSortValue(secondBusiness, sortColumn);
      const directionMultiplier = sortDirection === "asc" ? 1 : -1;

      return (firstValue - secondValue) * directionMultiplier;
    });
  }, [filteredFavorites, sortColumn, sortDirection]);

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

  function handleMarkAsSubscriber(business: FavoriteBusiness) {
    if (isReviewCardSubscriber(business)) {
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

  function handleOpenMessagePanel(business: FavoriteBusiness) {
    setSelectedMessageBusiness(business);
    setSelectedMessageType("professional-whatsapp");
    setSelectedMessage(
      selectedIntent === "web-design"
        ? createSalesMessage(business, selectedIntent)
        : "",
    );
    setCopied(false);
  }

  function handleCreateMessage() {
    if (!selectedMessageBusiness) {
      return;
    }

    setSelectedMessage(
      createSalesMessage(
        selectedMessageBusiness,
        selectedIntent,
        selectedMessageType,
      ),
    );
    setCopied(false);
  }

  function handleOpenPresentation(business: FavoriteBusiness) {
    setSelectedPresentationBusiness(business);
    setPresentationSlideIndex(0);
  }

  function handleSort(nextColumn: SortColumn) {
    if (nextColumn === sortColumn) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortColumn(nextColumn);
    setSortDirection("asc");
  }

  async function handleCopyMessage() {
    await navigator.clipboard.writeText(selectedMessage);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1600);
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
          <SummaryCard
            label="Ortalama Fırsat Skoru"
            value={`${summaryStats.averageLeadScore}/100`}
            color="#F472B6"
          />
        </section>

        {favorites.length === 0 ? (
          <section className="card-pop bg-[#F5F3FF] p-6">
            <h2 className="font-heading text-2xl font-black text-[#1E293B]">
              Henüz favori işletme yok.
            </h2>
            <p className="mt-2 text-sm font-extrabold text-slate-600">
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
                <span className="text-sm font-black text-[#1E293B]">
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

            <div className="card-pop overflow-hidden">
              <div className="border-b-2 border-[#1E293B] bg-[#F472B6] px-5 py-4">
                <h2 className="font-heading text-xl font-black text-[#1E293B]">
                  Favori İşletmeler
                </h2>
                <p className="mt-1 text-sm font-bold text-[#1E293B]">
                  {sortedFavorites.length} işletme gösteriliyor.
                </p>
              </div>

              <div className="border-b-2 border-[#1E293B] bg-[#FFFDF5] p-3">
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {(isReviewCardMode
                    ? [
                        ["Puan", "rating"],
                        ["Yorum", "reviewCount"],
                        ["Fırsat", "leadScore"],
                        ["Yorum Kart", "reviewCardScore"],
                      ]
                    : [
                        ["Puan", "rating"],
                        ["Yorum", "reviewCount"],
                        ["Fırsat", "leadScore"],
                        ["Web Tasarım", "webDesignScore"],
                      ]
                  ).map(([label, column]) => (
                    <MobileSortButton
                      key={column}
                      label={label}
                      column={column as SortColumn}
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </div>
              </div>

              {sortedFavorites.length === 0 ? (
                <div className="p-5">
                  <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
                    Aramaya uygun favori işletme bulunamadı.
                  </p>
                </div>
              ) : (
                <div className="divide-y-2 divide-[#1E293B]">
                  {sortedFavorites.map((business) => (
                    <FavoriteCompactItem
                      key={`${business.businessName}-${business.location}`}
                      business={business}
                      isReviewCardMode={isReviewCardMode}
                      isSubscriber={isReviewCardSubscriber(business)}
                      onOpenDetail={setSelectedDetailBusiness}
                      onMarkSubscriber={handleMarkAsSubscriber}
                      onRemoveFavorite={handleRemoveFavorite}
                      onUpdateFavorite={handleUpdateFavorite}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {selectedMessageBusiness ? (
        <MessageModal
          business={selectedMessageBusiness}
          isReviewCardMode={isReviewCardMode}
          selectedMessageType={selectedMessageType}
          selectedMessage={selectedMessage}
          copied={copied}
          onMessageTypeChange={setSelectedMessageType}
          onCreateMessage={handleCreateMessage}
          onCopyMessage={handleCopyMessage}
          onClose={() => {
            setSelectedMessageBusiness(null);
            setSelectedMessage("");
            setCopied(false);
          }}
        />
      ) : null}

      {selectedPresentationBusiness ? (
        <FieldPresentationModal
          business={selectedPresentationBusiness}
          slideIndex={presentationSlideIndex}
          onPrevious={() =>
            setPresentationSlideIndex((currentIndex) =>
              Math.max(currentIndex - 1, 0),
            )
          }
          onNext={() =>
            setPresentationSlideIndex((currentIndex) =>
              Math.min(currentIndex + 1, 4),
            )
          }
          onClose={() => {
            setSelectedPresentationBusiness(null);
            setPresentationSlideIndex(0);
          }}
        />
      ) : null}

      {selectedDetailBusiness ? (
        <FavoriteDetailModal
          business={selectedDetailBusiness}
          isReviewCardMode={isReviewCardMode}
          isSubscriber={isReviewCardSubscriber(selectedDetailBusiness)}
          onUpdateFavorite={handleUpdateFavorite}
          onOpenMessage={(business) => {
            setSelectedDetailBusiness(null);
            handleOpenMessagePanel(business);
          }}
          onOpenPresentation={(business) => {
            setSelectedDetailBusiness(null);
            handleOpenPresentation(business);
          }}
          onMarkSubscriber={handleMarkAsSubscriber}
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
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <article className="rounded-[22px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]">
      <p
        className="w-fit rounded-full border-2 border-[#1E293B] px-3 py-1 text-xs font-black uppercase text-[#1E293B]"
        style={{ backgroundColor: color }}
      >
        {label}
      </p>
      <p className="mt-3 font-heading text-3xl font-black text-[#1E293B]">
        {value}
      </p>
    </article>
  );
}

function FavoriteCompactItem({
  business,
  isReviewCardMode,
  isSubscriber,
  onOpenDetail,
  onMarkSubscriber,
  onRemoveFavorite,
  onUpdateFavorite,
}: {
  business: FavoriteBusiness;
  isReviewCardMode: boolean;
  isSubscriber: boolean;
  onOpenDetail: (business: FavoriteBusiness) => void;
  onMarkSubscriber: (business: FavoriteBusiness) => void;
  onRemoveFavorite: (business: FavoriteBusiness) => void;
  onUpdateFavorite: (
    business: FavoriteBusiness,
    updates: Pick<FavoriteBusiness, "note" | "tag">,
  ) => void;
}) {
  return (
    <article className="grid gap-4 bg-white p-4 lg:grid-cols-[minmax(0,1.45fr)_0.45fr_0.45fr_0.6fr_0.8fr_1.45fr] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-lg font-black text-[#1E293B]">
            {business.businessName}
          </h3>
          <span className="badge-pop bg-[#EDE9FE]">
            {isReviewCardMode ? "Yorum Kart" : "Web Tasarım"}
          </span>
        </div>
        <p className="mt-1 text-sm font-bold text-slate-600">
          {business.category} • {business.location}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
          <CompactMetric label="Puan" value={business.rating.toFixed(1)} />
          <CompactMetric label="Yorum" value={business.reviewCount} />
          <CompactMetric label="Fırsat" value={`⭐ ${business.leadScore}/100`} />
        </div>
      </div>

      <div className="hidden lg:block">
        <CompactMetric label="Puan" value={business.rating.toFixed(1)} />
      </div>
      <div className="hidden lg:block">
        <CompactMetric label="Yorum" value={business.reviewCount} />
      </div>
      <div className="hidden lg:block">
        <CompactMetric label="Fırsat" value={`⭐ ${business.leadScore}/100`} />
      </div>

      <div>
        <p className="mb-2 text-xs font-black uppercase text-slate-500">Durum</p>
        <TagSelect
          value={business.tag ?? ""}
          onChange={(tag) => onUpdateFavorite(business, { tag })}
        />
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <button
          type="button"
          onClick={() => onOpenDetail(business)}
          className="btn-secondary min-h-11 px-4 text-xs"
        >
          Detay
        </button>
        {isReviewCardMode ? (
          <SubscriberButton
            business={business}
            isSubscriber={isSubscriber}
            onMarkSubscriber={onMarkSubscriber}
          />
        ) : null}
        <a
          href={getSafeMapsUrl(business)}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost min-h-11 px-4 text-xs"
        >
          Google Maps
        </a>
        <button
          type="button"
          onClick={() => onRemoveFavorite(business)}
          className="min-h-11 rounded-full border-2 border-[#1E293B] bg-white px-3 text-xs font-black text-[#1E293B] transition hover:bg-[#F472B6] focus:outline-none focus:ring-4 focus:ring-[#F472B6]/30"
        >
          Favoriden Çıkar
        </button>
      </div>
    </article>
  );
}

function FavoriteDetailModal({
  business,
  isReviewCardMode,
  isSubscriber,
  onUpdateFavorite,
  onOpenMessage,
  onOpenPresentation,
  onMarkSubscriber,
  onRemoveFavorite,
  onClose,
}: {
  business: FavoriteBusiness;
  isReviewCardMode: boolean;
  isSubscriber: boolean;
  onUpdateFavorite: (
    business: FavoriteBusiness,
    updates: Pick<FavoriteBusiness, "note" | "tag">,
  ) => void;
  onOpenMessage: (business: FavoriteBusiness) => void;
  onOpenPresentation: (business: FavoriteBusiness) => void;
  onMarkSubscriber: (business: FavoriteBusiness) => void;
  onRemoveFavorite: (business: FavoriteBusiness) => void;
  onClose: () => void;
}) {
  const reviewCardScore = getReviewCardScore(business);
  const webDesignScore = getWebDesignScore(business);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
      <section className="hard-shadow-lg max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border-2 border-[#1E293B] bg-white">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4">
          <div>
            <p className="page-eyebrow bg-[#FBBF24]">
              {isReviewCardMode ? "Yorum Kart" : "Web Tasarım"}
            </p>
            <h2 className="mt-3 font-heading text-3xl font-black text-[#1E293B]">
              {business.businessName}
            </h2>
            <p className="mt-2 text-sm font-extrabold text-slate-600">
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
            <MetricBadge label="Fırsat" value={`⭐ ${business.leadScore}/100`} />
            {isReviewCardMode ? (
              <MetricBadge
                label="Yorum Kart"
                value={`${reviewCardScore}/100`}
                helper={getReviewCardRiskLevel(reviewCardScore)}
              />
            ) : (
              <MetricBadge
                label="Web Tasarım"
                value={`${webDesignScore}/100`}
                helper={getWebDesignFitLabel(webDesignScore)}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge active={business.hasWebsite} label="Web Sitesi" />
            <StatusBadge active={business.hasPhone} label="Telefon" />
          </div>

          {isReviewCardMode ? (
            <div className="rounded-[22px] border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
              <h3 className="font-heading text-xl font-black text-[#1E293B]">
                Sektöre Göre Satış Açısı
              </h3>
              <p className="mt-2 text-sm font-bold leading-6 text-[#1E293B]">
                {getReviewCardSalesAngle(business)}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black text-[#1E293B]">Durum</span>
              <TagSelect
                value={business.tag ?? ""}
                onChange={(tag) => onUpdateFavorite(business, { tag })}
              />
            </label>
            <label className="grid gap-2 md:col-span-2">
              <span className="text-sm font-black text-[#1E293B]">Not</span>
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

        <div className="flex flex-col gap-3 border-t-2 border-[#1E293B] px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
          <FavoriteActions
            business={business}
            isReviewCardMode={isReviewCardMode}
            isSubscriber={isSubscriber}
            onOpenMessage={onOpenMessage}
            onOpenPresentation={onOpenPresentation}
            onMarkSubscriber={onMarkSubscriber}
            onRemoveFavorite={onRemoveFavorite}
            stacked={false}
          />
        </div>
      </section>
    </div>
  );
}

function MessageModal({
  business,
  isReviewCardMode,
  selectedMessageType,
  selectedMessage,
  copied,
  onMessageTypeChange,
  onCreateMessage,
  onCopyMessage,
  onClose,
}: {
  business: FavoriteBusiness;
  isReviewCardMode: boolean;
  selectedMessageType: ReviewCardMessageType;
  selectedMessage: string;
  copied: boolean;
  onMessageTypeChange: (messageType: ReviewCardMessageType) => void;
  onCreateMessage: () => void;
  onCopyMessage: () => void;
  onClose: () => void;
}) {
  const messageTypes: ReviewCardMessageType[] = [
    "short-dm",
    "professional-whatsapp",
    "friendly-first-contact",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
      <section className="hard-shadow-lg max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border-2 border-[#1E293B] bg-white">
        <div className="border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4">
          <p className="page-eyebrow bg-[#34D399]">Hazır Mesaj</p>
          <h2 className="mt-3 font-heading text-3xl font-black tracking-tight text-[#1E293B]">
            {isReviewCardMode
              ? "Yorum Kart Mesajı Oluştur"
              : "Web Tasarım Mesajı"}
          </h2>
          <p className="mt-2 text-sm font-extrabold text-slate-600">
            {business.businessName}
          </p>
        </div>

        <div className="grid gap-5 p-5">
          {isReviewCardMode ? (
            <div className="rounded-[22px] border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
              <label className="grid gap-2">
                <span className="text-sm font-black text-[#1E293B]">
                  Mesaj tipi
                </span>
                <select
                  value={selectedMessageType}
                  onChange={(event) =>
                    onMessageTypeChange(event.target.value as ReviewCardMessageType)
                  }
                  className="input-pop w-full"
                >
                  {messageTypes.map((messageType) => (
                    <option key={messageType} value={messageType}>
                      {getReviewCardMessageTypeLabel(messageType)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={onCreateMessage}
                className="btn-primary mt-4 w-full sm:w-auto"
              >
                Mesajı Oluştur
              </button>
            </div>
          ) : null}

          {selectedMessage ? (
            <div>
              <textarea
                readOnly
                value={selectedMessage}
                className="input-pop min-h-64 w-full leading-6"
              />
              {copied ? (
                <p className="mt-3 w-fit rounded-full border-2 border-[#1E293B] bg-[#34D399] px-3 py-1 text-sm font-black text-[#1E293B]">
                  Kopyalandı
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-2xl border-2 border-[#1E293B] bg-white p-4 text-sm font-extrabold text-[#1E293B]">
              Mesaj tipini seçip “Mesajı Oluştur” butonuna bas.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-[#1E293B] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCopyMessage}
            disabled={!selectedMessage}
            className="btn-primary"
          >
            Kopyala
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Kapat
          </button>
        </div>
      </section>
    </div>
  );
}

function FieldPresentationModal({
  business,
  slideIndex,
  onPrevious,
  onNext,
  onClose,
}: {
  business: FavoriteBusiness;
  slideIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const reviewCardScore = getReviewCardScore(business);
  const candidateReasons = getReviewCardCandidateReasons(business).slice(0, 4);
  const slides = getPresentationSlides(business, reviewCardScore, candidateReasons);
  const currentSlide = slides[slideIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/50 px-4 py-5">
      <section className="hard-shadow-lg flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border-2 border-[#1E293B] bg-[#FFFDF5]">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E293B] bg-[#FBBF24] px-5 py-4">
          <div>
            <p className="page-eyebrow bg-white">Sahada Göster</p>
            <h2 className="mt-3 font-heading text-2xl font-black text-[#1E293B] sm:text-4xl">
              {business.businessName}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4">
            Kapat
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-7">
          <article className="rounded-[28px] border-2 border-[#1E293B] bg-white p-5 shadow-[5px_5px_0_#1E293B] sm:p-8">
            <p className="badge-pop w-fit bg-[#EDE9FE]">
              {slideIndex + 1} / {slides.length}
            </p>
            <h3 className="mt-5 font-heading text-3xl font-black tracking-tight text-[#1E293B] sm:text-5xl">
              {currentSlide.title}
            </h3>
            <p className="mt-5 text-lg font-bold leading-8 text-[#1E293B]">
              {currentSlide.content}
            </p>
            {currentSlide.details.length > 0 ? (
              <div className="mt-6 grid gap-3">
                {currentSlide.details.map((detail) => (
                  <div
                    key={detail}
                    className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-base font-extrabold text-[#1E293B]"
                  >
                    {detail}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-[#1E293B] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onPrevious}
            disabled={slideIndex === 0}
            className="btn-secondary"
          >
            Önceki
          </button>
          <span className="text-center text-sm font-black text-[#1E293B]">
            {slideIndex + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={slideIndex === slides.length - 1}
            className="btn-primary"
          >
            Sonraki
          </button>
        </div>
      </section>
    </div>
  );
}

function getPresentationSlides(
  business: FavoriteBusiness,
  reviewCardScore: number,
  candidateReasons: string[],
) {
  return [
    {
      title: "Google’da güven ilk izlenimdir",
      content:
        "Müşteriler bir işletmeyi seçmeden önce Google puanına ve yorumlarına bakar. Puan düşükse veya yorumlar zayıfsa, yeni müşterinin güveni azalabilir.",
      details: [
        `İşletme: ${business.businessName}`,
        `Google puanı: ${business.rating.toFixed(1)}`,
        `Yorum sayısı: ${business.reviewCount}`,
      ],
    },
    {
      title: "Yorum Kart ne yapar?",
      content:
        "Yorum Kart, müşterilerin işletmenizin Google puan ve yorum ekranına kolayca ulaşmasını sağlar.",
      details: [
        "1. Müşteri kartı okutur",
        "2. Google yorum ekranı açılır",
        "3. Puan ve yorum bırakır",
      ],
    },
    {
      title: "Neden işe yarar?",
      content:
        "Memnun müşteriler çoğu zaman yorum bırakmayı unutuyor. Kart, bu süreci kolaylaştırır ve müşteriyi doğrudan doğru ekrana götürür.",
      details: [getReviewCardPlacementSuggestion(business)],
    },
    {
      title: "Bu işletme için fırsat",
      content: getReviewCardSalesAngle(business),
      details: [
        `Yorum Kart Skoru: ${reviewCardScore}/100`,
        `Aday durumu: ${getReviewCardRiskLevel(reviewCardScore)}`,
        ...candidateReasons,
      ],
    },
    {
      title: "Kısa kurulum, kolay kullanım",
      content:
        "Kart işletmenizin Google yorum sayfasına bağlanır. Müşteriler tek dokunuşla yorum ekranına ulaşır.",
      details: [
        "İsterseniz örnek kartı ve nasıl çalıştığını hemen gösterebilirim.",
      ],
    },
  ];
}

function getSortValue(business: FavoriteBusiness, column: SortColumn): number {
  if (column === "rating") {
    return business.rating;
  }

  if (column === "reviewCount") {
    return business.reviewCount;
  }

  if (column === "reviewCardScore") {
    return getReviewCardScore(business);
  }

  if (column === "webDesignScore") {
    return getWebDesignScore(business);
  }

  return business.leadScore;
}

function MobileSortButton({
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
  const indicator = isActive ? ` ${direction === "asc" ? "↑" : "↓"}` : "";

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`min-h-11 rounded-full border-2 border-[#1E293B] px-3 py-2 text-sm font-black shadow-[3px_3px_0_#1E293B] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1E293B] focus:outline-none focus:ring-4 focus:ring-[#8B5CF6]/30 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#1E293B] ${
        isActive ? "bg-[#8B5CF6] text-white" : "bg-white text-[#1E293B]"
      }`}
      aria-label={`${label} sıralaması`}
      title={`${label} sıralaması`}
    >
      {label}
      {indicator}
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
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-[#1E293B]">{value}</p>
    </div>
  );
}

function SubscriberButton({
  business,
  isSubscriber,
  onMarkSubscriber,
  wide = false,
}: {
  business: FavoriteBusiness;
  isSubscriber: boolean;
  onMarkSubscriber: (business: FavoriteBusiness) => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onMarkSubscriber(business)}
      disabled={isSubscriber}
      className={`${wide ? "w-full" : ""} min-h-11 rounded-full border-2 border-[#1E293B] bg-[#34D399] px-4 text-xs font-black text-[#1E293B] shadow-[4px_4px_0_#1E293B] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1E293B] focus:outline-none focus:ring-4 focus:ring-[#34D399]/35 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#1E293B] disabled:cursor-default disabled:opacity-80 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_#1E293B]`}
      aria-label={isSubscriber ? "Abone listesinde" : "Abone yapıldı"}
      title={isSubscriber ? "Abone listesinde" : "Abone yapıldı"}
    >
      {isSubscriber ? "Abone ✓" : "Abone Yapıldı"}
    </button>
  );
}

function FavoriteActions({
  business,
  isReviewCardMode,
  isSubscriber,
  onOpenMessage,
  onOpenPresentation,
  onMarkSubscriber,
  onRemoveFavorite,
  stacked = false,
}: {
  business: FavoriteBusiness;
  isReviewCardMode: boolean;
  isSubscriber: boolean;
  onOpenMessage: (business: FavoriteBusiness) => void;
  onOpenPresentation: (business: FavoriteBusiness) => void;
  onMarkSubscriber: (business: FavoriteBusiness) => void;
  onRemoveFavorite: (business: FavoriteBusiness) => void;
  stacked?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${stacked ? "flex-col" : "flex-wrap"}`}>
      <button
        type="button"
        onClick={() => onOpenMessage(business)}
        className={`${stacked ? "w-full" : ""} btn-secondary min-h-11 px-3 text-xs`}
      >
        Mesaj Oluştur
      </button>
      {isReviewCardMode ? (
        <button
          type="button"
          onClick={() => onOpenPresentation(business)}
          className={`${stacked ? "w-full" : ""} btn-primary min-h-11 px-3 text-xs`}
        >
          Sahada Göster
        </button>
      ) : null}
      {isReviewCardMode ? (
        <SubscriberButton
          business={business}
          isSubscriber={isSubscriber}
          onMarkSubscriber={onMarkSubscriber}
          wide={stacked}
        />
      ) : null}
      <a
        href={getSafeMapsUrl(business)}
        target="_blank"
        rel="noreferrer"
        className={`${stacked ? "w-full" : ""} btn-ghost min-h-11 px-3`}
      >
        Google Maps
      </a>
      <button
        type="button"
        onClick={() => onRemoveFavorite(business)}
        className={`${stacked ? "w-full" : ""} btn-danger min-h-11 px-3 text-xs`}
      >
        Favoriden Çıkar
      </button>
    </div>
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
