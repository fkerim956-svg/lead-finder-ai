"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  ACCOUNTING_RECORDS_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
} from "@/lib/storage-keys";
import type { AccountingRecord, ReviewCardSubscriber } from "@/types/business";

type SaleFormState = {
  subscriberBusinessKey: string;
  saleAmount: string;
  nfcCardQuantity: string;
  nfcCardUnitCost: string;
  printCost: string;
  designCost: string;
  deliveryCost: string;
  setupCost: string;
  otherCost: string;
  saleDate: string;
  note: string;
};

type AccountingTotals = {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  totalPartner1Share: number;
  totalPartner2Share: number;
  totalPartner3Share: number;
};

const initialFormState: SaleFormState = {
  subscriberBusinessKey: "",
  saleAmount: "",
  nfcCardQuantity: "1",
  nfcCardUnitCost: "",
  printCost: "",
  designCost: "",
  deliveryCost: "",
  setupCost: "",
  otherCost: "",
  saleDate: new Date().toISOString().slice(0, 10),
  note: "",
};

function getBusinessKey(
  business: Pick<ReviewCardSubscriber, "businessName" | "location">,
) {
  return `${business.businessName.trim().toLocaleLowerCase("tr-TR")}::${business.location.trim().toLocaleLowerCase("tr-TR")}`;
}

function getInitialRecords(): AccountingRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const savedRecords = window.localStorage.getItem(
    ACCOUNTING_RECORDS_STORAGE_KEY,
  );

  if (!savedRecords) {
    return [];
  }

  try {
    return JSON.parse(savedRecords) as AccountingRecord[];
  } catch {
    window.localStorage.removeItem(ACCOUNTING_RECORDS_STORAGE_KEY);
    return [];
  }
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

