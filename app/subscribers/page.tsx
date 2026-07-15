"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { createMapsSearchUrl } from "@/lib/business-normalization";
import {
  calculateReviewCardScore,
  getReviewCardRiskLevel,
} from "@/lib/review-card-score";
import {
  ACCOUNTING_RECORDS_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
} from "@/lib/storage-keys";
import type { AccountingRecord, ReviewCardSubscriber } from "@/types/business";

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

function getInitialAccountingRecords(): AccountingRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedRecords = window.localStorage.getItem(ACCOUNTING_RECORDS_STORAGE_KEY);

  if (!savedRecords) {
    return [];
  }

  try {
    return JSON.parse(savedRecords) as AccountingRecord[];
  } catch {
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
  const [accountingRecords] = useState<AccountingRecord[]>(getInitialAccountingRecords);
  const [selectedSubscriber, setSelectedSubscriber] =
    useState<ReviewCardSubscriber | null>(null);
  const [openActionMenuKey, setOpenActionMenuKey] = useState<string | null>(null);

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
  const accountingRecordKeys = useMemo(() => {
    return new Set(
      accountingRecords.map((record) =>
        `${record.businessName.trim().toLocaleLowerCase("tr-TR")}::${record.location.trim().toLocaleLowerCase("tr-TR")}`,
      ),
    );
  }, [accountingRecords]);

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
    setSelectedSubscriber((currentSubscriber) =>
      currentSubscriber &&
      getBusinessKey(currentSubscriber) === getBusinessKey(subscriber)
        ? { ...currentSubscriber, ...updates }
        : currentSubscriber,
    );
  }

  function handleRemoveSubscriber(subscriber: ReviewCardSubscriber) {
    const updatedSubscribers = subscribers.filter(
      (currentSubscriber) =>
        getBusinessKey(currentSubscriber) !== getBusinessKey(subscriber),
    );

    saveSubscribers(updatedSubscribers);
    setSelectedSubscriber(null);
    setOpenActionMenuKey(null);
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
        <header>
          <p className="page-eyebrow">Yorum Kart</p>
          <h1 className="page-title mt-5">Yorum Kart Aboneleri</h1>
          <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
            Abone işletmeleri, durumlarını ve satış sonrası notları takip edin.
          </p>
        </header>

        {subscribers.length === 0 ? (
          <section className="card-pop bg-white p-6">
            <h2 className="font-heading text-xl font-semibold text-[#0F172A]">
              Henüz Yorum Kart abonesi eklenmedi.
            </h2>
            <Link href="/results" className="btn-primary mt-5 inline-flex">
              Sonuçlara Git
            </Link>
          </section>
        ) : (
          <section className="card-pop overflow-visible">
            <div className="border-b border-[#E2E8F0] bg-white px-5 py-4">
              <h2 className="font-heading text-lg font-semibold text-[#0F172A]">
                Abone İşletmeler
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {subscribers.length} işletme Yorum Kart abonesi olarak işaretlendi.
              </p>
            </div>

            <div className="hidden lg:block">
              <table className="table-pop w-full table-fixed">
                <thead>
                  <tr>
                    <th className="w-[30%] text-left">İşletme</th>
                    <th className="w-[14%] text-left">Puan / Yorum</th>
                    <th className="w-[18%] text-left">Abone Durumu</th>
                    <th className="w-[16%] text-left">Abonelik Tarihi</th>
                    <th className="w-[12%] text-left">Muhasebe</th>
                    <th className="w-[10%] text-left">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSubscribers.map((subscriber) => (
                    <tr key={getBusinessKey(subscriber)}>
                      <td>
                        <SubscriberSummary subscriber={subscriber} />
                      </td>
                      <td>
                        <span className="text-sm font-semibold text-[#0F172A]">
                          {subscriber.rating.toFixed(1)}
                        </span>
                        <p className="text-xs text-[#64748B]">
                          {subscriber.reviewCount} yorum
                        </p>
                      </td>
                      <td>
                        <SubscriberStatusBadge status={subscriber.status} />
                      </td>
                      <td className="text-sm font-medium text-[#0F172A]">
                        {formatSubscribedAt(subscriber.subscribedAt)}
                      </td>
                      <td>
                        <AccountingStateBadge
                          hasRecord={accountingRecordKeys.has(getBusinessKey(subscriber))}
                        />
                      </td>
                      <td>
                        <SubscriberActions
                          subscriber={subscriber}
                          onOpenDetail={setSelectedSubscriber}
                          onRemove={handleRemoveSubscriber}
                          openMenuKey={openActionMenuKey}
                          onToggleMenu={setOpenActionMenuKey}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 lg:hidden">
              {sortedSubscribers.map((subscriber) => (
                <article
                  key={getBusinessKey(subscriber)}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <SubscriberSummary subscriber={subscriber} large />
                    <SubscriberStatusBadge status={subscriber.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#64748B]">
                    <span>{subscriber.rating.toFixed(1)} puan</span>
                    <span>{subscriber.reviewCount} yorum</span>
                    <span>{formatSubscribedAt(subscriber.subscribedAt)}</span>
                  </div>
                  <div className="mt-4">
                    <SubscriberActions
                      subscriber={subscriber}
                      onOpenDetail={setSelectedSubscriber}
                      onRemove={handleRemoveSubscriber}
                      openMenuKey={openActionMenuKey}
                      onToggleMenu={setOpenActionMenuKey}
                      stacked
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {selectedSubscriber ? (
        <SubscriberDetailModal
          subscriber={selectedSubscriber}
          hasAccountingRecord={accountingRecordKeys.has(getBusinessKey(selectedSubscriber))}
          onUpdate={handleUpdateSubscriber}
          onRemove={handleRemoveSubscriber}
          onClose={() => setSelectedSubscriber(null)}
        />
      ) : null}
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
    <div className="min-w-0">
      <h3
        className={`font-heading font-semibold text-[#0F172A] ${
          large ? "text-lg" : "text-base"
        }`}
      >
        {subscriber.businessName}
      </h3>
      <p className="mt-1 text-sm text-[#64748B]">
        {subscriber.category} • {subscriber.location}
      </p>
    </div>
  );
}

function SubscriberActions({
  subscriber,
  onOpenDetail,
  onRemove,
  openMenuKey,
  onToggleMenu,
  stacked = false,
}: {
  subscriber: ReviewCardSubscriber;
  onOpenDetail: (subscriber: ReviewCardSubscriber) => void;
  onRemove: (subscriber: ReviewCardSubscriber) => void;
  openMenuKey: string | null;
  onToggleMenu: (key: string | null) => void;
  stacked?: boolean;
}) {
  return (
    <div className={`flex gap-2 ${stacked ? "flex-col" : "flex-wrap"}`}>
      <button
        type="button"
        onClick={() => onOpenDetail(subscriber)}
        className={`${stacked ? "w-full" : ""} btn-secondary min-h-10 px-3 text-xs`}
      >
        Detay
      </button>
      <SubscriberActionMenu
        subscriber={subscriber}
        openMenuKey={openMenuKey}
        onToggleMenu={onToggleMenu}
        onRemove={onRemove}
        stacked={stacked}
      />
    </div>
  );
}

function SubscriberActionMenu({
  subscriber,
  openMenuKey,
  onToggleMenu,
  onRemove,
  stacked = false,
}: {
  subscriber: ReviewCardSubscriber;
  openMenuKey: string | null;
  onToggleMenu: (key: string | null) => void;
  onRemove: (subscriber: ReviewCardSubscriber) => void;
  stacked?: boolean;
}) {
  const menuKey = getBusinessKey(subscriber);
  const isOpen = openMenuKey === menuKey;

  function closeMenu() {
    onToggleMenu(null);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggleMenu(isOpen ? null : menuKey)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeMenu();
          }
        }}
        aria-label="Abone işlemleri"
        aria-expanded={isOpen}
        className={`${stacked ? "w-full" : ""} btn-ghost min-h-10 px-3 text-xs`}
      >
        İşlemler
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-lg">
          <a
            href={getSafeMapsUrl(subscriber)}
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
            className="block rounded-md px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            Google Maps
          </a>
          <button
            type="button"
            onClick={() => {
              onRemove(subscriber);
              closeMenu();
            }}
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
          >
            Abonelikten Çıkar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SubscriberDetailModal({
  subscriber,
  hasAccountingRecord,
  onUpdate,
  onRemove,
  onClose,
}: {
  subscriber: ReviewCardSubscriber;
  hasAccountingRecord: boolean;
  onUpdate: (
    subscriber: ReviewCardSubscriber,
    updates: Pick<ReviewCardSubscriber, "note" | "status">,
  ) => void;
  onRemove: (subscriber: ReviewCardSubscriber) => void;
  onClose: () => void;
}) {
  const reviewCardScore = getReviewCardScore(subscriber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] bg-white px-5 py-4">
          <div>
            <p className="page-eyebrow">Abone Detayı</p>
            <h2 className="mt-3 font-heading text-2xl font-semibold text-[#0F172A]">
              {subscriber.businessName}
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              {subscriber.category} • {subscriber.location}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary min-h-10 px-4"
            aria-label="Detayı kapat"
          >
            Kapat
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricBadge label="Puan" value={subscriber.rating.toFixed(1)} />
            <MetricBadge label="Yorum" value={String(subscriber.reviewCount)} />
            <MetricBadge
              label="Yorum Kart"
              value={`${reviewCardScore}/100`}
              helper={getReviewCardRiskLevel(reviewCardScore)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Abonelik Tarihi" value={formatSubscribedAt(subscriber.subscribedAt)} />
            <DetailItem label="Muhasebe" value={hasAccountingRecord ? "Kayıt Var" : "Kayıt Yok"} />
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#0F172A]">Durum</span>
              <SubscriberStatusSelect
                subscriber={subscriber}
                onUpdate={onUpdate}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[#0F172A]">Not</span>
              <textarea
                value={subscriber.note ?? ""}
                onChange={(event) =>
                  onUpdate(subscriber, { note: event.target.value })
                }
                placeholder="Abonelik notu ekle"
                className="input-pop min-h-28 w-full"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-5 py-4 sm:flex-row sm:justify-end">
          <a
            href={getSafeMapsUrl(subscriber)}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Google Maps
          </a>
          <button
            type="button"
            onClick={() => onRemove(subscriber)}
            className="btn-danger"
          >
            Abonelikten Çıkar
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">
            Kapat
          </button>
        </div>
      </section>
    </div>
  );
}

function SubscriberStatusSelect({
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
    <select
      value={selectedStatus}
      onChange={(event) => onUpdate(subscriber, { status: event.target.value })}
      className="input-pop w-full"
    >
      {statusOptions.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

function SubscriberStatusBadge({ status }: { status?: string }) {
  const label = status || "Aktif Abone";

  return (
    <span className="badge-pop bg-[#EFF6FF] text-[#2563EB]">{label}</span>
  );
}

function AccountingStateBadge({ hasRecord }: { hasRecord: boolean }) {
  return (
    <span
      className={`badge-pop ${
        hasRecord ? "bg-[#F0FDF4] text-[#166534]" : "bg-[#F1F5F9] text-[#475569]"
      }`}
    >
      {hasRecord ? "Kayıt Var" : "Kayıt Yok"}
    </span>
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
      {helper ? <p className="mt-1 text-xs text-[#64748B]">{helper}</p> : null}
    </div>
  );
}
