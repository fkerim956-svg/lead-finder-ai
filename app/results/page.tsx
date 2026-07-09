"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { calculateLeadScore } from "@/lib/lead-score";
import {
  calculateReviewCardScore,
  getReviewCardFitLabel,
} from "@/lib/review-card-score";
import {
  FAVORITES_STORAGE_KEY,
  LATEST_ANALYSIS_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
} from "@/lib/storage-keys";
import type { BusinessResult, LatestAnalysis } from "@/types/business";

type SortOption = "leadScore" | "rating" | "reviewCount";

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

function getBusinessKey(business: Pick<BusinessResult, "businessName" | "location">) {
  return `${business.businessName}-${business.location}`;
}

export default function ResultsPage() {
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
  const [minimumLeadScore, setMinimumLeadScore] = useState(0);
  const [minimumRating, setMinimumRating] = useState("");
  const [maximumRating, setMaximumRating] = useState("");
  const [minimumReviewCount, setMinimumReviewCount] = useState("");
  const [maximumReviewCount, setMaximumReviewCount] = useState("");
  const [minimumReviewCardScore, setMinimumReviewCardScore] = useState(0);
  const [websiteMissingOnly, setWebsiteMissingOnly] = useState(false);
  const [phoneAvailableOnly, setPhoneAvailableOnly] = useState(false);
  const [excludeReviewCardSubscribers, setExcludeReviewCardSubscribers] =
    useState(false);
  const [selectedCategory, setSelectedCategory] = useState(allCategoriesOption);
  const [ratingUnderOnly, setRatingUnderOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("leadScore");
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessResult | null>(null);

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
    }));
  }, [latestAnalysis]);

  const reviewCardSubscriberKeys = useMemo(() => {
    return new Set(reviewCardSubscribers.map(getBusinessKey));
  }, [reviewCardSubscribers]);

  const filteredBusinesses = useMemo(() => {
    const minRating = minimumRating ? Number(minimumRating) : null;
    const maxRating = maximumRating ? Number(maximumRating) : null;
    const minReviews = minimumReviewCount ? Number(minimumReviewCount) : null;
    const maxReviews = maximumReviewCount ? Number(maximumReviewCount) : null;

    return businessesWithScore
      .filter((business) =>
        selectedCategory === allCategoriesOption
          ? true
          : business.category === selectedCategory,
      )
      .filter((business) => business.leadScore >= minimumLeadScore)
      .filter((business) => getReviewCardScore(business) >= minimumReviewCardScore)
      .filter((business) => (minRating === null ? true : business.rating >= minRating))
      .filter((business) => (maxRating === null ? true : business.rating <= maxRating))
      .filter((business) =>
        minReviews === null ? true : business.reviewCount >= minReviews,
      )
      .filter((business) =>
        maxReviews === null ? true : business.reviewCount <= maxReviews,
      )
      .filter((business) => (websiteMissingOnly ? !business.hasWebsite : true))
      .filter((business) => (phoneAvailableOnly ? business.hasPhone : true))
      .filter((business) =>
        excludeReviewCardSubscribers
          ? !reviewCardSubscriberKeys.has(getBusinessKey(business))
          : true,
      )
      .filter((business) => (ratingUnderOnly ? business.rating < 4.2 : true))
      .toSorted((first, second) => {
        if (sortBy === "rating") {
          return first.rating - second.rating;
        }

        if (sortBy === "reviewCount") {
          return second.reviewCount - first.reviewCount;
        }

        return second.leadScore - first.leadScore;
      });
  }, [
    businessesWithScore,
    excludeReviewCardSubscribers,
    maximumRating,
    maximumReviewCount,
    minimumLeadScore,
    minimumRating,
    minimumReviewCardScore,
    minimumReviewCount,
    phoneAvailableOnly,
    ratingUnderOnly,
    reviewCardSubscriberKeys,
    selectedCategory,
    sortBy,
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

  function getReviewCardScore(business: BusinessResult): number {
    return calculateReviewCardScore({
      rating: business.rating,
      reviewCount: business.reviewCount,
      hasWebsite: business.hasWebsite,
      hasPhone: business.hasPhone,
    });
  }

  function handleClearFilters() {
    setMinimumLeadScore(0);
    setMinimumRating("");
    setMaximumRating("");
    setMinimumReviewCount("");
    setMaximumReviewCount("");
    setMinimumReviewCardScore(0);
    setWebsiteMissingOnly(false);
    setPhoneAvailableOnly(false);
    setExcludeReviewCardSubscribers(false);
    setSelectedCategory(allCategoriesOption);
    setRatingUnderOnly(false);
    setSortBy("leadScore");
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
    const headers = [
      "İşletme Adı",
      "Kategori",
      "Konum",
      "Google Puanı",
      "Yorum Sayısı",
      "Web Sitesi",
      "Telefon",
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
      business.leadScore,
      business.mapsUrl,
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

  function handleAddReviewCardSubscriber(business: BusinessResult) {
    if (isReviewCardSubscriber(business)) {
      return;
    }

    const updatedSubscribers = [...reviewCardSubscribers, business];

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
        <header>
          <p className="page-eyebrow">Sonuçlar</p>
          <h1 className="page-title mt-5">Analiz sonuçları</h1>
          <p className="muted-text mt-4 max-w-3xl text-base font-medium leading-7">
            {latestAnalysis
              ? `${latestAnalysis.country} / ${latestAnalysis.city} / ${latestAnalysis.district} - ${latestAnalysis.category} analizi gösteriliyor.`
              : "Örnek işletme verilerini filtrele, sırala ve en yüksek potansiyelli satış fırsatlarını önceliklendir."}
          </p>
          {latestAnalysis ? (
            <p className="mt-3 w-fit rounded-full border-2 border-[#1E293B] bg-[#34D399] px-3 py-1 text-xs font-black text-[#1E293B]">
              Oluşturulma:{" "}
              {new Intl.DateTimeFormat("tr-TR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(latestAnalysis.createdAt))}
            </p>
          ) : null}
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

        <section className="card-pop grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
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

          <FilterField label="Minimum puan">
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={minimumRating}
              onChange={(event) => setMinimumRating(event.target.value)}
              className="input-pop"
            />
          </FilterField>

          <FilterField label="Maksimum puan">
            <input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={maximumRating}
              onChange={(event) => setMaximumRating(event.target.value)}
              className="input-pop"
            />
          </FilterField>

          <FilterField label="Minimum yorum sayısı">
            <input
              type="number"
              min={0}
              value={minimumReviewCount}
              onChange={(event) => setMinimumReviewCount(event.target.value)}
              className="input-pop"
            />
          </FilterField>

          <FilterField label="Maksimum yorum sayısı">
            <input
              type="number"
              min={0}
              value={maximumReviewCount}
              onChange={(event) => setMaximumReviewCount(event.target.value)}
              className="input-pop"
            />
          </FilterField>

          <FilterField label="Minimum fırsat skoru">
            <input
              type="number"
              min={0}
              max={100}
              value={minimumLeadScore}
              onChange={(event) => setMinimumLeadScore(Number(event.target.value))}
              className="input-pop"
            />
          </FilterField>

          <FilterField label="Minimum yorum kart skoru">
            <input
              type="number"
              min={0}
              max={100}
              value={minimumReviewCardScore}
              onChange={(event) =>
                setMinimumReviewCardScore(Number(event.target.value))
              }
              className="input-pop"
            />
          </FilterField>

          <FilterField label="Sıralama">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="input-pop"
            >
              <option value="leadScore">En yüksek fırsat skoru önce</option>
              <option value="rating">En düşük puan önce</option>
              <option value="reviewCount">En çok yorum önce</option>
            </select>
          </FilterField>

          <div className="flex flex-col justify-end gap-3 xl:col-span-3">
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
            <CheckboxField
              checked={ratingUnderOnly}
              onChange={setRatingUnderOnly}
              label="Yalnızca puanı 4.2 altında olanlar"
            />
          </div>

          <div className="flex items-end">
            <button type="button" onClick={handleClearFilters} className="btn-secondary w-full">
              Filtreleri Temizle
            </button>
          </div>
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

          <div className="overflow-x-auto">
            <table className="table-pop min-w-[1450px]">
              <thead>
                <tr>
                  <th className="text-left">İşletme</th>
                  <th className="text-left">Kategori</th>
                  <th className="text-left">Konum</th>
                  <th className="text-left">Puan</th>
                  <th className="text-left">Yorum</th>
                  <th className="text-left">Web Sitesi</th>
                  <th className="text-left">Telefon</th>
                  <th className="text-left">Fırsat Skoru</th>
                  <th className="text-left">Yorum Kart Skoru</th>
                  <th className="text-left">Harita</th>
                  <th className="text-left">Yorum Kart Abonesi</th>
                  <th className="text-left">Favori</th>
                  <th className="text-left">Detay</th>
                </tr>
              </thead>
              <tbody>
                {filteredBusinesses.map((business) => {
                  const reviewCardScore = getReviewCardScore(business);

                  return (
                    <tr key={getBusinessKey(business)}>
                      <td className="font-extrabold">{business.businessName}</td>
                      <td>{business.category}</td>
                      <td>{business.location}</td>
                      <td>{business.rating.toFixed(1)}</td>
                      <td>{business.reviewCount}</td>
                      <td>
                        <StatusBadge active={business.hasWebsite} />
                      </td>
                      <td>
                        <StatusBadge active={business.hasPhone} />
                      </td>
                      <td>
                        <span className="badge-pop bg-[#FBBF24]">
                          ⭐ {business.leadScore}/100
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="badge-pop bg-[#EDE9FE]">
                            {reviewCardScore}/100
                          </span>
                          <span className="text-xs font-extrabold text-slate-500">
                            {getReviewCardFitLabel(reviewCardScore)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <a
                          href={business.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost min-h-10 px-3"
                        >
                          Aç
                        </a>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleAddReviewCardSubscriber(business)}
                          disabled={isReviewCardSubscriber(business)}
                          className={`badge-pop min-h-10 ${
                            isReviewCardSubscriber(business)
                              ? "bg-[#34D399]"
                              : "bg-white hover:bg-[#FBBF24]"
                          }`}
                        >
                          {isReviewCardSubscriber(business)
                            ? "Abone"
                            : "Yorum Kart Abonesi"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleAddFavorite(business)}
                          title={isFavorite(business) ? "Favoride" : "Favoriye ekle"}
                          aria-label={isFavorite(business) ? "Favoride" : "Favoriye ekle"}
                          className="heart-button"
                        >
                          {isFavorite(business) ? "❤️" : "♡"}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedBusiness(business)}
                          className="btn-secondary min-h-10 px-3 text-xs"
                        >
                          Detay
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedBusiness ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
          <section className="hard-shadow-lg w-full max-w-2xl rounded-[28px] border-2 border-[#1E293B] bg-white">
            <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4">
              <div>
                <p className="page-eyebrow bg-[#34D399]">İşletme Detayı</p>
                <h2 className="mt-3 font-heading text-3xl font-black tracking-tight text-[#1E293B]">
                  {selectedBusiness.businessName}
                </h2>
                <p className="mt-2 text-sm font-extrabold text-slate-600">
                  {getLeadScoreExplanation(selectedBusiness.leadScore)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBusiness(null)}
                className="btn-secondary min-h-10 px-4"
              >
                Kapat
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <DetailItem label="Kategori" value={selectedBusiness.category} />
              <DetailItem label="Konum" value={selectedBusiness.location} />
              <DetailItem label="Puan" value={selectedBusiness.rating.toFixed(1)} />
              <DetailItem
                label="Yorum Sayısı"
                value={String(selectedBusiness.reviewCount)}
              />
              <DetailItem
                label="Web Sitesi"
                value={selectedBusiness.hasWebsite ? "Var" : "Yok"}
              />
              <DetailItem
                label="Telefon"
                value={selectedBusiness.hasPhone ? "Var" : "Yok"}
              />
              <DetailItem
                label="Fırsat Skoru"
                value={`⭐ ${selectedBusiness.leadScore}/100`}
              />
              <DetailItem
                label="Potansiyel"
                value={getLeadScoreExplanation(selectedBusiness.leadScore)}
              />
              <DetailItem
                label="Yorum Kart Skoru"
                value={`${getReviewCardScore(selectedBusiness)} - ${getReviewCardFitLabel(
                  getReviewCardScore(selectedBusiness),
                )}`}
              />
            </div>

            <div className="flex flex-col gap-3 border-t-2 border-[#1E293B] px-5 py-4 sm:flex-row sm:justify-end">
              <a
                href={selectedBusiness.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                Google Maps’te Aç
              </a>
              <button
                type="button"
                onClick={() => handleAddFavorite(selectedBusiness)}
                title={isFavorite(selectedBusiness) ? "Favoride" : "Favoriye ekle"}
                aria-label={isFavorite(selectedBusiness) ? "Favoride" : "Favoriye ekle"}
                className="heart-button"
              >
                {isFavorite(selectedBusiness) ? "❤️" : "♡"}
              </button>
              <button
                type="button"
                onClick={() => setSelectedBusiness(null)}
                className="btn-secondary"
              >
                Kapat
              </button>
            </div>
          </section>
        </div>
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-extrabold text-[#1E293B]">{value}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge-pop ${active ? "bg-[#34D399]" : "bg-[#FBBF24]"}`}>
      {active ? "Var" : "Yok"}
    </span>
  );
}
