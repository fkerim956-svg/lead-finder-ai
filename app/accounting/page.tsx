"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  ACCOUNTING_RECORDS_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
} from "@/lib/storage-keys";
import type { AccountingRecord, ReviewCardSubscriber } from "@/types/business";

type PackageName = "Başlangıç" | "Pro" | "Premium" | "Kurumsal";

type PackagePreset = {
  name: PackageName;
  setupFee: number;
  monthlyFee: number;
  defaultNfcCardQuantity: number;
};

type SubscriptionFormState = {
  subscriberBusinessKey: string;
  packageName: PackageName;
  setupFee: string;
  monthlyFee: string;
  nfcCardQuantity: string;
  nfcCardUnitCost: string;
  extraServiceRevenue: string;
  extraServiceNote: string;
  printCost: string;
  designCost: string;
  deliveryCost: string;
  setupCost: string;
  otherCost: string;
  subscriptionStartDate: string;
  note: string;
};

type NormalizedAccountingRecord = {
  id: string;
  createdAt: string;
  subscriptionStartDate: string;
  subscriberBusinessKey: string;
  businessName: string;
  category: string;
  location: string;
  packageName: string;
  setupFee: number;
  monthlyFee: number;
  nfcCardQuantity: number;
  nfcCardUnitCost: number;
  nfcCardTotalCost: number;
  extraServiceRevenue: number;
  extraServiceNote: string;
  printCost: number;
  designCost: number;
  deliveryCost: number;
  setupCost: number;
  otherCost: number;
  totalExpense: number;
  totalRevenue: number;
  distributableNet: number;
  partner1Share: number;
  partner2Share: number;
  partner3Share: number;
  totalDistributed: number;
  note: string;
};

type AccountingTotals = {
  totalRevenue: number;
  totalExpense: number;
  distributableNet: number;
  monthlyRecurringRevenue: number;
  totalPartner1Share: number;
  totalPartner2Share: number;
  totalPartner3Share: number;
};

const PACKAGE_PRESETS: PackagePreset[] = [
  {
    name: "Başlangıç",
    setupFee: 2500,
    monthlyFee: 1000,
    defaultNfcCardQuantity: 2,
  },
  {
    name: "Pro",
    setupFee: 4000,
    monthlyFee: 2000,
    defaultNfcCardQuantity: 5,
  },
  {
    name: "Premium",
    setupFee: 7500,
    monthlyFee: 3500,
    defaultNfcCardQuantity: 10,
  },
  {
    name: "Kurumsal",
    setupFee: 15000,
    monthlyFee: 7500,
    defaultNfcCardQuantity: 10,
  },
];

const defaultPackage = PACKAGE_PRESETS[0];

