"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { createMapsSearchUrl } from "@/lib/business-normalization";
import {
  calculateReviewCardScore,
  getReviewCardRiskLevel,
} from "@/lib/review-card-score";
import { REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY } from "@/lib/storage-keys";
import type { ReviewCardSubscriber } from "@/types/business";

const subscriberStatusOptions = [
  "Aktif Abone",
  "Kurulum Yapılacak",
  "Kart Teslim Edilecek",
  "Takip Edilecek",
  "Yenileme Görüşülecek",
  "Pasif",
  "İptal",
];

function getBusinessKey(
  business: Pick<ReviewCardSubscriber, "businessName" | "location">,
) {
  return `${business.businessName.trim().toLocaleLowerCase("tr-TR")}::${business.location.trim().toLocaleLowerCase("tr-TR")}`;
}

function getInitialSubscribers(): ReviewCardSubscriber[] {
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

function getSafeMapsUrl(business: ReviewCardSubscriber): string {
  return createMapsSearchUrl(
    business.businessName,
    business.location,
    "",
    "",
    business.mapsUrl,
  );
}

function getReviewCardScore(business: ReviewCardSubscriber): number {
  return calculateReviewCardScore({
    rating: business.rating,
    reviewCount: business.reviewCount,
    hasWebsite: business.hasWebsite,
    hasPhone: business.hasPhone,
  });
}

function formatSubscribedAt(subscribedAt?: string): string {
  if (!subscribedAt) {
    return "Tarih yok";
  }

  const date = new Date(subscribedAt);

  if (Number.isNaN(date.getTime())) {
    return "Tarih yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] =
    useState<ReviewCardSubscriber[]>(getInitialSubscribers);

  const sortedSubscribers = useMemo(() => {
    return [...subscribers].sort((firstSubscriber, secondSubscriber) => {
      const firstDate = firstSubscriber.subscribedAt
        ? new Date(firstSubscriber.subscribedAt).getTime()
        : 0;
      const secondDate = secondSubscriber.subscribedAt
        ? new Date(secondSubscriber.subscribedAt).getTime()
        : 0;

      return secondDate - firstDate;
    });
  }, [subscribers]);

  function saveSubscribers(updatedSubscribers: ReviewCardSubscriber[]) {
    setSubscribers(updatedSubscribers);
    window.localStorage.setItem(
      REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
      JSON.stringify(updatedSubscribers),
    );
  }

  function handleUpdateSubscriber(
    subscriber: ReviewCardSubscriber,
    updates: Pick<ReviewCardSubscriber, "note" | "status">,
  ) {
    const updatedSubscribers = subscribers.map((currentSubscriber) =>
      getBusinessKey(currentSubscriber) === getBusinessKey(subscriber)
        ? { ...currentSubscriber, ...updates }
        : currentSubscriber,
    );

    saveSubscribers(updatedSubscribers);
  }

  function handleRemoveSubscriber(subscriber: ReviewCardSubscriber) {
    const updatedSubscribers = subscribers.filter(
      (currentSubscriber) =>
        getBusinessKey(currentSubscriber) !== getBusinessKey(subscriber),
    );

    saveSubscribers(updatedSubscribers);
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
        <header>
          <p className="page-eyebrow">Yorum Kart</p>
          <h1 className="page-title mt-5">Yorum Kart Aboneleri</h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            Yorum Kart abonesi olarak işaretlenen işletmeleri buradan takip
            edin.
          </p>
        </header>

        {subscribers.length === 0 ? (
          <section className="card-pop bg-[#F5F3FF] p-6">
            <p className="text-sm font-extrabold text-[#1E293B]">
              Henüz Yorum Kart abonesi eklenmedi.
            </p>
            <Link href="/results" className="btn-primary mt-5 inline-flex">
              Sonuçlara Git
            </Link>
          </section>
        ) : (
          <section className="card-pop overflow-hidden">
            <div className="border-b-2 border-[#1E293B] bg-[#34D399] px-5 py-4">
              <h2 className="font-heading text-xl font-black text-[#1E293B]">
                Abone İşletmeler
              </h2>
              <p className="mt-1 text-sm font-bold text-[#1E293B]">
                {subscribers.length} işletme Yorum Kart abonesi olarak
                işaretlendi.
              </p>
            </div>

            <div className="hidden lg:block">
              <table className="table-pop w-full table-fixed">
                <thead>
                  <tr>
                    <th className="w-[24%] text-left">İşletme</th>
                    <th className="w-[17%] text-left">Konum</th>
                    <th className="w-[15%] text-left">Skorlar</th>
                    <th className="w-[14%] text-left">Abone Tarihi</th>
                    <th className="w-[18%] text-left">Not / Durum</th>
                    <th className="w-[12%] text-left">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubscribers.map((subscriber) => (
                    <tr key={getBusinessKey(subscriber)}>
                      <td>
                        <SubscriberSummary subscriber={subscriber} />
                      </td>
                      <td className="text-sm font-bold text-slate-600">
                        {subscriber.location}
                      </td>
                      <td>
                        <SubscriberScores subscriber={subscriber} />
                      </td>
                      <td className="text-sm font-extrabold text-[#1E293B]">
                        {formatSubscribedAt(subscriber.subscribedAt)}
                      </td>
                      <td>
                        <SubscriberFields
                          subscriber={subscriber}
                          onUpdate={handleUpdateSubscriber}
                        />
                      </td>
                      <td>
                        <SubscriberActions
                          subscriber={subscriber}
                          onRemove={handleRemoveSubscriber}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 lg:hidden">
              {sortedSubscribers.map((subscriber) => (
                <article
                  key={getBusinessKey(subscriber)}
                  className="rounded-[24px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]"
                >
                  <SubscriberSummary subscriber={subscriber} large />

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricBadge
                      label="Puan"
                      value={subscriber.rating.toFixed(1)}
                    />
                    <MetricBadge
                      label="Yorum"
                      value={String(subscriber.reviewCount)}
                    />
                    <MetricBadge
                      label="Yorum Kart"
                      value={`${getReviewCardScore(subscriber)}/100`}
                      helper={getReviewCardRiskLevel(
                        getReviewCardScore(subscriber),
                      )}
                    />
                    <MetricBadge
                      label="Fırsat"
                      value={`⭐ ${subscriber.leadScore}/100`}
                    />
                  </div>

                  <p className="mt-4 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-3 text-sm font-extrabold text-[#1E293B]">
                    Abone olma tarihi:{" "}
                    {formatSubscribedAt(subscriber.subscribedAt)}
                  </p>

                  <div className="mt-4">
                    <SubscriberFields
                      subscriber={subscriber}
                      onUpdate={handleUpdateSubscriber}
                    />
                  </div>

                  <div className="mt-4">
                    <SubscriberActions
                      subscriber={subscriber}
                      onRemove={handleRemoveSubscriber}
                      stacked
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function SubscriberSummary({
  subscriber,
  large = false,
}: {
  subscriber: ReviewCardSubscriber;
  large?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3
        className={`font-heading font-black text-[#1E293B] ${
          large ? "text-xl" : "text-base"
        }`}
      >
        {subscriber.businessName}
      </h3>
      <p className="text-sm font-bold text-slate-600">{subscriber.category}</p>
      {large ? (
        <p className="text-sm font-bold text-slate-600">
          {subscriber.location}
        </p>
      ) : null}
    </div>
  );
}

function SubscriberScores({
  subscriber,
}: {
  subscriber: ReviewCardSubscriber;
}) {
  const reviewCardScore = getReviewCardScore(subscriber);

  return (
    <div className="flex flex-col gap-2">
      <span className="badge-pop bg-[#EDE9FE]">
        {reviewCardScore}/100
      </span>
      <span className="text-xs font-extrabold text-slate-500">
        {getReviewCardRiskLevel(reviewCardScore)}
      </span>
      <span className="badge-pop bg-[#FBBF24]">
        ⭐ {subscriber.leadScore}/100
      </span>
      <span className="text-xs font-extrabold text-slate-500">
        {subscriber.rating.toFixed(1)} puan / {subscriber.reviewCount} yorum
      </span>
    </div>
  );
}

function SubscriberFields({
  subscriber,
  onUpdate,
}: {
  subscriber: ReviewCardSubscriber;
  onUpdate: (
    subscriber: ReviewCardSubscriber,
    updates: Pick<ReviewCardSubscriber, "note" | "status">,
  ) => void;
}) {
  const selectedStatus = subscriber.status ?? "Aktif Abone";
  const statusOptions = subscriberStatusOptions.includes(selectedStatus)
    ? subscriberStatusOptions
    : [selectedStatus, ...subscriberStatusOptions];

  return (
    <div className="grid gap-3">
      <label className="grid gap-2">
        <span className="text-sm font-black text-[#1E293B]">Durum</span>
        <select
          value={selectedStatus}
          onChange={(event) =>
            onUpdate(subscriber, { status: event.target.value })
          }
          className="input-pop w-full"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-black text-[#1E293B]">Not</span>
        <textarea
          value={subscriber.note ?? ""}
          onChange={(event) =>
            onUpdate(subscriber, { note: event.target.value })
          }
          placeholder="Abonelik notu ekle"
          className="input-pop min-h-24 w-full"
        />
      </label>
    </div>
  );
}

function SubscriberActions({
  subscriber,
  onRemove,
  stacked = false,
}: {
  subscriber: ReviewCardSubscriber;
  onRemove: (subscriber: ReviewCardSubscriber) => void;
  stacked?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${stacked ? "flex-col" : "flex-wrap"}`}>
      <a
        href={getSafeMapsUrl(subscriber)}
        target="_blank"
        rel="noreferrer"
        className={`${stacked ? "w-full" : ""} btn-ghost min-h-11 px-3`}
      >
        Google Maps
      </a>
      <button
        type="button"
        onClick={() => onRemove(subscriber)}
        className={`${stacked ? "w-full" : ""} btn-danger min-h-11 px-3 text-xs`}
      >
        Abonelikten Çıkar
      </button>
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
