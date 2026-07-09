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

            <div className="overflow-x-auto">
              <table className="table-pop min-w-[1560px]">
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
                    <th className="text-left">Not</th>
                    <th className="text-left">Etiket</th>
                    <th className="text-left">Harita</th>
                    <th className="text-left">Mesaj</th>
                    <th className="text-left">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {favorites.map((business) => {
                    const reviewCardScore = getReviewCardScore(business);

                    return (
                      <tr key={`${business.businessName}-${business.location}`}>
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
                          <textarea
                            value={business.note ?? ""}
                            onChange={(event) =>
                              handleUpdateFavorite(business, {
                                note: event.target.value,
                              })
                            }
                            placeholder="Not ekle"
                            className="input-pop min-h-24 w-60"
                          />
                        </td>
                        <td>
                          <select
                            value={business.tag ?? "Etiket yok"}
                            onChange={(event) =>
                              handleUpdateFavorite(business, {
                                tag: event.target.value,
                              })
                            }
                            className="input-pop w-52"
                          >
                            {tagOptions.map((tag) => (
                              <option key={tag} value={tag}>
                                {tag}
                              </option>
                            ))}
                          </select>
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
                            onClick={() => handleCreateMessage(business)}
                            className="btn-secondary min-h-10 px-3 text-xs"
                          >
                            Mesaj Oluştur
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleRemoveFavorite(business)}
                            className="btn-danger min-h-10 px-3 text-xs"
                          >
                            Favoriden Çıkar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge-pop ${active ? "bg-[#34D399]" : "bg-[#FBBF24]"}`}>
      {active ? "Var" : "Yok"}
    </span>
  );
}