function parseMoney(value: string): number {
  const normalizedValue = value.replace(",", ".").trim();
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseQuantity(value: string): number {
  const parsedValue = Number(value.replace(",", ".").trim());

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function calculateSaleValues(formState: SaleFormState) {
  const saleAmount = parseMoney(formState.saleAmount);
  const nfcCardQuantity = parseQuantity(formState.nfcCardQuantity);
  const nfcCardUnitCost = parseMoney(formState.nfcCardUnitCost);
  const nfcCardTotalCost = nfcCardQuantity * nfcCardUnitCost;
  const printCost = parseMoney(formState.printCost);
  const designCost = parseMoney(formState.designCost);
  const deliveryCost = parseMoney(formState.deliveryCost);
  const setupCost = parseMoney(formState.setupCost);
  const otherCost = parseMoney(formState.otherCost);
  const totalCost =
    nfcCardTotalCost +
    printCost +
    designCost +
    deliveryCost +
    setupCost +
    otherCost;
  const netProfit = saleAmount - totalCost;

  return {
    saleAmount,
    nfcCardQuantity,
    nfcCardUnitCost,
    nfcCardTotalCost,
    printCost,
    designCost,
    deliveryCost,
    setupCost,
    otherCost,
    totalCost,
    netProfit,
    partner1Share: netProfit * 0.5,
    partner2Share: netProfit * 0.4,
    partner3Share: netProfit * 0.1,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Tarih yok";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(date);
}

function createRecordId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `accounting-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AccountingPage() {
  const [records, setRecords] = useState<AccountingRecord[]>(getInitialRecords);
  const [subscribers] = useState<ReviewCardSubscriber[]>(getInitialSubscribers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<SaleFormState>(initialFormState);
  const [formError, setFormError] = useState("");

  const selectedSubscriber = useMemo(() => {
    return subscribers.find(
      (subscriber) => getBusinessKey(subscriber) === formState.subscriberBusinessKey,
    );
  }, [formState.subscriberBusinessKey, subscribers]);

  const calculatedSale = useMemo(
    () => calculateSaleValues(formState),
    [formState],
  );

  const totals = useMemo<AccountingTotals>(() => {
    return records.reduce(
      (currentTotals, record) => ({
        totalRevenue: currentTotals.totalRevenue + record.saleAmount,
        totalCost: currentTotals.totalCost + record.totalCost,
        netProfit: currentTotals.netProfit + record.netProfit,
        totalPartner1Share:
          currentTotals.totalPartner1Share + record.partner1Share,
        totalPartner2Share:
          currentTotals.totalPartner2Share + record.partner2Share,
        totalPartner3Share:
          currentTotals.totalPartner3Share + record.partner3Share,
      }),
      {
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        totalPartner1Share: 0,
        totalPartner2Share: 0,
        totalPartner3Share: 0,
      },
    );
  }, [records]);

  const sortedRecords = useMemo(() => {
    return [...records].sort(
      (firstRecord, secondRecord) =>
        new Date(secondRecord.saleDate).getTime() -
        new Date(firstRecord.saleDate).getTime(),
    );
  }, [records]);

  function saveRecords(updatedRecords: AccountingRecord[]) {
    setRecords(updatedRecords);
    window.localStorage.setItem(
      ACCOUNTING_RECORDS_STORAGE_KEY,
      JSON.stringify(updatedRecords),
    );
  }

  function updateFormField(field: keyof SaleFormState, value: string) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFormError("");
  }

  function handleOpenModal() {
    setFormState(initialFormState);
    setFormError("");
    setIsModalOpen(true);
  }

  function handleSaveRecord() {
    if (!selectedSubscriber) {
      setFormError("Lütfen önce bir abone işletme seçin.");
      return;
    }

    if (!Number.isFinite(Number(formState.saleAmount.replace(",", ".")))) {
      setFormError("Satış tutarı geçerli bir sayı olmalı.");
      return;
    }

    const newRecord: AccountingRecord = {
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      saleDate: formState.saleDate || new Date().toISOString().slice(0, 10),
      subscriberBusinessKey: getBusinessKey(selectedSubscriber),
      businessName: selectedSubscriber.businessName,
      category: selectedSubscriber.category,
      location: selectedSubscriber.location,
      saleAmount: calculatedSale.saleAmount,
      nfcCardQuantity: calculatedSale.nfcCardQuantity,
      nfcCardUnitCost: calculatedSale.nfcCardUnitCost,
      nfcCardTotalCost: calculatedSale.nfcCardTotalCost,
      printCost: calculatedSale.printCost,
      designCost: calculatedSale.designCost,
      deliveryCost: calculatedSale.deliveryCost,
      setupCost: calculatedSale.setupCost,
      otherCost: calculatedSale.otherCost,
      totalCost: calculatedSale.totalCost,
      netProfit: calculatedSale.netProfit,
      partner1Share: calculatedSale.partner1Share,
      partner2Share: calculatedSale.partner2Share,
      partner3Share: calculatedSale.partner3Share,
      note: formState.note.trim(),
    };

    saveRecords([newRecord, ...records]);
    setIsModalOpen(false);
    setFormState(initialFormState);
  }

  function handleDeleteRecord(recordId: string) {
    saveRecords(records.filter((record) => record.id !== recordId));
  }

  function escapeCsvValue(value: string | number): string {
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
      "İşletme",
      "Konum",
      "Satış Tarihi",
      "Satış Tutarı",
      "NFC Kart Adedi",
      "NFC Birim Maliyeti",
      "NFC Toplam Maliyet",
      "Baskı Maliyeti",
      "Tasarım Maliyeti",
      "Teslimat/Yol Maliyeti",
      "Kurulum Maliyeti",
      "Diğer Gider",
      "Toplam Gider",
      "Net Kâr",
      "1. Kişi Payı",
      "2. Kişi Payı",
      "3. Kişi Payı",
      "Not",
    ];
    const rows = sortedRecords.map((record) => [
      record.businessName,
      record.location,
      record.saleDate,
      record.saleAmount,
      record.nfcCardQuantity,
      record.nfcCardUnitCost,
      record.nfcCardTotalCost,
      record.printCost,
      record.designCost,
      record.deliveryCost,
      record.setupCost,
      record.otherCost,
      record.totalCost,
      record.netProfit,
      record.partner1Share,
      record.partner2Share,
      record.partner3Share,
      record.note,
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
    link.download = "lead-finder-accounting.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="page-eyebrow">Yorum Kart</p>
            <h1 className="page-title mt-5">Muhasebe</h1>
            <p className="muted-text mt-4 max-w-3xl text-base font-medium leading-7">
              Yorum Kart satış gelirlerini, maliyetleri ve ortak paylarını
              takip edin.
            </p>
          </div>
          <button type="button" onClick={handleOpenModal} className="btn-primary w-fit">
            Satış Kaydı Ekle
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Toplam Ciro"
            value={formatCurrency(totals.totalRevenue)}
            color="#FBBF24"
          />
          <SummaryCard
            label="Toplam Gider"
            value={formatCurrency(totals.totalCost)}
            color="#F472B6"
          />
          <SummaryCard
            label="Net Kâr"
            value={formatCurrency(totals.netProfit)}
            color="#34D399"
          />
        </section>

        <section className="card-pop overflow-hidden">
          <div className="flex flex-col gap-3 border-b-2 border-[#1E293B] bg-[#FBBF24] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-black text-[#1E293B]">
                Satış Kayıtları
              </h2>
              <p className="mt-1 text-sm font-bold text-[#1E293B]">
                {records.length} kayıt gösteriliyor.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={records.length === 0}
              className="btn-secondary"
            >
              Muhasebe CSV İndir
            </button>
          </div>

          {records.length === 0 ? (
            <div className="p-5">
              <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
                Henüz satış kaydı yok. İlk kaydı eklemek için “Satış Kaydı
                Ekle” butonunu kullan.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4">
              {sortedRecords.map((record) => (
                <article
                  key={record.id}
                  className="rounded-[24px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.4fr_2fr_auto] lg:items-start">
                    <div>
                      <h3 className="font-heading text-xl font-black text-[#1E293B]">
                        {record.businessName}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {record.category} • {record.location}
                      </p>
                      <p className="mt-2 w-fit rounded-full border-2 border-[#1E293B] bg-[#EDE9FE] px-3 py-1 text-xs font-black text-[#1E293B]">
                        {formatDate(record.saleDate)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricBadge
                        label="Satış Tutarı"
                        value={formatCurrency(record.saleAmount)}
                      />
                      <MetricBadge
                        label="Toplam Gider"
                        value={formatCurrency(record.totalCost)}
                      />
                      <MetricBadge
                        label="Net Kâr"
                        value={formatCurrency(record.netProfit)}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(record.id)}
                      className="btn-danger min-h-11 px-3 text-xs"
                    >
                      Kaydı Sil
                    </button>
                  </div>

                  {record.note ? (
                    <p className="mt-4 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-3 text-sm font-bold text-[#1E293B]">
                      {record.note}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card-pop p-5">
          <div>
            <h2 className="font-heading text-2xl font-black text-[#1E293B]">
              Ortak Pay Dağılımı
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Net kâr üzerinden otomatik hesaplanır.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ShareCard
              label="1. Kişi Payı (%50)"
              value={formatCurrency(totals.totalPartner1Share)}
              color="#8B5CF6"
            />
            <ShareCard
              label="2. Kişi Payı (%40)"
              value={formatCurrency(totals.totalPartner2Share)}
              color="#34D399"
            />
            <ShareCard
              label="3. Kişi Payı (%10)"
              value={formatCurrency(totals.totalPartner3Share)}
              color="#F472B6"
            />
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <SaleRecordModal
          subscribers={subscribers}
          formState={formState}
          selectedSubscriber={selectedSubscriber}
          calculatedSale={calculatedSale}
          formError={formError}
          onUpdateField={updateFormField}
          onSave={handleSaveRecord}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </AppShell>
  );
}

function SaleRecordModal({
  subscribers,
  formState,
  selectedSubscriber,
  calculatedSale,
  formError,
  onUpdateField,
  onSave,
  onClose,
}: {
  subscribers: ReviewCardSubscriber[];
  formState: SaleFormState;
  selectedSubscriber: ReviewCardSubscriber | undefined;
  calculatedSale: ReturnType<typeof calculateSaleValues>;
  formError: string;
  onUpdateField: (field: keyof SaleFormState, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
      <section className="hard-shadow-lg max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border-2 border-[#1E293B] bg-white">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4">
          <div>
            <p className="page-eyebrow bg-[#34D399]">Muhasebe</p>
            <h2 className="mt-3 font-heading text-3xl font-black text-[#1E293B]">
              Satış Kaydı Ekle
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4">
            Kapat
          </button>
        </div>

        <div className="grid gap-5 p-5">
          {subscribers.length === 0 ? (
            <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
              Önce Aboneler sayfasından bir işletmeyi Yorum Kart abonesi
              olarak ekleyin.
            </p>
          ) : (
            <>
              <FormField label="Abone işletme">
                <select
                  value={formState.subscriberBusinessKey}
                  onChange={(event) =>
                    onUpdateField("subscriberBusinessKey", event.target.value)
                  }
                  className="input-pop w-full"
                >
                  <option value="">İşletme seç</option>
                  {subscribers.map((subscriber) => (
                    <option
                      key={getBusinessKey(subscriber)}
                      value={getBusinessKey(subscriber)}
                    >
                      {subscriber.businessName} • {subscriber.location} •{" "}
                      {subscriber.rating.toFixed(1)} puan /{" "}
                      {subscriber.reviewCount} yorum
                    </option>
                  ))}
                </select>
              </FormField>

              {selectedSubscriber ? (
                <div className="grid gap-4">
                  <div className="rounded-2xl border-2 border-[#1E293B] bg-[#EDE9FE] p-4">
                    <p className="font-heading text-lg font-black text-[#1E293B]">
                      {selectedSubscriber.businessName}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      {selectedSubscriber.category} • {selectedSubscriber.location}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Satış tutarı">
                      <NumberInput
                        value={formState.saleAmount}
                        onChange={(value) => onUpdateField("saleAmount", value)}
                        placeholder="Örn: 2500"
                      />
                    </FormField>
                    <FormField label="Satış tarihi">
                      <input
                        type="date"
                        value={formState.saleDate}
                        onChange={(event) =>
                          onUpdateField("saleDate", event.target.value)
                        }
                        className="input-pop w-full"
                      />
                    </FormField>
                    <FormField label="NFC kart adedi">
                      <NumberInput
                        value={formState.nfcCardQuantity}
                        onChange={(value) =>
                          onUpdateField("nfcCardQuantity", value)
                        }
                      />
                    </FormField>
                    <FormField label="1 NFC kart maliyeti">
                      <NumberInput
                        value={formState.nfcCardUnitCost}
                        onChange={(value) =>
                          onUpdateField("nfcCardUnitCost", value)
                        }
                      />
                    </FormField>
                    <FormField label="Baskı maliyeti">
                      <NumberInput
                        value={formState.printCost}
                        onChange={(value) => onUpdateField("printCost", value)}
                      />
                    </FormField>
                    <FormField label="Tasarım maliyeti">
                      <NumberInput
                        value={formState.designCost}
                        onChange={(value) => onUpdateField("designCost", value)}
                      />
                    </FormField>
                    <FormField label="Teslimat / yol maliyeti">
                      <NumberInput
                        value={formState.deliveryCost}
                        onChange={(value) => onUpdateField("deliveryCost", value)}
                      />
                    </FormField>
                    <FormField label="Kurulum maliyeti">
                      <NumberInput
                        value={formState.setupCost}
                        onChange={(value) => onUpdateField("setupCost", value)}
                      />
                    </FormField>
                    <FormField label="Diğer gider">
                      <NumberInput
                        value={formState.otherCost}
                        onChange={(value) => onUpdateField("otherCost", value)}
                      />
                    </FormField>
                  </div>

                  <FormField label="Not">
                    <textarea
                      value={formState.note}
                      onChange={(event) => onUpdateField("note", event.target.value)}
                      placeholder="Satış notu ekle"
                      className="input-pop min-h-24 w-full"
                    />
                  </FormField>

                  <div className="rounded-[24px] border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
                    <h3 className="font-heading text-xl font-black text-[#1E293B]">
                      Hesap Özeti
                    </h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricBadge
                        label="Satış tutarı"
                        value={formatCurrency(calculatedSale.saleAmount)}
                      />
                      <MetricBadge
                        label="NFC toplam maliyet"
                        value={formatCurrency(calculatedSale.nfcCardTotalCost)}
                      />
                      <MetricBadge
                        label="Toplam gider"
                        value={formatCurrency(calculatedSale.totalCost)}
                      />
                      <MetricBadge
                        label="Net kâr"
                        value={formatCurrency(calculatedSale.netProfit)}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {formError ? (
            <p className="rounded-2xl border-2 border-[#1E293B] bg-[#F472B6] p-3 text-sm font-black text-[#1E293B]">
              {formError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-[#1E293B] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={subscribers.length === 0}
            className="btn-primary"
          >
            Satışı Kaydet
          </button>
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
  value: string;
  color: string;
}) {
  return (
    <article className="card-pop relative overflow-hidden p-5">
      <div
        className="absolute -right-4 -top-5 h-20 w-20 rotate-12 rounded-[28px] border-2 border-[#1E293B]"
        style={{ backgroundColor: color }}
      />
      <p className="relative text-sm font-extrabold text-slate-600">{label}</p>
      <p className="relative mt-4 font-heading text-3xl font-black text-[#1E293B] sm:text-4xl">
        {value}
      </p>
    </article>
  );
}

function ShareCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <article className="rounded-[24px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]">
      <span
        className="inline-flex h-4 w-14 rounded-full border-2 border-[#1E293B]"
        style={{ backgroundColor: color }}
      />
      <p className="mt-4 text-sm font-extrabold text-slate-600">{label}</p>
      <p className="mt-2 font-heading text-2xl font-black text-[#1E293B]">
        {value}
      </p>
    </article>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#1E293B] bg-white p-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-[#1E293B]">{value}</p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-[#1E293B]">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="input-pop w-full"
    />
  );
}
