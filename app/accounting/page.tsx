"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  ACCOUNTING_RECORDS_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
} from "@/lib/storage-keys";
import type {
  AccountingRecord,
  MonthlyLedgerPayment,
  MonthlyPayment,
  ReviewCardSubscriber,
} from "@/types/business";

type PackageName = "Başlangıç" | "Pro" | "Premium" | "Kurumsal";

type PackagePreset = {
  name: PackageName;
  setupFee: number;
  monthlyFee: number;
  defaultNfcCardQuantity: number;
};

type SubscriptionStatus = "active" | "completed" | "cancelled";

type SubscriptionFormState = {
  subscriberBusinessKey: string;
  packageName: PackageName;
  setupFee: string;
  monthlyFee: string;
  subscriptionMonths: string;
  nfcCardQuantity: string;
  nfcCardUnitCost: string;
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
  subscriptionMonths: number;
  nfcCardQuantity: number;
  nfcCardUnitCost: number;
  nfcCardTotalCost: number;
  printCost: number;
  designCost: number;
  deliveryCost: number;
  setupCost: number;
  otherCost: number;
  extraServiceRevenue: number;
  totalExpense: number;
  paymentsByMonth: Record<string, MonthlyLedgerPayment>;
  status: SubscriptionStatus;
  paidMonthCount: number;
  note: string;
};

type CurrentMonthDue = {
  record: NormalizedAccountingRecord;
  payment: MonthlyLedgerPayment;
  isActive: boolean;
};