const initialFormState: SubscriptionFormState = {
  subscriberBusinessKey: "",
  packageName: defaultPackage.name,
  setupFee: String(defaultPackage.setupFee),
  monthlyFee: String(defaultPackage.monthlyFee),
  nfcCardQuantity: String(defaultPackage.defaultNfcCardQuantity),
  nfcCardUnitCost: "",
  extraServiceRevenue: "",
  extraServiceNote: "",
  printCost: "",
  designCost: "",
  deliveryCost: "",
  setupCost: "",
  otherCost: "",
  subscriptionStartDate: new Date().toISOString().slice(0, 10),
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

function safeNumber(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function calculateSubscriptionValues(formState: SubscriptionFormState) {
  const setupFee = parseMoney(formState.setupFee);
  const monthlyFee = parseMoney(formState.monthlyFee);
  const extraServiceRevenue = parseMoney(formState.extraServiceRevenue);
  const nfcCardQuantity = parseQuantity(formState.nfcCardQuantity);
  const nfcCardUnitCost = parseMoney(formState.nfcCardUnitCost);
  const nfcCardTotalCost = nfcCardQuantity * nfcCardUnitCost;
  const printCost = parseMoney(formState.printCost);
  const designCost = parseMoney(formState.designCost);
  const deliveryCost = parseMoney(formState.deliveryCost);
  const setupCost = parseMoney(formState.setupCost);
  const otherCost = parseMoney(formState.otherCost);
  const totalRevenue = setupFee + monthlyFee + extraServiceRevenue;
  const totalExpense =
    nfcCardTotalCost +
    printCost +
    designCost +
    deliveryCost +
    setupCost +
    otherCost;
  const partner1Share = totalRevenue * 0.7 - totalExpense;
  const partner2Share = totalRevenue * 0.2;
  const partner3Share = totalRevenue * 0.1;
  const totalDistributed = partner1Share + partner2Share + partner3Share;

  return {
    setupFee,
    monthlyFee,
    extraServiceRevenue,
    nfcCardQuantity,
    nfcCardUnitCost,
    nfcCardTotalCost,
    printCost,
    designCost,
    deliveryCost,
    setupCost,
    otherCost,
    totalRevenue,
    totalExpense,
    distributableNet: totalRevenue - totalExpense,
    partner1Share,
    partner2Share,
    partner3Share,
    totalDistributed,
  };
}

function normalizeAccountingRecord(
  record: AccountingRecord,
): NormalizedAccountingRecord {
  const hasSubscriptionFields =
    record.setupFee !== undefined ||
    record.monthlyFee !== undefined ||
    record.totalRevenue !== undefined;
  const legacySaleAmount = safeNumber(record.saleAmount);
  const setupFee = hasSubscriptionFields
    ? safeNumber(record.setupFee)
    : legacySaleAmount;
  const monthlyFee = safeNumber(record.monthlyFee);
  const extraServiceRevenue = safeNumber(record.extraServiceRevenue);
  const nfcCardQuantity = safeNumber(record.nfcCardQuantity);
  const nfcCardUnitCost = safeNumber(record.nfcCardUnitCost);
  const calculatedNfcTotal = nfcCardQuantity * nfcCardUnitCost;
  const nfcCardTotalCost =
    record.nfcCardTotalCost !== undefined
      ? safeNumber(record.nfcCardTotalCost)
      : calculatedNfcTotal;
  const printCost = safeNumber(record.printCost);
  const designCost = safeNumber(record.designCost);
  const deliveryCost = safeNumber(record.deliveryCost);
  const setupCost = safeNumber(record.setupCost);
  const otherCost = safeNumber(record.otherCost);
  const calculatedExpense =
    nfcCardTotalCost +
    printCost +
    designCost +
    deliveryCost +
    setupCost +
    otherCost;
  const totalExpense =
    calculatedExpense > 0 ? calculatedExpense : safeNumber(record.totalCost);
  const totalRevenue =
    hasSubscriptionFields || legacySaleAmount === 0
      ? setupFee + monthlyFee + extraServiceRevenue
      : legacySaleAmount;
  const partner1Share = totalRevenue * 0.7 - totalExpense;
  const partner2Share = totalRevenue * 0.2;
  const partner3Share = totalRevenue * 0.1;
  const totalDistributed = partner1Share + partner2Share + partner3Share;

  return {
    id: record.id,
    createdAt: record.createdAt,
    subscriptionStartDate:
      record.subscriptionStartDate ||
      record.saleDate ||
      record.createdAt.slice(0, 10),
    subscriberBusinessKey:
      record.subscriberBusinessKey ||
      getBusinessKey({
        businessName: record.businessName,
        location: record.location,
      }),
    businessName: record.businessName,
    category: record.category,
    location: record.location,
    packageName: record.packageName || "Eski Kayıt",
    setupFee,
    monthlyFee,
    nfcCardQuantity,
    nfcCardUnitCost,
    nfcCardTotalCost,
    extraServiceRevenue,
    extraServiceNote: record.extraServiceNote || "",
    printCost,
    designCost,
    deliveryCost,
    setupCost,
    otherCost,
    totalExpense,
    totalRevenue,
    distributableNet: totalRevenue - totalExpense,
    partner1Share,
    partner2Share,
    partner3Share,
    totalDistributed,
    note: record.note || "",
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
  const [formState, setFormState] =
    useState<SubscriptionFormState>(initialFormState);
  const [formError, setFormError] = useState("");

  const normalizedRecords = useMemo(
    () => records.map(normalizeAccountingRecord),
    [records],
  );

  const subscribedBusinessKeys = useMemo(() => {
    return new Set(
      normalizedRecords.map((record) => record.subscriberBusinessKey),
    );
  }, [normalizedRecords]);

  const availableSubscribers = useMemo(() => {
    return subscribers.filter(
      (subscriber) => !subscribedBusinessKeys.has(getBusinessKey(subscriber)),
    );
  }, [subscribedBusinessKeys, subscribers]);

  const selectedSubscriber = useMemo(() => {
    return availableSubscribers.find(
      (subscriber) =>
        getBusinessKey(subscriber) === formState.subscriberBusinessKey,
    );
  }, [availableSubscribers, formState.subscriberBusinessKey]);

  const calculatedSubscription = useMemo(
    () => calculateSubscriptionValues(formState),
    [formState],
  );

  const totals = useMemo<AccountingTotals>(() => {
    return normalizedRecords.reduce(
      (currentTotals, record) => ({
        totalRevenue: currentTotals.totalRevenue + record.totalRevenue,
        totalExpense: currentTotals.totalExpense + record.totalExpense,
        distributableNet:
          currentTotals.distributableNet + record.distributableNet,
        monthlyRecurringRevenue:
          currentTotals.monthlyRecurringRevenue + record.monthlyFee,
        totalPartner1Share:
          currentTotals.totalPartner1Share + record.partner1Share,
        totalPartner2Share:
          currentTotals.totalPartner2Share + record.partner2Share,
        totalPartner3Share:
          currentTotals.totalPartner3Share + record.partner3Share,
      }),
      {
        totalRevenue: 0,
        totalExpense: 0,
        distributableNet: 0,
        monthlyRecurringRevenue: 0,
        totalPartner1Share: 0,
        totalPartner2Share: 0,
        totalPartner3Share: 0,
      },
    );
  }, [normalizedRecords]);

  const sortedRecords = useMemo(() => {
    return [...normalizedRecords].sort(
      (firstRecord, secondRecord) =>
        new Date(secondRecord.subscriptionStartDate).getTime() -
        new Date(firstRecord.subscriptionStartDate).getTime(),
    );
  }, [normalizedRecords]);

  function saveRecords(updatedRecords: AccountingRecord[]) {
    setRecords(updatedRecords);
    window.localStorage.setItem(
      ACCOUNTING_RECORDS_STORAGE_KEY,
      JSON.stringify(updatedRecords),
    );
  }

  function updateFormField(field: keyof SubscriptionFormState, value: string) {
    if (field === "packageName") {
      const selectedPackage = PACKAGE_PRESETS.find(
        (packagePreset) => packagePreset.name === value,
      );

      if (selectedPackage) {
        setFormState((currentState) => ({
          ...currentState,
          packageName: selectedPackage.name,
          setupFee: String(selectedPackage.setupFee),
          monthlyFee: String(selectedPackage.monthlyFee),
          nfcCardQuantity: String(selectedPackage.defaultNfcCardQuantity),
        }));
        setFormError("");
        return;
      }
    }

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

    if (!formState.subscriptionStartDate) {
      setFormError("Lütfen abonelik başlangıç tarihini seçin.");
      return;
    }

    const newRecord: AccountingRecord = {
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      subscriptionStartDate: formState.subscriptionStartDate,
      subscriberBusinessKey: getBusinessKey(selectedSubscriber),
      businessName: selectedSubscriber.businessName,
      category: selectedSubscriber.category,
      location: selectedSubscriber.location,
      packageName: formState.packageName,
      setupFee: calculatedSubscription.setupFee,
      monthlyFee: calculatedSubscription.monthlyFee,
      nfcCardQuantity: calculatedSubscription.nfcCardQuantity,
      nfcCardUnitCost: calculatedSubscription.nfcCardUnitCost,
      nfcCardTotalCost: calculatedSubscription.nfcCardTotalCost,
      extraServiceRevenue: calculatedSubscription.extraServiceRevenue,
      extraServiceNote: formState.extraServiceNote.trim(),
      printCost: calculatedSubscription.printCost,
      designCost: calculatedSubscription.designCost,
      deliveryCost: calculatedSubscription.deliveryCost,
      setupCost: calculatedSubscription.setupCost,
      otherCost: calculatedSubscription.otherCost,
      totalExpense: calculatedSubscription.totalExpense,
      totalRevenue: calculatedSubscription.totalRevenue,
      partner1Share: calculatedSubscription.partner1Share,
      partner2Share: calculatedSubscription.partner2Share,
      partner3Share: calculatedSubscription.partner3Share,
      totalDistributed: calculatedSubscription.totalDistributed,
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
      "Abonelik Başlangıcı",
      "Paket",
      "Kurulum Ücreti",
      "Aylık Ücret",
      "Ek Hizmet Geliri",
      "NFC Kart Adedi",
      "NFC Birim Maliyeti",
      "NFC Toplam Maliyet",
      "Baskı Maliyeti",
      "Tasarım Maliyeti",
      "Teslimat/Yol Maliyeti",
      "Kurulum Maliyeti",
      "Diğer Gider",
      "Toplam Gelir",
      "Toplam Gider",
      "Dağıtılabilir Net",
      "1. Kişi Payı",
      "2. Kişi Payı",
      "3. Kişi Payı",
      "Not",
    ];
    const rows = sortedRecords.map((record) => [
      record.businessName,
      record.location,
      record.subscriptionStartDate,
      record.packageName,
      record.setupFee,
      record.monthlyFee,
      record.extraServiceRevenue,
      record.nfcCardQuantity,
      record.nfcCardUnitCost,
      record.nfcCardTotalCost,
      record.printCost,
      record.designCost,
      record.deliveryCost,
      record.setupCost,
      record.otherCost,
      record.totalRevenue,
      record.totalExpense,
      record.distributableNet,
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
              Yorum Kart abonelik paketlerini, aylık gelirleri, giderleri ve
              ortak paylarını takip edin.
            </p>
          </div>
          <button type="button" onClick={handleOpenModal} className="btn-primary w-fit">
            Abonelik Kaydı Ekle
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Toplam Gelir"
            value={formatCurrency(totals.totalRevenue)}
            color="#FBBF24"
          />
          <SummaryCard
            label="Toplam Gider"
            value={formatCurrency(totals.totalExpense)}
            color="#F472B6"
          />
          <SummaryCard
            label="Dağıtılabilir Net"
            value={formatCurrency(totals.distributableNet)}
            color="#34D399"
          />
          <SummaryCard
            label="Aylık Tekrarlayan Gelir"
            value={formatCurrency(totals.monthlyRecurringRevenue)}
            color="#8B5CF6"
          />
        </section>

        <section className="card-pop overflow-hidden">
          <div className="flex flex-col gap-3 border-b-2 border-[#1E293B] bg-[#FBBF24] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-black text-[#1E293B]">
                Abonelik Kayıtları
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
                Henüz abonelik kaydı yok. İlk kaydı eklemek için “Abonelik
                Kaydı Ekle” butonunu kullan.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4">
              {sortedRecords.map((record) => (
                <article
                  key={record.id}
                  className="rounded-[24px] border-2 border-[#1E293B] bg-white p-4 shadow-[4px_4px_0_#1E293B]"
                >
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_2fr_auto] xl:items-start">
                    <div>
                      <h3 className="font-heading text-xl font-black text-[#1E293B]">
                        {record.businessName}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {record.category} • {record.location}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border-2 border-[#1E293B] bg-[#EDE9FE] px-3 py-1 text-xs font-black text-[#1E293B]">
                          {record.packageName}
                        </span>
                        <span className="rounded-full border-2 border-[#1E293B] bg-[#FFFDF5] px-3 py-1 text-xs font-black text-[#1E293B]">
                          {formatDate(record.subscriptionStartDate)}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <MetricBadge
                        label="Kurulum"
                        value={formatCurrency(record.setupFee)}
                      />
                      <MetricBadge
                        label="Aylık"
                        value={formatCurrency(record.monthlyFee)}
                      />
                      <MetricBadge
                        label="Toplam Gelir"
                        value={formatCurrency(record.totalRevenue)}
                      />
                      <MetricBadge
                        label="Toplam Gider"
                        value={formatCurrency(record.totalExpense)}
                      />
                      <MetricBadge
                        label="1. Kişi"
                        value={formatCurrency(record.partner1Share)}
                      />
                      <MetricBadge
                        label="2. Kişi"
                        value={formatCurrency(record.partner2Share)}
                      />
                      <MetricBadge
                        label="3. Kişi"
                        value={formatCurrency(record.partner3Share)}
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
              Giderler 1. kişinin %70 payından düşülerek hesaplanır.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ShareCard
              label="1. Kişi Toplam Payı (%70 - giderler)"
              value={formatCurrency(totals.totalPartner1Share)}
              color="#8B5CF6"
            />
            <ShareCard
              label="2. Kişi Toplam Payı (%20)"
              value={formatCurrency(totals.totalPartner2Share)}
              color="#34D399"
            />
            <ShareCard
              label="3. Kişi Toplam Payı (%10)"
              value={formatCurrency(totals.totalPartner3Share)}
              color="#F472B6"
            />
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <SubscriptionRecordModal
          subscribers={availableSubscribers}
          totalSubscriberCount={subscribers.length}
          formState={formState}
          selectedSubscriber={selectedSubscriber}
          calculatedSubscription={calculatedSubscription}
          formError={formError}
          onUpdateField={updateFormField}
          onSave={handleSaveRecord}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </AppShell>
  );
}

function SubscriptionRecordModal({
  subscribers,
  totalSubscriberCount,
  formState,
  selectedSubscriber,
  calculatedSubscription,
  formError,
  onUpdateField,
  onSave,
  onClose,
}: {
  subscribers: ReviewCardSubscriber[];
  totalSubscriberCount: number;
  formState: SubscriptionFormState;
  selectedSubscriber: ReviewCardSubscriber | undefined;
  calculatedSubscription: ReturnType<typeof calculateSubscriptionValues>;
  formError: string;
  onUpdateField: (field: keyof SubscriptionFormState, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const emptySubscriberMessage =
    totalSubscriberCount === 0
      ? "Önce Aboneler sayfasından bir işletmeyi Yorum Kart abonesi olarak ekleyin."
      : "Tüm aboneler için abonelik kaydı oluşturulmuş.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
      <section className="hard-shadow-lg max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border-2 border-[#1E293B] bg-white">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4">
          <div>
            <p className="page-eyebrow bg-[#34D399]">Muhasebe</p>
            <h2 className="mt-3 font-heading text-3xl font-black text-[#1E293B]">
              Yeni Abonelik Kaydı
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4">
            Kapat
          </button>
        </div>

        <div className="grid gap-5 p-5">
          {subscribers.length === 0 ? (
            <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
              {emptySubscriberMessage}
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
                <div className="grid gap-5">
                  <div className="rounded-2xl border-2 border-[#1E293B] bg-[#EDE9FE] p-4">
                    <p className="font-heading text-lg font-black text-[#1E293B]">
                      {selectedSubscriber.businessName}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      {selectedSubscriber.category} • {selectedSubscriber.location}
                    </p>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField label="Paket">
                          <select
                            value={formState.packageName}
                            onChange={(event) =>
                              onUpdateField("packageName", event.target.value)
                            }
                            className="input-pop w-full"
                          >
                            {PACKAGE_PRESETS.map((packagePreset) => (
                              <option
                                key={packagePreset.name}
                                value={packagePreset.name}
                              >
                                {packagePreset.name}
                              </option>
                            ))}
                          </select>
                        </FormField>
                        <FormField label="Abonelik başlangıcı">
                          <input
                            type="date"
                            value={formState.subscriptionStartDate}
                            onChange={(event) =>
                              onUpdateField(
                                "subscriptionStartDate",
                                event.target.value,
                              )
                            }
                            className="input-pop w-full"
                          />
                        </FormField>
                        <FormField label="Kurulum ücreti">
                          <NumberInput
                            value={formState.setupFee}
                            onChange={(value) => onUpdateField("setupFee", value)}
                            placeholder="Örn: 2500"
                          />
                        </FormField>
                        <FormField label="Aylık abonelik ücreti">
                          <NumberInput
                            value={formState.monthlyFee}
                            onChange={(value) => onUpdateField("monthlyFee", value)}
                            placeholder="Örn: 1000"
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
                        <FormField label="Ek hizmet geliri">
                          <NumberInput
                            value={formState.extraServiceRevenue}
                            onChange={(value) =>
                              onUpdateField("extraServiceRevenue", value)
                            }
                          />
                        </FormField>
                        <FormField label="Ek hizmet notu">
                          <input
                            value={formState.extraServiceNote}
                            onChange={(event) =>
                              onUpdateField("extraServiceNote", event.target.value)
                            }
                            placeholder="Örn: menü tasarımı"
                            className="input-pop w-full"
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
                            onChange={(value) =>
                              onUpdateField("deliveryCost", value)
                            }
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
                          onChange={(event) =>
                            onUpdateField("note", event.target.value)
                          }
                          placeholder="Abonelik notu ekle"
                          className="input-pop min-h-24 w-full"
                        />
                      </FormField>
                    </div>

                    <div className="rounded-[24px] border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
                      <h3 className="font-heading text-xl font-black text-[#1E293B]">
                        Hesap Özeti
                      </h3>
                      <p className="mt-2 rounded-2xl border-2 border-[#1E293B] bg-[#FBBF24] p-3 text-xs font-black text-[#1E293B]">
                        Giderler 1. kişinin %70 payından düşülür.
                      </p>
                      <div className="mt-4 grid gap-3">
                        <MetricBadge label="Paket" value={formState.packageName} />
                        <MetricBadge
                          label="Kurulum ücreti"
                          value={formatCurrency(calculatedSubscription.setupFee)}
                        />
                        <MetricBadge
                          label="Aylık abonelik"
                          value={formatCurrency(calculatedSubscription.monthlyFee)}
                        />
                        <MetricBadge
                          label="Ek hizmet geliri"
                          value={formatCurrency(
                            calculatedSubscription.extraServiceRevenue,
                          )}
                        />
                        <MetricBadge
                          label="Toplam gelir"
                          value={formatCurrency(calculatedSubscription.totalRevenue)}
                        />
                        <MetricBadge
                          label="NFC toplam maliyet"
                          value={formatCurrency(
                            calculatedSubscription.nfcCardTotalCost,
                          )}
                        />
                        <MetricBadge
                          label="Toplam gider"
                          value={formatCurrency(calculatedSubscription.totalExpense)}
                        />
                        <MetricBadge
                          label="Dağıtılabilir net"
                          value={formatCurrency(
                            calculatedSubscription.distributableNet,
                          )}
                        />
                        <MetricBadge
                          label="1. kişi payı (%70 - giderler)"
                          value={formatCurrency(calculatedSubscription.partner1Share)}
                        />
                        <MetricBadge
                          label="2. kişi payı (%20)"
                          value={formatCurrency(calculatedSubscription.partner2Share)}
                        />
                        <MetricBadge
                          label="3. kişi payı (%10)"
                          value={formatCurrency(calculatedSubscription.partner3Share)}
                        />
                      </div>
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
            Aboneliği Kaydet
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
