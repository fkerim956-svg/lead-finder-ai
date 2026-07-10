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
  SELECTED_INTENT_STORAGE_KEY,
} from "@/lib/storage-keys";
import {
  calculateWebDesignScore,
  getWebDesignFitLabel,
} from "@/lib/web-design-score";
import type { BusinessResult } from "@/types/business";

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
  const [presentationSlideIndex, setPresentationSlideIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const isReviewCardMode = selectedIntent === "review-card";

  const sortedFavorites = useMemo(() => {
    return [...favorites].sort((firstBusiness, secondBusiness) => {
      const firstValue = getSortValue(firstBusiness, sortColumn);
      const secondValue = getSortValue(secondBusiness, sortColumn);
      const directionMultiplier = sortDirection === "asc" ? 1 : -1;

      return (firstValue - secondValue) * directionMultiplier;
    });
  }, [favorites, sortColumn, sortDirection]);

  function saveFavorites(updatedFavorites: FavoriteBusiness[]) {
    setFavorites(updatedFavorites);
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
  }

  function handleRemoveFavorite(business: FavoriteBusiness) {
    const updatedFavorites = favorites.filter(
      (favorite) => getBusinessKey(favorite) !== getBusinessKey(business),
    );

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
          <h1 className="page-title mt-5">
            {isReviewCardMode ? "Yorum Kart Favorileri" : "Web Tasarım Favorileri"}
          </h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            {isReviewCardMode
              ? "Yorum kart satışı için takip etmek istediğin işletmeleri notlar, etiketler ve hazır mesajlarla yönet."
              : "Web tasarım teklifi sunabileceğin işletmeleri notlar, etiketler ve hazır mesajlarla yönet."}
          </p>
        </header>

        {favorites.length === 0 ? (
          <section className="card-pop bg-[#F5F3FF] p-6">
            <p className="text-sm font-extrabold text-[#1E293B]">
              Henüz favori işletme yok.
            </p>
          </section>
        ) : (
          <section className="card-pop overflow-hidden">
            <div className="border-b-2 border-[#1E293B] bg-[#F472B6] px-5 py-4">
              <h2 className="font-heading text-xl font-black text-[#1E293B]">
                Favori İşletmeler
              </h2>
              <p className="mt-1 text-sm font-bold text-[#1E293B]">
                {favorites.length} işletme favorilere eklendi.
              </p>
            </div>

            <div className="hidden md:block">
              <table className="table-pop w-full table-fixed">
                <thead>
                  <tr>
                    <th className="w-[28%] text-left">İşletme</th>
                    <SortableHeader
                      label="Puan"
                      column="rating"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Yorum"
                      column="reviewCount"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Fırsat Skoru"
                      column="leadScore"
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label={isReviewCardMode ? "Yorum Kart Skoru" : "Web Tasarım Skoru"}
                      column={isReviewCardMode ? "reviewCardScore" : "webDesignScore"}
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="w-[16%] text-left">Etiket</th>
                    <th className="w-[22%] text-left">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFavorites.map((business) => {
                    const reviewCardScore = getReviewCardScore(business);
                    const webDesignScore = getWebDesignScore(business);

                    return (
                      <tr key={`${business.businessName}-${business.location}`}>
                        <td>
                          <FavoriteBusinessSummary business={business} />
                        </td>
                        <td className="font-extrabold">
                          {business.rating.toFixed(1)}
                        </td>
                        <td>{business.reviewCount}</td>
                        <td>
                          <span className="badge-pop bg-[#FBBF24]">
                            ⭐ {business.leadScore}/100
                          </span>
                        </td>
                        <td>
                          {isReviewCardMode ? (
                            <ScoreBadge
                              score={reviewCardScore}
                              label={getReviewCardRiskLevel(reviewCardScore)}
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
                          <TagSelect
                            value={business.tag ?? ""}
                            onChange={(tag) =>
                              handleUpdateFavorite(business, { tag })
                            }
                          />
                        </td>
                        <td>
                          <FavoriteActions
                            business={business}
                            isReviewCardMode={isReviewCardMode}
                            onOpenMessage={handleOpenMessagePanel}
                            onOpenPresentation={handleOpenPresentation}
                            onRemoveFavorite={handleRemoveFavorite}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
              <div className="rounded-[22px] border-2 border-[#1E293B] bg-[#FFFDF5] p-3">
                <p className="text-sm font-black text-[#1E293B]">Sırala</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(isReviewCardMode
                    ? [
                        ["Puan", "rating"],
                        ["Yorum", "reviewCount"],
                        ["Fırsat", "leadScore"],
                        ["Yorum Kart", "reviewCardScore"],
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
                      column={column as SortColumn}
                      activeColumn={sortColumn}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </div>
              </div>

              {sortedFavorites.map((business) => {
                const reviewCardScore = getReviewCardScore(business);
                const webDesignScore = getWebDesignScore(business);

                return (
                  <article
                    key={`${business.businessName}-${business.location}`}
                    className="rounded-[24px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]"
                  >
                    <FavoriteBusinessSummary business={business} large />

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <MetricBadge label="Puan" value={business.rating.toFixed(1)} />
                      <MetricBadge
                        label="Yorum"
                        value={String(business.reviewCount)}
                      />
                      <MetricBadge
                        label="Fırsat Skoru"
                        value={`⭐ ${business.leadScore}/100`}
                      />
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

                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusBadge active={business.hasWebsite} label="Web Sitesi" />
                      <StatusBadge active={business.hasPhone} label="Telefon" />
                      {!business.hasWebsite && !isReviewCardMode ? (
                        <span className="badge-pop bg-[#FBBF24]">
                          Web sitesi yok
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3">
                      <label className="grid gap-2">
                        <span className="text-sm font-black text-[#1E293B]">
                          Etiket
                        </span>
                        <TagSelect
                          value={business.tag ?? ""}
                          onChange={(tag) =>
                            handleUpdateFavorite(business, { tag })
                          }
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className="text-sm font-black text-[#1E293B]">
                          Özel Not Defteri
                        </span>
                        <textarea
                          value={business.note ?? ""}
                          onChange={(event) =>
                            handleUpdateFavorite(business, {
                              note: event.target.value,
                            })
                          }
                          placeholder="Satış notu ekle"
                          className="input-pop min-h-28"
                        />
                      </label>

                      <FavoriteActions
                        business={business}
                        isReviewCardMode={isReviewCardMode}
                        onOpenMessage={handleOpenMessagePanel}
                        onOpenPresentation={handleOpenPresentation}
                        onRemoveFavorite={handleRemoveFavorite}
                        stacked
                      />
                    </div>
                  </article>
                );
              })}
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
      ) : null}    </AppShell>
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

function SortableHeader({
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
    <th className="text-left">
      <button
        type="button"
        onClick={() => onSort(column)}
        className="rounded-full px-2 py-1 text-left font-black transition hover:bg-[#FBBF24] focus:outline-none focus:ring-4 focus:ring-[#8B5CF6]/30"
        aria-label={`${label} sütununa göre sırala`}
        title={`${label} sütununa göre sırala`}
      >
        {label}
        {indicator}
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

function FavoriteBusinessSummary({
  business,
  large = false,
}: {
  business: FavoriteBusiness;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3
        className={`font-heading font-black text-[#1E293B] ${
          large ? "text-xl" : "text-base"
        }`}
      >
        {business.businessName}
      </h3>
      <p className="text-sm font-bold text-slate-600">
        {business.category} • {business.location}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <StatusBadge active={business.hasWebsite} label="Web" />
        <StatusBadge active={business.hasPhone} label="Telefon" />
      </div>
    </div>
  );
}

function FavoriteActions({
  business,
  isReviewCardMode,
  onOpenMessage,
  onOpenPresentation,
  onRemoveFavorite,
  stacked = false,
}: {
  business: FavoriteBusiness;
  isReviewCardMode: boolean;
  onOpenMessage: (business: FavoriteBusiness) => void;
  onOpenPresentation: (business: FavoriteBusiness) => void;
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