type AccountingTotals = {
  expectedThisMonth: number;
  receivedThisMonth: number;
  remainingThisMonth: number;
  expenseThisMonth: number;
  partner1ThisMonth: number;
  partner2ThisMonth: number;
  partner3ThisMonth: number;
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
  subscriptionMonths: "12",
  nfcCardQuantity: String(defaultPackage.defaultNfcCardQuantity),
  nfcCardUnitCost: "",
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

function getCurrentMonthKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);

  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
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
  const parsedValue = Number(value.replace(",", ".").trim());

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseQuantity(value: string): number {
  const parsedValue = Number(value.replace(",", ".").trim());

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseMonthCount(value: string): number {
  return Math.max(1, Math.floor(parseQuantity(value) || 1));
}

function safeNumber(value: number | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function getMonthIndex(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);

  return year * 12 + month;
}

function getStartMonthKey(dateValue: string): string {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return getCurrentMonthKey();
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isSameMonth(dateValue: string, monthKey: string): boolean {
  return getStartMonthKey(dateValue) === monthKey;
}

function isSubscriptionActive(
  record: NormalizedAccountingRecord,
  monthKey: string,
): boolean {
  if (record.status === "cancelled" || record.status === "completed") {
    return false;
  }

  const startMonthIndex = getMonthIndex(getStartMonthKey(record.subscriptionStartDate));
  const currentMonthIndex = getMonthIndex(monthKey);
  const elapsedMonthCount = currentMonthIndex - startMonthIndex;

  return elapsedMonthCount >= 0 && elapsedMonthCount < record.subscriptionMonths;
}

function createEmptyPayment(amount: number): MonthlyLedgerPayment {
  return {
    amount,
    isPaid: false,
    paidAt: null,
  };
}

function paymentsArrayToLedger(
  monthlyPayments: MonthlyPayment[] | undefined,
  startDate: string,
): Record<string, MonthlyLedgerPayment> {
  if (!monthlyPayments?.length) {
    return {};
  }

  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return {};
  }

  return monthlyPayments.reduce<Record<string, MonthlyLedgerPayment>>(
    (ledger, payment) => {
      const paymentDate = new Date(
        start.getFullYear(),
        start.getMonth() + payment.monthIndex - 1,
        1,
      );
      const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;
      ledger[monthKey] = {
        amount: safeNumber(payment.amount),
        isPaid: Boolean(payment.isPaid),
        paidAt: payment.paidAt || null,
      };

      return ledger;
    },
    {},
  );
}

function calculateSubscriptionValues(formState: SubscriptionFormState) {
  const setupFee = parseMoney(formState.setupFee);
  const monthlyFee = parseMoney(formState.monthlyFee);
  const subscriptionMonths = parseMonthCount(formState.subscriptionMonths);
  const nfcCardQuantity = parseQuantity(formState.nfcCardQuantity);
  const nfcCardUnitCost = parseMoney(formState.nfcCardUnitCost);
  const nfcCardTotalCost = nfcCardQuantity * nfcCardUnitCost;
  const printCost = parseMoney(formState.printCost);
  const designCost = parseMoney(formState.designCost);
  const deliveryCost = parseMoney(formState.deliveryCost);
  const setupCost = parseMoney(formState.setupCost);
  const otherCost = parseMoney(formState.otherCost);
  const totalExpense =
    nfcCardTotalCost +
    printCost +
    designCost +
    deliveryCost +
    setupCost +
    otherCost;
  const firstMonthRevenue = setupFee + monthlyFee;
  const partner1Share = firstMonthRevenue * 0.7 - totalExpense;
  const partner2Share = firstMonthRevenue * 0.2;
  const partner3Share = firstMonthRevenue * 0.1;

  return {
    setupFee,
    monthlyFee,
    subscriptionMonths,
    nfcCardQuantity,
    nfcCardUnitCost,
    nfcCardTotalCost,
    printCost,
    designCost,
    deliveryCost,
    setupCost,
    otherCost,
    totalExpense,
    firstMonthRevenue,
    distributableThisMonth: firstMonthRevenue - totalExpense,
    partner1Share,
    partner2Share,
    partner3Share,
  };
}

function normalizeAccountingRecord(
  record: AccountingRecord,
): NormalizedAccountingRecord {
  const legacySaleAmount = safeNumber(record.saleAmount);
  const setupFee =
    record.setupFee !== undefined ? safeNumber(record.setupFee) : legacySaleAmount;
  const monthlyFee =
    record.monthlyFee !== undefined ? safeNumber(record.monthlyFee) : legacySaleAmount;
  const subscriptionMonths = Math.max(1, Math.floor(record.subscriptionMonths || 1));
  const nfcCardQuantity = safeNumber(record.nfcCardQuantity);
  const nfcCardUnitCost = safeNumber(record.nfcCardUnitCost);
  const nfcCardTotalCost =
    record.nfcCardTotalCost !== undefined
      ? safeNumber(record.nfcCardTotalCost)
      : nfcCardQuantity * nfcCardUnitCost;
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
  const subscriptionStartDate =
    record.subscriptionStartDate ||
    record.saleDate ||
    record.createdAt.slice(0, 10);
  const paymentsByMonth =
    record.paymentsByMonth ||
    paymentsArrayToLedger(record.monthlyPayments, subscriptionStartDate);
  const paidMonthCount = Object.values(paymentsByMonth).filter(
    (payment) => payment.isPaid,
  ).length;

  return {
    id: record.id,
    createdAt: record.createdAt,
    subscriptionStartDate,
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
    subscriptionMonths,
    nfcCardQuantity,
    nfcCardUnitCost,
    nfcCardTotalCost,
    printCost,
    designCost,
    deliveryCost,
    setupCost,
    otherCost,
    extraServiceRevenue: safeNumber(record.extraServiceRevenue),
    totalExpense,
    paymentsByMonth,
    status: record.status || "active",
    paidMonthCount,
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
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = getMonthLabel(currentMonthKey);

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

  const sortedRecords = useMemo(() => {
    return [...normalizedRecords].sort(
      (firstRecord, secondRecord) =>
        new Date(secondRecord.subscriptionStartDate).getTime() -
        new Date(firstRecord.subscriptionStartDate).getTime(),
    );
  }, [normalizedRecords]);

  const currentMonthDues = useMemo<CurrentMonthDue[]>(() => {
    return sortedRecords
      .map((record) => ({
        record,
        payment:
          record.paymentsByMonth[currentMonthKey] ||
          createEmptyPayment(record.monthlyFee),
        isActive: isSubscriptionActive(record, currentMonthKey),
      }))
      .filter((item) => item.isActive);
  }, [currentMonthKey, sortedRecords]);

  const totals = useMemo<AccountingTotals>(() => {
    const expectedThisMonth = currentMonthDues.reduce(
      (total, item) => total + item.record.monthlyFee,
      0,
    );
    const receivedMonthlyThisMonth = currentMonthDues
      .filter((item) => item.payment.isPaid)
      .reduce((total, item) => total + item.payment.amount, 0);
    const setupAndExtraThisMonth = sortedRecords
      .filter((record) => isSameMonth(record.subscriptionStartDate, currentMonthKey))
      .reduce(
        (total, record) =>
          total + record.setupFee + record.extraServiceRevenue,
        0,
      );
    const expenseThisMonth = sortedRecords
      .filter((record) => isSameMonth(record.subscriptionStartDate, currentMonthKey))
      .reduce((total, record) => total + record.totalExpense, 0);
    const receivedThisMonth =
      receivedMonthlyThisMonth + setupAndExtraThisMonth;
    const remainingThisMonth = currentMonthDues
      .filter((item) => !item.payment.isPaid)
      .reduce((total, item) => total + item.record.monthlyFee, 0);

    return {
      expectedThisMonth,
      receivedThisMonth,
      remainingThisMonth,
      expenseThisMonth,
      partner1ThisMonth: receivedThisMonth * 0.7 - expenseThisMonth,
      partner2ThisMonth: receivedThisMonth * 0.2,
      partner3ThisMonth: receivedThisMonth * 0.1,
    };
  }, [currentMonthDues, currentMonthKey, sortedRecords]);

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
      subscriptionMonths: calculatedSubscription.subscriptionMonths,
      nfcCardQuantity: calculatedSubscription.nfcCardQuantity,
      nfcCardUnitCost: calculatedSubscription.nfcCardUnitCost,
      nfcCardTotalCost: calculatedSubscription.nfcCardTotalCost,
      printCost: calculatedSubscription.printCost,
      designCost: calculatedSubscription.designCost,
      deliveryCost: calculatedSubscription.deliveryCost,
      setupCost: calculatedSubscription.setupCost,
      otherCost: calculatedSubscription.otherCost,
      totalExpense: calculatedSubscription.totalExpense,
      paymentsByMonth: {},
      status: "active",
      note: formState.note.trim(),
    };

    saveRecords([newRecord, ...records]);
    setIsModalOpen(false);
    setFormState(initialFormState);
  }

  function handleDeleteRecord(recordId: string) {
    saveRecords(records.filter((record) => record.id !== recordId));
  }

  function handleToggleCurrentMonthPayment(recordId: string) {
    const updatedRecords = records.map((record) => {
      if (record.id !== recordId) {
        return record;
      }

      const normalizedRecord = normalizeAccountingRecord(record);
      const currentPayment = normalizedRecord.paymentsByMonth[currentMonthKey];
      const nextIsPaid = !currentPayment?.isPaid;

      return {
        ...record,
        paymentsByMonth: {
          ...normalizedRecord.paymentsByMonth,
          [currentMonthKey]: {
            amount: normalizedRecord.monthlyFee,
            isPaid: nextIsPaid,
            paidAt: nextIsPaid ? new Date().toISOString() : null,
          },
        },
      };
    });

    saveRecords(updatedRecords);
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
      "Paket",
      "Başlangıç Tarihi",
      "Durum",
      "Aylık Ücret",
      "Anlaşma Süresi",
      "Kurulum Ücreti",
      "NFC Kart Adedi",
      "NFC Toplam Maliyet",
      "Toplam Gider",
      "Bu Ay Ödendi mi",
      "Bu Ay Tahsilat",
      "Not",
    ];
    const rows = sortedRecords.map((record) => {
      const currentPayment = record.paymentsByMonth[currentMonthKey];

      return [
        record.businessName,
        record.location,
        record.packageName,
        record.subscriptionStartDate,
        record.status,
        record.monthlyFee,
        record.subscriptionMonths,
        record.setupFee,
        record.nfcCardQuantity,
        record.nfcCardTotalCost,
        record.totalExpense,
        currentPayment?.isPaid ? "Evet" : "Hayır",
        currentPayment?.isPaid ? currentPayment.amount : 0,
        record.note,
      ];
    });
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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 py-8 sm:px-6 lg:py-10">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="page-eyebrow">Yorum Kart</p>
            <h1 className="page-title mt-5">Muhasebe</h1>
            <p className="muted-text mt-4 max-w-3xl text-base font-medium leading-7">
              Bu ay tahsil edilecek abonelikleri, alınan ödemeleri ve ortak
              paylarını sade bir panelde takip edin.
            </p>
          </div>
          <button type="button" onClick={handleOpenModal} className="btn-primary w-fit">
            Abonelik Kaydı Ekle
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Bu Ay Beklenen"
            value={formatCurrency(totals.expectedThisMonth)}
            color="#FBBF24"
          />
          <SummaryCard
            label="Bu Ay Alınan"
            value={formatCurrency(totals.receivedThisMonth)}
            color="#34D399"
          />
          <SummaryCard
            label="Bu Ay Kalan"
            value={formatCurrency(totals.remainingThisMonth)}
            color="#8B5CF6"
          />
          <SummaryCard
            label="Bu Ay Gider"
            value={formatCurrency(totals.expenseThisMonth)}
            color="#F472B6"
          />
        </section>

        <section className="card-pop overflow-hidden">
          <div className="border-b-2 border-[#1E293B] bg-[#FBBF24] px-5 py-4">
            <h2 className="font-heading text-2xl font-black text-[#1E293B]">
              Bu Ay Tahsil Edilecekler
            </h2>
            <p className="mt-1 text-sm font-bold text-[#1E293B]">
              {currentMonthLabel} için aktif aboneliklerin aylık ödemeleri.
            </p>
          </div>

          {currentMonthDues.length === 0 ? (
            <div className="p-5">
              <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
                Bu ay tahsil edilecek aktif abonelik yok.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {currentMonthDues.map(({ record, payment }) => (
                <article
                  key={record.id}
                  className="rounded-[20px] border-2 border-[#1E293B] bg-white p-4 shadow-[3px_3px_0_#1E293B]"
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <h3 className="font-heading text-lg font-black text-[#1E293B]">
                        {record.businessName}
                      </h3>
                      <p className="mt-1 text-xs font-black text-slate-500">
                        {record.packageName} • {currentMonthLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-heading text-2xl font-black text-[#1E293B]">
                          {formatCurrency(record.monthlyFee)}
                        </p>
                        <p className="text-xs font-black text-slate-500">
                          {payment.isPaid ? "Ödeme alındı" : "Bekliyor"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCurrentMonthPayment(record.id)}
                        className={payment.isPaid ? "btn-secondary min-h-11 px-4 text-xs" : "btn-primary min-h-11 px-4 text-xs"}
                      >
                        {payment.isPaid ? "Geri Al" : "Ödeme Alındı"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card-pop overflow-hidden">
          <div className="flex flex-col gap-3 border-b-2 border-[#1E293B] bg-[#EDE9FE] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-black text-[#1E293B]">
                Abonelik Kayıtları
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-600">
                Kompakt abonelik özeti • {records.length} kayıt
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
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {sortedRecords.map((record) => (
                <article
                  key={record.id}
                  className="rounded-[20px] border-2 border-[#1E293B] bg-white p-4 shadow-[3px_3px_0_#1E293B]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-black text-[#1E293B]">
                        {record.businessName}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-600">
                        {record.packageName} • {formatCurrency(record.monthlyFee)} / ay
                      </p>
                      <p className="mt-1 text-xs font-black text-slate-500">
                        Başlangıç: {formatDate(record.subscriptionStartDate)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border-2 border-[#1E293B] bg-[#FFFDF5] px-3 py-1 text-xs font-black text-[#1E293B]">
                          {record.subscriptionMonths} ay
                        </span>
                        <span className="rounded-full border-2 border-[#1E293B] bg-[#EDE9FE] px-3 py-1 text-xs font-black text-[#1E293B]">
                          {record.status}
                        </span>
                        <span className="rounded-full border-2 border-[#1E293B] bg-[#D1FAE5] px-3 py-1 text-xs font-black text-[#1E293B]">
                          {record.paidMonthCount} ay ödendi
                        </span>
                      </div>
                      {record.note ? (
                        <p className="mt-3 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-3 text-xs font-bold text-[#1E293B]">
                          {record.note}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(record.id)}
                      className="btn-danger min-h-10 px-3 text-xs"
                    >
                      Sil
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card-pop p-5">
          <div>
            <h2 className="font-heading text-2xl font-black text-[#1E293B]">
              Bu Ay Ortak Payı
            </h2>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Giderler 1. kişinin payından düşülür.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ShareCard
              label="1. Kişi (%70 - giderler)"
              value={formatCurrency(totals.partner1ThisMonth)}
              color="#8B5CF6"
            />
            <ShareCard
              label="2. Kişi (%20)"
              value={formatCurrency(totals.partner2ThisMonth)}
              color="#34D399"
            />
            <ShareCard
              label="3. Kişi (%10)"
              value={formatCurrency(totals.partner3ThisMonth)}
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
                        <FormField label="Anlaşma Süresi (Ay)">
                          <NumberInput
                            value={formState.subscriptionMonths}
                            onChange={(value) =>
                              onUpdateField("subscriptionMonths", value)
                            }
                            min="1"
                            step="1"
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
                        <MetricBadge
                          label="Kurulum"
                          value={formatCurrency(calculatedSubscription.setupFee)}
                        />
                        <MetricBadge
                          label="Aylık ücret"
                          value={formatCurrency(calculatedSubscription.monthlyFee)}
                        />
                        <MetricBadge
                          label="Süre"
                          value={`${calculatedSubscription.subscriptionMonths} ay`}
                        />
                        <MetricBadge
                          label="İlk ay alınacak toplam"
                          value={formatCurrency(
                            calculatedSubscription.firstMonthRevenue,
                          )}
                        />
                        <MetricBadge
                          label="Toplam gider"
                          value={formatCurrency(calculatedSubscription.totalExpense)}
                        />
                        <MetricBadge
                          label="Bu ay dağıtılabilir"
                          value={formatCurrency(
                            calculatedSubscription.distributableThisMonth,
                          )}
                        />
                        <MetricBadge
                          label="1. kişi"
                          value={formatCurrency(calculatedSubscription.partner1Share)}
                        />
                        <MetricBadge
                          label="2. kişi"
                          value={formatCurrency(calculatedSubscription.partner2Share)}
                        />
                        <MetricBadge
                          label="3. kişi"
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
  min = "0",
  step = "0.01",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="input-pop w-full"
    />
  );
}
