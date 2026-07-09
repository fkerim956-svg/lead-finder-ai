"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import {
  calculateReviewCardScore,
  getReviewCardFitLabel,
} from "@/lib/review-card-score";
import { FAVORITES_STORAGE_KEY } from "@/lib/storage-keys";
import type { BusinessResult } from "@/types/business";

type FavoriteBusiness = BusinessResult & {
  note?: string;
  tag?: string;
};

const tagOptions = [
  "Etiket yok",
  "DM atılacak",
  "Aranacak",
  "İlgileniyor",
  "Teklif gönderildi",
  "Satış yapıldı",
  "Uygun değil",
];

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

function createSalesMessage(business: FavoriteBusiness): string {
  const websiteText = business.hasWebsite
    ? "Web siteniz olduğunu gördüm; Google görünürlüğünüzle birlikte daha fazla dönüşüm almanız için birkaç küçük optimizasyon fırsatı olabilir."
    : "Web siteniz görünmüyor; bu da Google'dan gelen potansiyel müşterileri kaçırmanıza neden olabilir.";
  const reviewCardScore = getReviewCardScore(business);

  return `Merhaba ${business.businessName} ekibi, kısa bir gözlemimi paylaşmak istedim.

Google profilinizde ${business.rating.toFixed(1)} puan ve ${business.reviewCount} yorum görünüyor. ${websiteText}

Biz işletmeler için Google yorumlarını artırma, NFC yorum kartları, Google İşletme Profili optimizasyonu ve dijital pazarlama tarafında destek oluyoruz. Lead Finder AI analizinde işletmeniz ⭐ ${business.leadScore}/100 fırsat skoru ve ${reviewCardScore}/100 yorum kart uygunluk skoru aldı (${getReviewCardFitLabel(reviewCardScore)}).

İsterseniz size ücretsiz kısa bir iyileştirme önerisi paylaşabilirim.`;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteBusiness[]>(getFavorites);
  const [selectedMessage, setSelectedMessage] = useState("");
  const [copied, setCopied] = useState(false);

  function saveFavorites(updatedFavorites: FavoriteBusiness[]) {
    setFavorites(updatedFavorites);
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updatedFavorites));
  }

  function handleRemoveFavorite(business: FavoriteBusiness) {
    const updatedFavorites = favorites.filter(
      (favorite) =>
        favorite.businessName !== business.businessName ||
        favorite.location !== business.location,
    );

    saveFavorites(updatedFavorites);
  }

  function handleUpdateFavorite(
    business: FavoriteBusiness,
    updates: Pick<FavoriteBusiness, "note" | "tag">,
  ) {
    const updatedFavorites = favorites.map((favorite) => {
      const isSameBusiness =
        favorite.businessName === business.businessName &&
        favorite.location === business.location;

      return isSameBusiness ? { ...favorite, ...updates } : favorite;
    });

    saveFavorites(updatedFavorites);
  }

  function handleCreateMessage(business: FavoriteBusiness) {
    setSelectedMessage(createSalesMessage(business));
    setCopied(false);
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
          <p className="page-eyebrow">Favoriler</p>
          <h1 className="page-title mt-5">Kaydedilen işletmeler</h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            Satış fırsatı olarak takip etmek istediğin işletmeleri notlar,
            etiketler ve hazır mesajlarla yönet.
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
                    <th className="text-left">Puan</th>
                    <th className="text-left">Yorum</th>
                    <th className="text-left">Fırsat Skoru</th>
                    <th className="text-left">Yorum Kart Skoru</th>
                    <th className="w-[16%] text-left">Etiket</th>
                    <th className="w-[22%] text-left">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {favorites.map((business) => {
                    const reviewCardScore = getReviewCardScore(business);

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
                          <ReviewCardBadge score={reviewCardScore} />
                        </td>
                        <td>
                          <TagSelect
                            value={business.tag ?? "Etiket yok"}
                            onChange={(tag) =>
                              handleUpdateFavorite(business, { tag })
                            }
                          />
                        </td>
                        <td>
                          <FavoriteActions
                            business={business}
                            onCreateMessage={handleCreateMessage}
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
              {favorites.map((business) => {
                const reviewCardScore = getReviewCardScore(business);

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
                      <MetricBadge
                        label="Yorum Kart"
                        value={`${reviewCardScore}/100`}
                        helper={getReviewCardFitLabel(reviewCardScore)}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusBadge active={business.hasWebsite} label="Web Sitesi" />
                      <StatusBadge active={business.hasPhone} label="Telefon" />
                    </div>

                    <div className="mt-4 grid gap-3">
                      <label className="grid gap-2">
                        <span className="text-sm font-black text-[#1E293B]">
                          Etiket
                        </span>
                        <TagSelect
                          value={business.tag ?? "Etiket yok"}
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
                        onCreateMessage={handleCreateMessage}
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

      {selectedMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
          <section className="hard-shadow-lg w-full max-w-2xl rounded-[28px] border-2 border-[#1E293B] bg-white">
            <div className="border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4">
              <p className="page-eyebrow bg-[#34D399]">Hazır Mesaj</p>
              <h2 className="mt-3 font-heading text-3xl font-black tracking-tight text-[#1E293B]">
                WhatsApp / DM mesajı
              </h2>
            </div>

            <div className="p-5">
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

            <div className="flex flex-col gap-3 border-t-2 border-[#1E293B] px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleCopyMessage} className="btn-primary">
                Kopyala
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMessage("");
                  setCopied(false);
                }}
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
  onCreateMessage,
  onRemoveFavorite,
  stacked = false,
}: {
  business: FavoriteBusiness;
  onCreateMessage: (business: FavoriteBusiness) => void;
  onRemoveFavorite: (business: FavoriteBusiness) => void;
  stacked?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${stacked ? "flex-col" : "flex-wrap"}`}>
      <a
        href={business.mapsUrl}
        target="_blank"
        rel="noreferrer"
        className={`${stacked ? "w-full" : ""} btn-ghost min-h-11 px-3`}
      >
        Google Maps
      </a>
      <button
        type="button"
        onClick={() => onCreateMessage(business)}
        className={`${stacked ? "w-full" : ""} btn-secondary min-h-11 px-3 text-xs`}
      >
        Mesaj Oluştur
      </button>
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
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="input-pop w-full"
    >
      {tagOptions.map((tag) => (
        <option key={tag} value={tag}>
          {tag}
        </option>
      ))}
    </select>
  );
}

function ReviewCardBadge({ score }: { score: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="badge-pop bg-[#EDE9FE]">{score}/100</span>
      <span className="text-xs font-extrabold text-slate-500">
        {getReviewCardFitLabel(score)}
      </span>
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
