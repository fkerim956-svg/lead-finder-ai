"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import {
  ACCOUNTING_RECORDS_STORAGE_KEY,
  NFC_STOCK_STORAGE_KEY,
  REVIEW_CARD_SUBSCRIBERS_STORAGE_KEY,
} from "@/lib/storage-keys";
import type {
  AccountingRecord,
  AccountingRecordType,
  MonthlyLedgerPayment,
  MonthlyPayment,
  NfcStockData,
  NfcStockMovement,
  NfcStockMovementType,
  ReviewCardSubscriber,
} from "@/types/business";

type PackageName = "Başlangıç" | "Pro" | "Premium" | "Kurumsal" | "Özel";

type PackagePreset = {
  name: PackageName;
  setupFee: number;
  monthlyFee: number;
  defaultNfcCardQuantity: number;
};

type SubscriptionStatus = "active" | "completed" | "cancelled";

type CostFormState = {
  nfcCardQuantity: string;
  nfcCardUnitCost: string;
  printCost: string;
  designCost: string;
  deliveryCost: string;
  setupCost: string;
  otherCost: string;
  note: string;
};

type SubscriptionFormState = CostFormState & {
  subscriberBusinessKey: string;
  packageName: PackageName;
  setupFee: string;
  monthlyFee: string;
  subscriptionMonths: string;
  subscriptionStartDate: string;
  extraServiceRevenue: string;
  status: SubscriptionStatus;
};

type OneTimeFormState = CostFormState & {
  businessName: string;
  location: string;
  oneTimeSaleAmount: string;
  oneTimeSaleDate: string;
};

type StockAddFormState = {
  quantity: string;
  unitCost: string;
  note: string;
};

type StockAdjustFormState = {
  newStock: string;
  note: string;
};

type NormalizedAccountingRecord = {
  id: string;
  createdAt: string;
  recordType: AccountingRecordType;
  subscriptionStartDate: string;
  oneTimeSaleDate: string;
  subscriberBusinessKey: string;
  businessName: string;
  category: string;
  location: string;
  packageName: string;
  setupFee: number;
  monthlyFee: number;
  subscriptionMonths: number;
  oneTimeSaleAmount: number;
  stockDeducted: boolean;
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
  grossProfit: number;
  profitMargin: number;
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
  oneTimeRevenueThisMonth: number;
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

const PACKAGE_OPTIONS: PackageName[] = [
  "Başlangıç",
  "Pro",
  "Premium",
  "Kurumsal",
  "Özel",
];

const defaultPackage = PACKAGE_PRESETS[0];

const initialSubscriptionFormState: SubscriptionFormState = {
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
  extraServiceRevenue: "",
  status: "active",
  note: "",
};

const initialOneTimeFormState: OneTimeFormState = {
  businessName: "",
  location: "",
  oneTimeSaleAmount: "",
  nfcCardQuantity: "1",
  nfcCardUnitCost: "",
  printCost: "",
  designCost: "",
  deliveryCost: "",
  setupCost: "",
  otherCost: "",
  oneTimeSaleDate: new Date().toISOString().slice(0, 10),
  note: "",
};

const defaultNfcStock: NfcStockData = {
  currentStock: 0,
  criticalStockLevel: 20,
  totalAdded: 0,
  totalUsed: 0,
  lastUnitCost: 0,
  movements: [],
};

const initialStockAddFormState: StockAddFormState = {
  quantity: "",
  unitCost: "",
  note: "",
};

const initialStockAdjustFormState: StockAdjustFormState = {
  newStock: "",
  note: "",
};

function getBusinessKey(
  business: Pick<ReviewCardSubscriber, "businessName" | "location">,
) {
  return `${business.businessName.trim().toLocaleLowerCase("tr-TR")}::${business.location.trim().toLocaleLowerCase("tr-TR")}`;
}

function getManualBusinessKey(businessName: string, location: string) {
  return `manual::${businessName.trim().toLocaleLowerCase("tr-TR")}::${location.trim().toLocaleLowerCase("tr-TR")}`;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 2, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function getInitialNfcStock(): NfcStockData {
  if (typeof window === "undefined") {
    return defaultNfcStock;
  }

  const savedStock = window.localStorage.getItem(NFC_STOCK_STORAGE_KEY);

  if (!savedStock) {
    return defaultNfcStock;
  }

  try {
    const parsedStock = JSON.parse(savedStock) as Partial<NfcStockData>;

    return {
      currentStock: safeNumber(parsedStock.currentStock),
      criticalStockLevel:
        parsedStock.criticalStockLevel !== undefined
          ? safeNumber(parsedStock.criticalStockLevel)
          : defaultNfcStock.criticalStockLevel,
      totalAdded: safeNumber(parsedStock.totalAdded),
      totalUsed: safeNumber(parsedStock.totalUsed),
      lastUnitCost: safeNumber(parsedStock.lastUnitCost),
      movements: Array.isArray(parsedStock.movements)
        ? parsedStock.movements
        : [],
    };
  } catch {
    window.localStorage.removeItem(NFC_STOCK_STORAGE_KEY);
    return defaultNfcStock;
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
  if (
    record.recordType !== "subscription" ||
    record.status === "cancelled" ||
    record.status === "completed"
  ) {
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

function calculateCosts(formState: CostFormState) {
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

  return {
    nfcCardQuantity,
    nfcCardUnitCost,
    nfcCardTotalCost,
    printCost,
    designCost,
    deliveryCost,
    setupCost,
    otherCost,
    totalExpense,
  };
}

function calculateSubscriptionValues(formState: SubscriptionFormState) {
  const setupFee = parseMoney(formState.setupFee);
  const monthlyFee = parseMoney(formState.monthlyFee);
  const extraServiceRevenue = parseMoney(formState.extraServiceRevenue);
  const subscriptionMonths = parseMonthCount(formState.subscriptionMonths);
  const costs = calculateCosts(formState);
  const firstMonthRevenue = setupFee + monthlyFee + extraServiceRevenue;

  return {
    setupFee,
    monthlyFee,
    extraServiceRevenue,
    subscriptionMonths,
    ...costs,
    firstMonthRevenue,
    distributableThisMonth: firstMonthRevenue - costs.totalExpense,
    partner1Share: firstMonthRevenue * 0.7 - costs.totalExpense,
    partner2Share: firstMonthRevenue * 0.2,
    partner3Share: firstMonthRevenue * 0.1,
  };
}

function calculateOneTimeValues(formState: OneTimeFormState) {
  const oneTimeSaleAmount = parseMoney(formState.oneTimeSaleAmount);
  const costs = calculateCosts(formState);
  const grossProfit = oneTimeSaleAmount - costs.totalExpense;
  const profitMargin =
    oneTimeSaleAmount > 0 ? (grossProfit / oneTimeSaleAmount) * 100 : 0;

  return {
    oneTimeSaleAmount,
    ...costs,
    grossProfit,
    profitMargin,
  };
}

function normalizeAccountingRecord(
  record: AccountingRecord,
): NormalizedAccountingRecord {
  const recordType: AccountingRecordType = record.recordType || "subscription";
  const legacySaleAmount = safeNumber(record.saleAmount);
  const oneTimeSaleAmount =
    recordType === "one-time"
      ? safeNumber(record.oneTimeSaleAmount ?? record.saleAmount)
      : 0;
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
    calculatedExpense > 0
      ? calculatedExpense
      : safeNumber(record.totalExpense ?? record.totalCost);
  const subscriptionStartDate =
    record.subscriptionStartDate ||
    record.saleDate ||
    record.createdAt.slice(0, 10);
  const oneTimeSaleDate =
    record.oneTimeSaleDate ||
    record.saleDate ||
    record.createdAt.slice(0, 10);
  const paymentsByMonth =
    record.paymentsByMonth ||
    paymentsArrayToLedger(record.monthlyPayments, subscriptionStartDate);
  const paidMonthCount = Object.values(paymentsByMonth).filter(
    (payment) => payment.isPaid,
  ).length;
  const grossProfit =
    record.grossProfit !== undefined
      ? safeNumber(record.grossProfit)
      : oneTimeSaleAmount - totalExpense;
  const profitMargin =
    record.profitMargin !== undefined
      ? safeNumber(record.profitMargin)
      : oneTimeSaleAmount > 0
        ? (grossProfit / oneTimeSaleAmount) * 100
        : 0;

  return {
    id: record.id,
    createdAt: record.createdAt,
    recordType,
    subscriptionStartDate,
    oneTimeSaleDate,
    subscriberBusinessKey:
      record.subscriberBusinessKey ||
      getManualBusinessKey(record.businessName, record.location),
    businessName: record.businessName,
    category: record.category || "Yorum Kart",
    location: record.location,
    packageName: record.packageName || "Eski Kayıt",
    setupFee: recordType === "subscription" ? setupFee : 0,
    monthlyFee: recordType === "subscription" ? monthlyFee : 0,
    subscriptionMonths,
    oneTimeSaleAmount,
    stockDeducted: Boolean(record.stockDeducted),
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
    grossProfit,
    profitMargin,
    paymentsByMonth,
    status: record.status || "active",
    paidMonthCount,
    note: record.note || "",
  };
}

function createSubscriptionEditFormState(
  record: NormalizedAccountingRecord,
): SubscriptionFormState {
  return {
    subscriberBusinessKey: record.subscriberBusinessKey,
    packageName: PACKAGE_OPTIONS.includes(record.packageName as PackageName)
      ? (record.packageName as PackageName)
      : "Özel",
    setupFee: String(record.setupFee),
    monthlyFee: String(record.monthlyFee),
    subscriptionMonths: String(record.subscriptionMonths),
    nfcCardQuantity: String(record.nfcCardQuantity),
    nfcCardUnitCost: String(record.nfcCardUnitCost),
    printCost: String(record.printCost),
    designCost: String(record.designCost),
    deliveryCost: String(record.deliveryCost),
    setupCost: String(record.setupCost),
    otherCost: String(record.otherCost),
    subscriptionStartDate: record.subscriptionStartDate,
    extraServiceRevenue: String(record.extraServiceRevenue),
    status: record.status,
    note: record.note,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `%${Math.round(value)}`;
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

function getStatusLabel(status: SubscriptionStatus): string {
  if (status === "completed") {
    return "Tamamlandı";
  }

  if (status === "cancelled") {
    return "İptal";
  }

  return "Aktif";
}

function getStatusTone(status: SubscriptionStatus): "green" | "blue" | "red" {
  if (status === "cancelled") {
    return "red";
  }

  if (status === "completed") {
    return "blue";
  }

  return "green";
}

function createAccountingInsights(
  records: NormalizedAccountingRecord[],
  currentMonthKey: string,
  monthlyRecurringRevenue: number,
): string[] {
  const currentMonthRecords = records.filter((record) => {
    const recordDate =
      record.recordType === "one-time"
        ? record.oneTimeSaleDate
        : record.subscriptionStartDate;

    return isSameMonth(recordDate, currentMonthKey);
  });
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const previousMonthRecords = records.filter((record) => {
    const recordDate =
      record.recordType === "one-time"
        ? record.oneTimeSaleDate
        : record.subscriptionStartDate;

    return isSameMonth(recordDate, previousMonthKey);
  });
  const currentDeliveryCost = currentMonthRecords.reduce(
    (total, record) => total + record.deliveryCost,
    0,
  );
  const previousDeliveryCost = previousMonthRecords.reduce(
    (total, record) => total + record.deliveryCost,
    0,
  );
  const insights: string[] = [];

  if (previousDeliveryCost > 0 && currentDeliveryCost > previousDeliveryCost) {
    const increaseRate =
      ((currentDeliveryCost - previousDeliveryCost) / previousDeliveryCost) * 100;
    insights.push(
      `Bu ay kargo/yol gideriniz geçen aya göre ${formatPercent(increaseRate)} arttı.`,
    );
  }

  const recordsWithNfcCost = records.filter((record) => record.nfcCardUnitCost > 0);

  if (recordsWithNfcCost.length > 0) {
    const averageNfcCost =
      recordsWithNfcCost.reduce(
        (total, record) => total + record.nfcCardUnitCost,
        0,
      ) / recordsWithNfcCost.length;

    if (averageNfcCost > 3) {
      const targetCost = Math.max(0, averageNfcCost - 2);
      const totalCardQuantity = currentMonthRecords.reduce(
        (total, record) => total + record.nfcCardQuantity,
        0,
      );
      const saving = (averageNfcCost - targetCost) * totalCardQuantity;

      insights.push(
        `NFC kart maliyetinizi ${formatCurrency(averageNfcCost)} seviyesinden ${formatCurrency(targetCost)} seviyesine düşürürseniz bu ay yaklaşık ${formatCurrency(saving)} tasarruf edebilirsiniz.`,
      );
    }
  }

  const lowMarginRecord = records.find(
    (record) => record.recordType === "one-time" && record.profitMargin < 50,
  );

  if (lowMarginRecord) {
    insights.push(
      `${lowMarginRecord.businessName} satışında kâr marjınız ${formatPercent(lowMarginRecord.profitMargin)}. Giderleri veya fiyatı tekrar kontrol edin.`,
    );
  }

  const strongMarginRecord = records.find(
    (record) => record.recordType === "one-time" && record.profitMargin >= 70,
  );

  if (strongMarginRecord) {
    insights.push(
      `${strongMarginRecord.businessName} satışında kâr marjınız ${formatPercent(strongMarginRecord.profitMargin)}. Bu fiyatlandırma güçlü görünüyor.`,
    );
  }

  if (monthlyRecurringRevenue > 0) {
    insights.push(
      `Aktif aboneliklerden bu ay beklenen geliriniz ${formatCurrency(monthlyRecurringRevenue)}.`,
    );
  }

  return insights.slice(0, 5);
}

export default function AccountingPage() {
  const [records, setRecords] = useState<AccountingRecord[]>([]);
  const [subscribers, setSubscribers] = useState<ReviewCardSubscriber[]>([]);
  const [nfcStock, setNfcStock] = useState<NfcStockData>(defaultNfcStock);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isOneTimeModalOpen, setIsOneTimeModalOpen] = useState(false);
  const [isStockAddModalOpen, setIsStockAddModalOpen] = useState(false);
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isStockMovementsOpen, setIsStockMovementsOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] =
    useState<NormalizedAccountingRecord | null>(null);
  const [selectedEditRecord, setSelectedEditRecord] =
    useState<NormalizedAccountingRecord | null>(null);
  const [subscriptionFormState, setSubscriptionFormState] =
    useState<SubscriptionFormState>(initialSubscriptionFormState);
  const [editSubscriptionFormState, setEditSubscriptionFormState] =
    useState<SubscriptionFormState>(initialSubscriptionFormState);
  const [oneTimeFormState, setOneTimeFormState] =
    useState<OneTimeFormState>(initialOneTimeFormState);
  const [stockAddFormState, setStockAddFormState] =
    useState<StockAddFormState>(initialStockAddFormState);
  const [stockAdjustFormState, setStockAdjustFormState] =
    useState<StockAdjustFormState>(initialStockAdjustFormState);
  const [subscriptionFormError, setSubscriptionFormError] = useState("");
  const [editSubscriptionFormError, setEditSubscriptionFormError] = useState("");
  const [oneTimeFormError, setOneTimeFormError] = useState("");
  const [stockFormError, setStockFormError] = useState("");
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = getMonthLabel(currentMonthKey);

  useEffect(() => {
    const loadStoredAccountingData = window.setTimeout(() => {
      setRecords(getInitialRecords());
      setSubscribers(getInitialSubscribers());
      setNfcStock(getInitialNfcStock());
    }, 0);

    return () => window.clearTimeout(loadStoredAccountingData);
  }, []);

  const normalizedRecords = useMemo(
    () => records.map(normalizeAccountingRecord),
    [records],
  );

  const subscriptionRecords = useMemo(
    () =>
      normalizedRecords
        .filter((record) => record.recordType === "subscription")
        .sort(
          (firstRecord, secondRecord) =>
            new Date(secondRecord.subscriptionStartDate).getTime() -
            new Date(firstRecord.subscriptionStartDate).getTime(),
        ),
    [normalizedRecords],
  );

  const oneTimeRecords = useMemo(
    () =>
      normalizedRecords
        .filter((record) => record.recordType === "one-time")
        .sort(
          (firstRecord, secondRecord) =>
            new Date(secondRecord.oneTimeSaleDate).getTime() -
            new Date(firstRecord.oneTimeSaleDate).getTime(),
        ),
    [normalizedRecords],
  );

  const sortedRecords = useMemo(() => {
    return [...normalizedRecords].sort((firstRecord, secondRecord) => {
      const firstDate =
        firstRecord.recordType === "one-time"
          ? firstRecord.oneTimeSaleDate
          : firstRecord.subscriptionStartDate;
      const secondDate =
        secondRecord.recordType === "one-time"
          ? secondRecord.oneTimeSaleDate
          : secondRecord.subscriptionStartDate;

      return new Date(secondDate).getTime() - new Date(firstDate).getTime();
    });
  }, [normalizedRecords]);

  const subscribedBusinessKeys = useMemo(() => {
    return new Set(
      subscriptionRecords.map((record) => record.subscriberBusinessKey),
    );
  }, [subscriptionRecords]);

  const availableSubscribers = useMemo(() => {
    return subscribers.filter(
      (subscriber) => !subscribedBusinessKeys.has(getBusinessKey(subscriber)),
    );
  }, [subscribedBusinessKeys, subscribers]);

  const selectedSubscriber = useMemo(() => {
    return availableSubscribers.find(
      (subscriber) =>
        getBusinessKey(subscriber) === subscriptionFormState.subscriberBusinessKey,
    );
  }, [availableSubscribers, subscriptionFormState.subscriberBusinessKey]);

  const calculatedSubscription = useMemo(
    () => calculateSubscriptionValues(subscriptionFormState),
    [subscriptionFormState],
  );

  const calculatedEditSubscription = useMemo(
    () => calculateSubscriptionValues(editSubscriptionFormState),
    [editSubscriptionFormState],
  );

  const calculatedOneTime = useMemo(
    () => calculateOneTimeValues(oneTimeFormState),
    [oneTimeFormState],
  );

  const currentMonthDues = useMemo<CurrentMonthDue[]>(() => {
    return subscriptionRecords
      .map((record) => ({
        record,
        payment:
          record.paymentsByMonth[currentMonthKey] ||
          createEmptyPayment(record.monthlyFee),
        isActive: isSubscriptionActive(record, currentMonthKey),
      }))
      .filter((item) => item.isActive);
  }, [currentMonthKey, subscriptionRecords]);

  const totals = useMemo<AccountingTotals>(() => {
    const expectedThisMonth = currentMonthDues.reduce(
      (total, item) => total + item.record.monthlyFee,
      0,
    );
    const receivedMonthlyThisMonth = currentMonthDues
      .filter((item) => item.payment.isPaid)
      .reduce((total, item) => total + item.payment.amount, 0);
    const setupAndExtraThisMonth = subscriptionRecords
      .filter((record) => isSameMonth(record.subscriptionStartDate, currentMonthKey))
      .reduce(
        (total, record) =>
          total + record.setupFee + record.extraServiceRevenue,
        0,
      );
    const oneTimeRevenueThisMonth = oneTimeRecords
      .filter((record) => isSameMonth(record.oneTimeSaleDate, currentMonthKey))
      .reduce((total, record) => total + record.oneTimeSaleAmount, 0);
    const expenseThisMonth = normalizedRecords
      .filter((record) => {
        const recordDate =
          record.recordType === "one-time"
            ? record.oneTimeSaleDate
            : record.subscriptionStartDate;

        return isSameMonth(recordDate, currentMonthKey);
      })
      .reduce((total, record) => total + record.totalExpense, 0);
    const receivedThisMonth =
      receivedMonthlyThisMonth + setupAndExtraThisMonth + oneTimeRevenueThisMonth;
    const remainingThisMonth = currentMonthDues
      .filter((item) => !item.payment.isPaid)
      .reduce((total, item) => total + item.record.monthlyFee, 0);

    return {
      expectedThisMonth,
      receivedThisMonth,
      remainingThisMonth,
      expenseThisMonth,
      oneTimeRevenueThisMonth,
      partner1ThisMonth: receivedThisMonth * 0.7 - expenseThisMonth,
      partner2ThisMonth: receivedThisMonth * 0.2,
      partner3ThisMonth: receivedThisMonth * 0.1,
    };
  }, [
    currentMonthDues,
    currentMonthKey,
    normalizedRecords,
    oneTimeRecords,
    subscriptionRecords,
  ]);

  const accountingInsights = useMemo(
    () =>
      createAccountingInsights(
        normalizedRecords,
        currentMonthKey,
        totals.expectedThisMonth,
      ),
    [currentMonthKey, normalizedRecords, totals.expectedThisMonth],
  );

  function saveRecords(updatedRecords: AccountingRecord[]) {
    setRecords(updatedRecords);
    window.localStorage.setItem(
      ACCOUNTING_RECORDS_STORAGE_KEY,
      JSON.stringify(updatedRecords),
    );
  }

  function saveNfcStock(updatedStock: NfcStockData) {
    setNfcStock(updatedStock);
    window.localStorage.setItem(
      NFC_STOCK_STORAGE_KEY,
      JSON.stringify(updatedStock),
    );
  }

  function createStockMovement(
    type: NfcStockMovementType,
    quantity: number,
    unitCost: number,
    note: string,
    relatedRecordId?: string,
    relatedBusinessName?: string,
  ): NfcStockMovement {
    return {
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      type,
      quantity,
      unitCost,
      note,
      relatedRecordId,
      relatedBusinessName,
    };
  }

  function getInsufficientStockMessage(requiredQuantity: number) {
    return `Stok yetersiz. Bu kayıt için ${requiredQuantity} NFC kart gerekiyor, stokta ${nfcStock.currentStock} adet var.`;
  }

  function deductStockForRecord(
    record: AccountingRecord,
    requiredQuantity: number,
  ): NfcStockData {
    if (requiredQuantity <= 0) {
      return nfcStock;
    }

    return {
      ...nfcStock,
      currentStock: nfcStock.currentStock - requiredQuantity,
      totalUsed: nfcStock.totalUsed + requiredQuantity,
      movements: [
        createStockMovement(
          "use",
          requiredQuantity,
          safeNumber(record.nfcCardUnitCost),
          "Muhasebe kaydında kullanıldı.",
          record.id,
          record.businessName,
        ),
        ...nfcStock.movements,
      ],
    };
  }

  function updateSubscriptionFormField(
    field: keyof SubscriptionFormState,
    value: string,
  ) {
    if (field === "packageName") {
      const selectedPackage = PACKAGE_PRESETS.find(
        (packagePreset) => packagePreset.name === value,
      );

      if (selectedPackage) {
        setSubscriptionFormState((currentState) => ({
          ...currentState,
          packageName: selectedPackage.name,
          setupFee: String(selectedPackage.setupFee),
          monthlyFee: String(selectedPackage.monthlyFee),
          nfcCardQuantity: String(selectedPackage.defaultNfcCardQuantity),
        }));
        setSubscriptionFormError("");
        return;
      }
    }

    setSubscriptionFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setSubscriptionFormError("");
  }

  function updateEditSubscriptionFormField(
    field: keyof SubscriptionFormState,
    value: string,
  ) {
    setEditSubscriptionFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setEditSubscriptionFormError("");
  }

  function updateOneTimeFormField(field: keyof OneTimeFormState, value: string) {
    setOneTimeFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setOneTimeFormError("");
  }

  function handleOpenSubscriptionModal() {
    setSubscriptionFormState({
      ...initialSubscriptionFormState,
      nfcCardUnitCost:
        nfcStock.lastUnitCost > 0 ? String(nfcStock.lastUnitCost) : "",
    });
    setSubscriptionFormError("");
    setIsSubscriptionModalOpen(true);
  }

  function handleOpenOneTimeModal() {
    setOneTimeFormState({
      ...initialOneTimeFormState,
      nfcCardUnitCost:
        nfcStock.lastUnitCost > 0 ? String(nfcStock.lastUnitCost) : "",
    });
    setOneTimeFormError("");
    setIsOneTimeModalOpen(true);
  }

  function handleOpenStockAddModal() {
    setStockAddFormState({
      ...initialStockAddFormState,
      unitCost: nfcStock.lastUnitCost > 0 ? String(nfcStock.lastUnitCost) : "",
    });
    setStockFormError("");
    setIsStockAddModalOpen(true);
  }

  function handleOpenStockAdjustModal() {
    setStockAdjustFormState({
      newStock: String(nfcStock.currentStock),
      note: "",
    });
    setStockFormError("");
    setIsStockAdjustModalOpen(true);
  }

  function handleOpenEditSubscriptionModal(record: NormalizedAccountingRecord) {
    setSelectedEditRecord(record);
    setEditSubscriptionFormState(createSubscriptionEditFormState(record));
    setEditSubscriptionFormError("");
  }

  function handleApplyEditPackagePreset() {
    const selectedPackage = PACKAGE_PRESETS.find(
      (packagePreset) =>
        packagePreset.name === editSubscriptionFormState.packageName,
    );

    if (!selectedPackage) {
      return;
    }

    setEditSubscriptionFormState((currentState) => ({
      ...currentState,
      setupFee: String(selectedPackage.setupFee),
      monthlyFee: String(selectedPackage.monthlyFee),
      nfcCardQuantity: String(selectedPackage.defaultNfcCardQuantity),
    }));
    setEditSubscriptionFormError("");
  }

  function handleSaveSubscriptionRecord() {
    if (!selectedSubscriber) {
      setSubscriptionFormError("Lütfen önce bir abone işletme seçin.");
      return;
    }

    if (!subscriptionFormState.subscriptionStartDate) {
      setSubscriptionFormError("Lütfen abonelik başlangıç tarihini seçin.");
      return;
    }

    if (
      calculatedSubscription.nfcCardQuantity > 0 &&
      nfcStock.currentStock < calculatedSubscription.nfcCardQuantity
    ) {
      setSubscriptionFormError(
        getInsufficientStockMessage(calculatedSubscription.nfcCardQuantity),
      );
      return;
    }

    const recordId = createRecordId();
    const newRecord: AccountingRecord = {
      id: recordId,
      createdAt: new Date().toISOString(),
      recordType: "subscription",
      subscriptionStartDate: subscriptionFormState.subscriptionStartDate,
      subscriberBusinessKey: getBusinessKey(selectedSubscriber),
      businessName: selectedSubscriber.businessName,
      category: selectedSubscriber.category,
      location: selectedSubscriber.location,
      packageName: subscriptionFormState.packageName,
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
      extraServiceRevenue: calculatedSubscription.extraServiceRevenue,
      totalExpense: calculatedSubscription.totalExpense,
      stockDeducted: calculatedSubscription.nfcCardQuantity > 0,
      paymentsByMonth: {},
      status: subscriptionFormState.status,
      note: subscriptionFormState.note.trim(),
    };

    if (calculatedSubscription.nfcCardQuantity > 0) {
      saveNfcStock(
        deductStockForRecord(newRecord, calculatedSubscription.nfcCardQuantity),
      );
    }
    saveRecords([newRecord, ...records]);
    setIsSubscriptionModalOpen(false);
    setSubscriptionFormState(initialSubscriptionFormState);
  }

  function handleSaveOneTimeRecord() {
    const businessName = oneTimeFormState.businessName.trim();
    const location = oneTimeFormState.location.trim();

    if (!businessName || !location) {
      setOneTimeFormError("Lütfen işletme adı ve konum girin.");
      return;
    }

    if (calculatedOneTime.oneTimeSaleAmount <= 0) {
      setOneTimeFormError("Satış tutarı 0'dan büyük olmalı.");
      return;
    }

    if (
      calculatedOneTime.nfcCardQuantity > 0 &&
      nfcStock.currentStock < calculatedOneTime.nfcCardQuantity
    ) {
      setOneTimeFormError(
        getInsufficientStockMessage(calculatedOneTime.nfcCardQuantity),
      );
      return;
    }

    const recordId = createRecordId();
    const newRecord: AccountingRecord = {
      id: recordId,
      createdAt: new Date().toISOString(),
      recordType: "one-time",
      oneTimeSaleDate:
        oneTimeFormState.oneTimeSaleDate || new Date().toISOString().slice(0, 10),
      saleDate:
        oneTimeFormState.oneTimeSaleDate || new Date().toISOString().slice(0, 10),
      subscriberBusinessKey: getManualBusinessKey(businessName, location),
      businessName,
      category: "Tek Seferlik Satış",
      location,
      oneTimeSaleAmount: calculatedOneTime.oneTimeSaleAmount,
      nfcCardQuantity: calculatedOneTime.nfcCardQuantity,
      nfcCardUnitCost: calculatedOneTime.nfcCardUnitCost,
      nfcCardTotalCost: calculatedOneTime.nfcCardTotalCost,
      printCost: calculatedOneTime.printCost,
      designCost: calculatedOneTime.designCost,
      deliveryCost: calculatedOneTime.deliveryCost,
      setupCost: calculatedOneTime.setupCost,
      otherCost: calculatedOneTime.otherCost,
      totalExpense: calculatedOneTime.totalExpense,
      grossProfit: calculatedOneTime.grossProfit,
      profitMargin: calculatedOneTime.profitMargin,
      stockDeducted: calculatedOneTime.nfcCardQuantity > 0,
      note: oneTimeFormState.note.trim(),
    };

    if (calculatedOneTime.nfcCardQuantity > 0) {
      saveNfcStock(
        deductStockForRecord(newRecord, calculatedOneTime.nfcCardQuantity),
      );
    }
    saveRecords([newRecord, ...records]);
    setIsOneTimeModalOpen(false);
    setOneTimeFormState(initialOneTimeFormState);
  }

  function handleSaveEditedSubscriptionRecord() {
    if (!selectedEditRecord) {
      return;
    }

    if (!editSubscriptionFormState.subscriptionStartDate) {
      setEditSubscriptionFormError("Lütfen abonelik başlangıç tarihini seçin.");
      return;
    }

    const existingRecord = records.find(
      (record) => record.id === selectedEditRecord.id,
    );

    if (!existingRecord) {
      setEditSubscriptionFormError("Düzenlenecek kayıt bulunamadı.");
      return;
    }

    const oldQuantity = selectedEditRecord.nfcCardQuantity;
    const newQuantity = calculatedEditSubscription.nfcCardQuantity;
    const quantityDifference = newQuantity - oldQuantity;
    let nextStock = nfcStock;

    if (selectedEditRecord.stockDeducted && quantityDifference > 0) {
      if (nfcStock.currentStock < quantityDifference) {
        setEditSubscriptionFormError(
          getInsufficientStockMessage(quantityDifference),
        );
        return;
      }

      nextStock = {
        ...nextStock,
        currentStock: nextStock.currentStock - quantityDifference,
        totalUsed: nextStock.totalUsed + quantityDifference,
        movements: [
          createStockMovement(
            "use",
            quantityDifference,
            calculatedEditSubscription.nfcCardUnitCost,
            "Abonelik düzenlemesiyle ek kart kullanıldı",
            selectedEditRecord.id,
            selectedEditRecord.businessName,
          ),
          ...nextStock.movements,
        ],
      };
    }

    if (selectedEditRecord.stockDeducted && quantityDifference < 0) {
      const returnedQuantity = Math.abs(quantityDifference);

      nextStock = {
        ...nextStock,
        currentStock: nextStock.currentStock + returnedQuantity,
        totalUsed: Math.max(0, nextStock.totalUsed - returnedQuantity),
        movements: [
          createStockMovement(
            "return",
            returnedQuantity,
            calculatedEditSubscription.nfcCardUnitCost,
            "Abonelik düzenlemesiyle kart stoğa iade edildi",
            selectedEditRecord.id,
            selectedEditRecord.businessName,
          ),
          ...nextStock.movements,
        ],
      };
    }

    const updatedRecord: AccountingRecord = {
      ...existingRecord,
      recordType: "subscription",
      subscriptionStartDate: editSubscriptionFormState.subscriptionStartDate,
      packageName: editSubscriptionFormState.packageName,
      setupFee: calculatedEditSubscription.setupFee,
      monthlyFee: calculatedEditSubscription.monthlyFee,
      subscriptionMonths: calculatedEditSubscription.subscriptionMonths,
      nfcCardQuantity: calculatedEditSubscription.nfcCardQuantity,
      nfcCardUnitCost: calculatedEditSubscription.nfcCardUnitCost,
      nfcCardTotalCost: calculatedEditSubscription.nfcCardTotalCost,
      printCost: calculatedEditSubscription.printCost,
      designCost: calculatedEditSubscription.designCost,
      deliveryCost: calculatedEditSubscription.deliveryCost,
      setupCost: calculatedEditSubscription.setupCost,
      otherCost: calculatedEditSubscription.otherCost,
      extraServiceRevenue: calculatedEditSubscription.extraServiceRevenue,
      totalExpense: calculatedEditSubscription.totalExpense,
      status: editSubscriptionFormState.status,
      paymentsByMonth:
        existingRecord.paymentsByMonth || selectedEditRecord.paymentsByMonth,
      note: editSubscriptionFormState.note.trim(),
    };

    if (nextStock !== nfcStock) {
      saveNfcStock(nextStock);
    }

    saveRecords(
      records.map((record) =>
        record.id === selectedEditRecord.id ? updatedRecord : record,
      ),
    );
    setSelectedDetailRecord(normalizeAccountingRecord(updatedRecord));
    setSelectedEditRecord(null);
    setEditSubscriptionFormError("");
  }

  function handleDeleteRecord(recordId: string) {
    const deletedRecord = records.find((record) => record.id === recordId);

    if (!deletedRecord) {
      return;
    }

    const shouldDelete = window.confirm(
      deletedRecord.stockDeducted
        ? "Bu kayıt silinecek ve kullanılan NFC kartlar stoğa iade edilecek. Devam edilsin mi?"
        : "Bu kayıt silinecek. Devam edilsin mi?",
    );

    if (!shouldDelete) {
      return;
    }

    if (selectedDetailRecord?.id === recordId) {
      setSelectedDetailRecord(null);
    }

    if (deletedRecord?.stockDeducted && safeNumber(deletedRecord.nfcCardQuantity) > 0) {
      const returnedQuantity = safeNumber(deletedRecord.nfcCardQuantity);

      saveNfcStock({
        ...nfcStock,
        currentStock: nfcStock.currentStock + returnedQuantity,
        totalUsed: Math.max(0, nfcStock.totalUsed - returnedQuantity),
        movements: [
          createStockMovement(
            "return",
            returnedQuantity,
            safeNumber(deletedRecord.nfcCardUnitCost),
            "Muhasebe kaydı silindiği için stok iade edildi.",
            deletedRecord.id,
            deletedRecord.businessName,
          ),
          ...nfcStock.movements,
        ],
      });
    }

    saveRecords(records.filter((record) => record.id !== recordId));
  }

  function handleSaveStockAdd() {
    const quantity = parseQuantity(stockAddFormState.quantity);
    const unitCost = parseMoney(stockAddFormState.unitCost);

    if (quantity <= 0) {
      setStockFormError("Adet 0'dan büyük olmalı.");
      return;
    }

    if (unitCost < 0) {
      setStockFormError("Birim maliyet negatif olamaz.");
      return;
    }

    saveNfcStock({
      ...nfcStock,
      currentStock: nfcStock.currentStock + quantity,
      totalAdded: nfcStock.totalAdded + quantity,
      lastUnitCost: unitCost > 0 ? unitCost : nfcStock.lastUnitCost,
      movements: [
        createStockMovement("add", quantity, unitCost, stockAddFormState.note.trim()),
        ...nfcStock.movements,
      ],
    });
    setIsStockAddModalOpen(false);
    setStockAddFormState(initialStockAddFormState);
  }

  function handleSaveStockAdjust() {
    const nextStock = parseQuantity(stockAdjustFormState.newStock);

    if (nextStock < 0) {
      setStockFormError("Yeni stok adedi negatif olamaz.");
      return;
    }

    const difference = nextStock - nfcStock.currentStock;

    saveNfcStock({
      ...nfcStock,
      currentStock: nextStock,
      movements: [
        createStockMovement(
          "adjust",
          difference,
          0,
          stockAdjustFormState.note.trim() || "Manuel stok düzeltmesi",
        ),
        ...nfcStock.movements,
      ],
    });
    setIsStockAdjustModalOpen(false);
    setStockAdjustFormState(initialStockAdjustFormState);
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
      "Kayıt Türü",
      "İşletme",
      "Konum",
      "Paket",
      "Durum",
      "Başlangıç/Satış Tarihi",
      "Aylık Ücret",
      "Anlaşma Süresi",
      "Tek Seferlik Satış Tutarı",
      "NFC Kart Adedi",
      "NFC Birim Maliyeti",
      "NFC Toplam Maliyet",
      "Baskı Gideri",
      "Tasarım Gideri",
      "Teslimat/Yol Gideri",
      "Kurulum Gideri",
      "Diğer Gider",
      "Toplam Gider",
      "Brüt Kâr",
      "Kâr Marjı",
      "Bu Ay Ödendi mi",
      "Not",
    ];
    const rows = sortedRecords.map((record) => {
      const currentPayment = record.paymentsByMonth[currentMonthKey];

      return [
        record.recordType === "subscription" ? "Aylık Abonelik" : "Tek Seferlik Satış",
        record.businessName,
        record.location,
        record.recordType === "subscription" ? record.packageName : "",
        record.recordType === "subscription" ? getStatusLabel(record.status) : "-",
        record.recordType === "subscription"
          ? record.subscriptionStartDate
          : record.oneTimeSaleDate,
        record.monthlyFee,
        record.recordType === "subscription" ? record.subscriptionMonths : "",
        record.oneTimeSaleAmount,
        record.nfcCardQuantity,
        record.nfcCardUnitCost,
        record.nfcCardTotalCost,
        record.printCost,
        record.designCost,
        record.deliveryCost,
        record.setupCost,
        record.otherCost,
        record.totalExpense,
        record.grossProfit,
        record.recordType === "one-time" ? formatPercent(record.profitMargin) : "",
        currentPayment?.isPaid ? "Evet" : "Hayır",
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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="page-eyebrow">Yorum Kart</p>
            <h1 className="page-title mt-4">Muhasebe</h1>
            <p className="muted-text mt-3 max-w-3xl text-base leading-7">
              Abonelikleri, tahsilatları, satışları, giderleri ve NFC kart stoğunu yönetin.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <button
              type="button"
              onClick={handleOpenOneTimeModal}
              className="btn-primary w-full sm:w-auto"
            >
              Yeni Satış
            </button>
            <button
              type="button"
              onClick={handleOpenSubscriptionModal}
              className="btn-secondary w-full sm:w-auto"
            >
              Abonelik Ekle
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={records.length === 0}
              className="btn-ghost w-full sm:w-auto"
            >
              CSV İndir
            </button>
          </div>
        </header>

        <section>
          <h2 className="font-heading text-xl font-semibold text-[#0F172A]">
            Bu Ayın Özeti
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Bu Ay Beklenen"
              value={formatCurrency(totals.expectedThisMonth)}
              tone="blue"
            />
            <SummaryCard
              label="Bu Ay Alınan"
              value={formatCurrency(totals.receivedThisMonth)}
              tone="green"
            />
            <SummaryCard
              label="Bu Ay Kalan"
              value={formatCurrency(totals.remainingThisMonth)}
              tone="amber"
            />
            <SummaryCard
              label="Bu Ay Gider"
              value={formatCurrency(totals.expenseThisMonth)}
              tone="red"
            />
          </div>
        </section>

        <InsightsPanel
          insights={accountingInsights.slice(0, 3)}
          isOpen={isInsightsOpen}
          onToggle={() => setIsInsightsOpen((current) => !current)}
        />

        <section className="card-pop overflow-visible">
          <SectionHeader
            title="Bu Ay Tahsil Edilecekler"
            subtitle={`${currentMonthLabel} için aktif aboneliklerin aylık ödemeleri`}
          />

          {currentMonthDues.length === 0 ? (
            <EmptyBox text="Bu ay tahsil edilecek ödeme bulunmuyor." />
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#64748B]">
                    <tr>
                      <th className="w-[30%] px-4 py-3">İşletme</th>
                      <th className="px-4 py-3">Ödeme Türü</th>
                      <th className="px-4 py-3">Tutar</th>
                      <th className="px-4 py-3">Son/Dönem Bilgisi</th>
                      <th className="px-4 py-3">Durum</th>
                      <th className="px-4 py-3 text-right">Aksiyonlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {currentMonthDues.map(({ record, payment }) => (
                      <tr
                        key={record.id}
                        className={payment.isPaid ? "bg-[#F8FAFC]" : "bg-white"}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#0F172A]">
                            {record.businessName}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#64748B]">
                            {record.location}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[#475569]">
                          Aylık Abonelik
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0F172A]">
                          {formatCurrency(record.monthlyFee)}
                        </td>
                        <td className="px-4 py-3 text-[#475569]">
                          {currentMonthLabel}
                        </td>
                        <td className="px-4 py-3">
                          <Pill
                            label={payment.isPaid ? "Ödendi" : "Bekliyor"}
                            tone={payment.isPaid ? "green" : "amber"}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleCurrentMonthPayment(record.id)
                              }
                              className={
                                payment.isPaid
                                  ? "btn-ghost min-h-10 px-3 text-xs"
                                  : "btn-primary min-h-10 px-3 text-xs"
                              }
                            >
                              {payment.isPaid ? "Geri Al" : "Ödeme Alındı"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {currentMonthDues.map(({ record, payment }) => (
                  <article key={record.id} className="compact-row">
                    <div>
                      <p className="font-semibold text-[#0F172A]">
                        {record.businessName}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Aylık Abonelik • {currentMonthLabel}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <MiniMetric label="Tutar" value={formatCurrency(record.monthlyFee)} />
                      <MiniMetric
                        label="Durum"
                        value={payment.isPaid ? "Ödendi" : "Bekliyor"}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCurrentMonthPayment(record.id)}
                      className={payment.isPaid ? "btn-ghost" : "btn-primary"}
                    >
                      {payment.isPaid ? "Geri Al" : "Ödeme Alındı"}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card-pop overflow-visible">
          <SectionHeader
            title="Aylık Abonelikler"
            subtitle={`${subscriptionRecords.length} abonelik kaydı`}
          />

          {subscriptionRecords.length === 0 ? (
            <EmptyBox text="Henüz aylık abonelik kaydı yok." />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {subscriptionRecords.map((record) => (
                <SubscriptionListItem
                  key={record.id}
                  record={record}
                  currentMonthKey={currentMonthKey}
                  onOpenDetail={setSelectedDetailRecord}
                  onOpenEdit={handleOpenEditSubscriptionModal}
                />
              ))}
            </div>
          )}
        </section>

        <section className="card-pop overflow-visible">
          <SectionHeader
            title="Tek Seferlik Satışlar"
            subtitle={`${oneTimeRecords.length} satış kaydı`}
          />

          {oneTimeRecords.length === 0 ? (
            <EmptyBox text="Henüz tek seferlik satış kaydı yok." />
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {oneTimeRecords.map((record) => (
                <OneTimeListItem
                  key={record.id}
                  record={record}
                  onOpenDetail={setSelectedDetailRecord}
                />
              ))}
            </div>
          )}
        </section>

        <NfcStockPanel
          stock={nfcStock}
          movements={nfcStock.movements.slice(0, 8)}
          isMovementsOpen={isStockMovementsOpen}
          onToggleMovements={() =>
            setIsStockMovementsOpen((current) => !current)
          }
          onOpenAdd={handleOpenStockAddModal}
          onOpenAdjust={handleOpenStockAdjustModal}
        />

        <section className="card-pop p-5">
          <div>
            <h2 className="font-heading text-xl font-semibold text-[#0F172A]">
              Bu Ay Ortak Payı
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Giderler yalnızca %70 paydan düşülür.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ShareCard
              label="1. Ortak"
              percentage="%70"
              value={formatCurrency(totals.partner1ThisMonth)}
              helper="Giderler yalnızca bu paydan düşülür."
              tone="blue"
            />
            <ShareCard
              label="2. Ortak"
              percentage="%20"
              value={formatCurrency(totals.partner2ThisMonth)}
              tone="green"
            />
            <ShareCard
              label="3. Ortak"
              percentage="%10"
              value={formatCurrency(totals.partner3ThisMonth)}
              tone="slate"
            />
          </div>
        </section>
      </div>
      {isSubscriptionModalOpen ? (
        <SubscriptionRecordModal
          subscribers={availableSubscribers}
          totalSubscriberCount={subscribers.length}
          formState={subscriptionFormState}
          selectedSubscriber={selectedSubscriber}
          calculatedSubscription={calculatedSubscription}
          formError={subscriptionFormError}
          currentStock={nfcStock.currentStock}
          onUpdateField={updateSubscriptionFormField}
          onSave={handleSaveSubscriptionRecord}
          onClose={() => setIsSubscriptionModalOpen(false)}
        />
      ) : null}

      {isOneTimeModalOpen ? (
        <OneTimeRecordModal
          formState={oneTimeFormState}
          calculatedOneTime={calculatedOneTime}
          formError={oneTimeFormError}
          currentStock={nfcStock.currentStock}
          onUpdateField={updateOneTimeFormField}
          onSave={handleSaveOneTimeRecord}
          onClose={() => setIsOneTimeModalOpen(false)}
        />
      ) : null}

      {isStockAddModalOpen ? (
        <StockAddModal
          formState={stockAddFormState}
          formError={stockFormError}
          onUpdateField={(field, value) => {
            setStockAddFormState((currentState) => ({
              ...currentState,
              [field]: value,
            }));
            setStockFormError("");
          }}
          onSave={handleSaveStockAdd}
          onClose={() => setIsStockAddModalOpen(false)}
        />
      ) : null}

      {isStockAdjustModalOpen ? (
        <StockAdjustModal
          formState={stockAdjustFormState}
          formError={stockFormError}
          onUpdateField={(field, value) => {
            setStockAdjustFormState((currentState) => ({
              ...currentState,
              [field]: value,
            }));
            setStockFormError("");
          }}
          onSave={handleSaveStockAdjust}
          onClose={() => setIsStockAdjustModalOpen(false)}
        />
      ) : null}

      {selectedEditRecord ? (
        <EditSubscriptionRecordModal
          record={selectedEditRecord}
          formState={editSubscriptionFormState}
          calculatedSubscription={calculatedEditSubscription}
          formError={editSubscriptionFormError}
          currentStock={nfcStock.currentStock}
          onUpdateField={updateEditSubscriptionFormField}
          onApplyPackagePreset={handleApplyEditPackagePreset}
          onSave={handleSaveEditedSubscriptionRecord}
          onClose={() => {
            setSelectedEditRecord(null);
            setEditSubscriptionFormError("");
          }}
        />
      ) : null}

      {selectedDetailRecord ? (
        <AccountingDetailModal
          record={selectedDetailRecord}
          currentMonthKey={currentMonthKey}
          onOpenEdit={handleOpenEditSubscriptionModal}
          onDelete={handleDeleteRecord}
          onClose={() => setSelectedDetailRecord(null)}
        />
      ) : null}
    </AppShell>
  );
}

function InsightsPanel({
  insights,
  isOpen,
  onToggle,
}: {
  insights: string[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (insights.length === 0) {
    return (
      <section className="rounded-xl border border-l-4 border-[#E2E8F0] border-l-[#2563EB] bg-white px-5 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-base font-semibold text-[#0F172A]">
              AI Muhasebe Önerileri
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Yeterli muhasebe verisi oluşunca burada kısa öneriler görünecek.
            </p>
          </div>
          <Pill label="0 öneri" tone="slate" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-l-4 border-[#E2E8F0] border-l-[#2563EB] bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-5 py-4 text-left sm:flex-row sm:items-center sm:justify-between"
        aria-expanded={isOpen}
      >
        <span>
          <span className="block font-heading text-base font-semibold text-[#0F172A]">
            AI Muhasebe Önerileri
          </span>
          <span className="mt-1 block text-sm text-[#64748B]">
            {insights.length} öneri • API kullanmadan kural bazlı oluşturuldu.
          </span>
        </span>
        <span className="btn-ghost pointer-events-none min-h-10 px-3 text-xs">
          {isOpen ? "Gizle" : "Önerileri Göster"}
        </span>
      </button>

      {isOpen ? (
        <div className="grid gap-2 border-t border-[#E2E8F0] p-4">
          {insights.map((insight) => (
            <div
              key={insight}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"
            >
              <p className="text-sm font-medium leading-6 text-[#334155]">
                {insight}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function NfcStockPanel({
  stock,
  movements,
  isMovementsOpen,
  onToggleMovements,
  onOpenAdd,
  onOpenAdjust,
}: {
  stock: NfcStockData;
  movements: NfcStockMovement[];
  isMovementsOpen: boolean;
  onToggleMovements: () => void;
  onOpenAdd: () => void;
  onOpenAdjust: () => void;
}) {
  const isCritical = stock.currentStock <= stock.criticalStockLevel;

  return (
    <section className="card-pop overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[#0F172A]">
            NFC Kart Stoğu
          </h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Satış kayıtlarında kullanılan kart adedi stoktan otomatik düşer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenAdd} className="btn-primary">
            Stok Ekle
          </button>
          <button type="button" onClick={onOpenAdjust} className="btn-secondary">
            Stok Kullan / Düzelt
          </button>
          <button type="button" onClick={onToggleMovements} className="btn-ghost">
            {isMovementsOpen ? "Hareketleri Gizle" : "Hareketleri Gör"}
          </button>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricBadge
          label="Mevcut Stok"
          value={`${stock.currentStock} adet`}
          tone={stock.currentStock === 0 ? "red" : isCritical ? "amber" : "green"}
        />
        <MetricBadge
          label="Kritik Seviye"
          value={`${stock.criticalStockLevel} adet`}
          tone="amber"
        />
        <MetricBadge
          label="Son Birim Maliyet"
          value={formatCurrency(stock.lastUnitCost)}
        />
        <MetricBadge label="Toplam Eklenen" value={`${stock.totalAdded} adet`} />
        <MetricBadge label="Toplam Kullanılan" value={`${stock.totalUsed} adet`} />
      </div>
      {isCritical ? (
        <div className="px-4 pb-4">
          <p className="rounded-lg border border-[#F59E0B] bg-[#FFFBEB] p-3 text-sm font-semibold text-[#92400E]">
            NFC kart stoğu kritik seviyede.
          </p>
        </div>
      ) : null}
      {isMovementsOpen ? <StockMovementsPanel movements={movements} /> : null}
    </section>
  );
}

function StockMovementsPanel({
  movements,
}: {
  movements: NfcStockMovement[];
}) {
  return (
    <div className="border-t border-[#E2E8F0]">
      <div className="px-5 py-4">
        <h3 className="font-heading text-base font-semibold text-[#0F172A]">
          Son Stok Hareketleri
        </h3>
      </div>
      {movements.length === 0 ? (
        <EmptyBox text="Henüz stok hareketi bulunmuyor." />
      ) : (
        <div className="grid gap-2 p-4">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="grid gap-2 rounded-lg border border-[#E2E8F0] bg-white p-3 text-sm text-[#334155] md:grid-cols-[1fr_1fr_auto_1.5fr] md:items-center"
            >
              <span>{formatDate(movement.createdAt)}</span>
              <span>{getStockMovementLabel(movement.type)}</span>
              <span className="font-semibold text-[#0F172A]">
                {getSignedStockQuantity(movement)}
              </span>
              <span className="text-[#64748B]">
                {movement.relatedBusinessName || movement.note || "Not yok"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function getStockMovementLabel(type: NfcStockMovementType): string {
  if (type === "add") {
    return "Stok Eklendi";
  }

  if (type === "use") {
    return "Satışta Kullanıldı";
  }

  if (type === "adjust") {
    return "Stok Düzeltildi";
  }

  return "Stok İade Edildi";
}

function getSignedStockQuantity(movement: NfcStockMovement): string {
  if (movement.type === "use") {
    return `-${Math.abs(movement.quantity)} adet`;
  }

  if (movement.type === "adjust") {
    return `${movement.quantity > 0 ? "+" : ""}${movement.quantity} adet`;
  }

  return `+${Math.abs(movement.quantity)} adet`;
}

function StockAddModal({
  formState,
  formError,
  onUpdateField,
  onSave,
  onClose,
}: {
  formState: StockAddFormState;
  formError: string;
  onUpdateField: (field: keyof StockAddFormState, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Stok Ekle" eyebrow="NFC Stok" onClose={onClose}>
      <div className="grid gap-5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Adet">
            <NumberInput
              value={formState.quantity}
              onChange={(value) => onUpdateField("quantity", value)}
              min="1"
              step="1"
            />
          </FormField>
          <FormField label="Birim Maliyet">
            <NumberInput
              value={formState.unitCost}
              onChange={(value) => onUpdateField("unitCost", value)}
              placeholder="Örn: 8"
            />
          </FormField>
        </div>
        <FormField label="Not">
          <textarea
            value={formState.note}
            onChange={(event) => onUpdateField("note", event.target.value)}
            placeholder="Stok alımı notu"
            className="input-pop min-h-24 w-full"
          />
        </FormField>
        {formError ? <ErrorMessage message={formError} /> : null}
      </div>
      <ModalActions>
        <button type="button" onClick={onSave} className="btn-primary">
          Stok Ekle
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Kapat
        </button>
      </ModalActions>
    </ModalFrame>
  );
}

function StockAdjustModal({
  formState,
  formError,
  onUpdateField,
  onSave,
  onClose,
}: {
  formState: StockAdjustFormState;
  formError: string;
  onUpdateField: (field: keyof StockAdjustFormState, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Stok Düzelt" eyebrow="NFC Stok" onClose={onClose}>
      <div className="grid gap-5 p-5">
        <FormField label="Yeni stok adedi">
          <NumberInput
            value={formState.newStock}
            onChange={(value) => onUpdateField("newStock", value)}
            min="0"
            step="1"
          />
        </FormField>
        <FormField label="Not">
          <textarea
            value={formState.note}
            onChange={(event) => onUpdateField("note", event.target.value)}
            placeholder="Düzeltme sebebi"
            className="input-pop min-h-24 w-full"
          />
        </FormField>
        {formError ? <ErrorMessage message={formError} /> : null}
      </div>
      <ModalActions>
        <button type="button" onClick={onSave} className="btn-primary">
          Stok Düzelt
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Kapat
        </button>
      </ModalActions>
    </ModalFrame>
  );
}

function EditSubscriptionRecordModal({
  record,
  formState,
  calculatedSubscription,
  formError,
  currentStock,
  onUpdateField,
  onApplyPackagePreset,
  onSave,
  onClose,
}: {
  record: NormalizedAccountingRecord;
  formState: SubscriptionFormState;
  calculatedSubscription: ReturnType<typeof calculateSubscriptionValues>;
  formError: string;
  currentStock: number;
  onUpdateField: (field: keyof SubscriptionFormState, value: string) => void;
  onApplyPackagePreset: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Abonelik Düzenle" eyebrow="Muhasebe" onClose={onClose}>
      <div className="grid gap-5 p-5">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="font-heading text-lg font-semibold text-[#0F172A]">
            {record.businessName}
          </p>
          <p className="mt-1 text-sm text-[#64748B]">
            {record.location}
          </p>
          {!record.stockDeducted ? (
            <p className="mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-xs font-semibold text-[#92400E]">
              Bu eski kayıt stok sistemi öncesinde oluşturuldu. NFC adet
              değişiklikleri stok hareketi oluşturmaz.
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-[1fr_auto] md:items-end">
          <p className="text-sm text-[#64748B]">
            Paket değiştirince özel değerler otomatik ezilmez. İstersen preset
            değerlerini ayrı düğmeyle uygula.
          </p>
          <button
            type="button"
            onClick={onApplyPackagePreset}
            disabled={formState.packageName === "Özel"}
            className="btn-secondary min-h-11 px-4 text-xs"
          >
            Paket Değerlerini Uygula
          </button>
        </div>

        <CostAndSubscriptionFields
          formState={formState}
          currentStock={
            record.stockDeducted
              ? currentStock + record.nfcCardQuantity
              : currentStock
          }
          onUpdateField={onUpdateField}
          showStatus
        />

        <FormField label="Not">
          <textarea
            value={formState.note}
            onChange={(event) => onUpdateField("note", event.target.value)}
            placeholder="Abonelik notu ekle"
            className="input-pop min-h-24 w-full"
          />
        </FormField>

        <div className="grid gap-3 md:grid-cols-4">
          <MetricBadge
            label="Aylık Ücret"
            value={formatCurrency(calculatedSubscription.monthlyFee)}
          />
          <MetricBadge
            label="Süre"
            value={`${calculatedSubscription.subscriptionMonths} ay`}
          />
          <MetricBadge
            label="NFC Adedi"
            value={`${calculatedSubscription.nfcCardQuantity} adet`}
          />
          <MetricBadge
            label="Toplam Gider"
            value={formatCurrency(calculatedSubscription.totalExpense)}
          />
        </div>

        {formError ? <ErrorMessage message={formError} /> : null}
      </div>

      <ModalActions>
        <button type="button" onClick={onSave} className="btn-primary">
          Değişiklikleri Kaydet
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Kapat
        </button>
      </ModalActions>
    </ModalFrame>
  );
}

function SubscriptionRecordModal({
  subscribers,
  totalSubscriberCount,
  formState,
  selectedSubscriber,
  calculatedSubscription,
  formError,
  currentStock,
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
  currentStock: number;
  onUpdateField: (field: keyof SubscriptionFormState, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const emptySubscriberMessage =
    totalSubscriberCount === 0
      ? "Önce Aboneler sayfasından bir işletmeyi Yorum Kart abonesi olarak ekleyin."
      : "Tüm aboneler için abonelik kaydı oluşturulmuş.";

  return (
    <ModalFrame title="Yeni Abonelik Kaydı" eyebrow="Muhasebe" onClose={onClose}>
      <div className="grid gap-5 p-5">
        {subscribers.length === 0 ? (
          <p className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
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
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="font-heading text-lg font-semibold text-[#0F172A]">
                    {selectedSubscriber.businessName}
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {selectedSubscriber.category} • {selectedSubscriber.location}
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="grid gap-4">
                    <CostAndSubscriptionFields
                      formState={formState}
                      currentStock={currentStock}
                      onUpdateField={onUpdateField}
                    />
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

                  <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                    <h3 className="font-heading text-lg font-semibold text-[#0F172A]">
                      Hesap Özeti
                    </h3>
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
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}

        {formError ? <ErrorMessage message={formError} /> : null}
      </div>

      <ModalActions>
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
      </ModalActions>
    </ModalFrame>
  );
}

function OneTimeRecordModal({
  formState,
  calculatedOneTime,
  formError,
  currentStock,
  onUpdateField,
  onSave,
  onClose,
}: {
  formState: OneTimeFormState;
  calculatedOneTime: ReturnType<typeof calculateOneTimeValues>;
  formError: string;
  currentStock: number;
  onUpdateField: (field: keyof OneTimeFormState, value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame title="Tek Seferlik Satış Ekle" eyebrow="Muhasebe" onClose={onClose}>
      <div className="grid gap-5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="İşletme adı">
            <input
              value={formState.businessName}
              onChange={(event) => onUpdateField("businessName", event.target.value)}
              className="input-pop w-full"
              placeholder="Örn: Moda Cafe"
            />
          </FormField>
          <FormField label="Konum">
            <input
              value={formState.location}
              onChange={(event) => onUpdateField("location", event.target.value)}
              className="input-pop w-full"
              placeholder="Örn: İstanbul / Kadıköy"
            />
          </FormField>
          <FormField label="Satış tutarı">
            <NumberInput
              value={formState.oneTimeSaleAmount}
              onChange={(value) => onUpdateField("oneTimeSaleAmount", value)}
              placeholder="Örn: 105000"
            />
          </FormField>
          <FormField label="Satış tarihi">
            <input
              type="date"
              value={formState.oneTimeSaleDate}
              onChange={(event) =>
                onUpdateField("oneTimeSaleDate", event.target.value)
              }
              className="input-pop w-full"
            />
          </FormField>
        </div>

        <CostFields
          formState={formState}
          currentStock={currentStock}
          onUpdateField={onUpdateField}
        />

        <FormField label="Not">
          <textarea
            value={formState.note}
            onChange={(event) => onUpdateField("note", event.target.value)}
            placeholder="Satış notu ekle"
            className="input-pop min-h-24 w-full"
          />
        </FormField>

        <div className="grid gap-3 md:grid-cols-4">
          <MetricBadge
            label="Satış"
            value={formatCurrency(calculatedOneTime.oneTimeSaleAmount)}
          />
          <MetricBadge
            label="Toplam Gider"
            value={formatCurrency(calculatedOneTime.totalExpense)}
          />
          <MetricBadge
            label="Brüt Kâr"
            value={formatCurrency(calculatedOneTime.grossProfit)}
          />
          <MetricBadge
            label="Kâr Marjı"
            value={formatPercent(calculatedOneTime.profitMargin)}
          />
        </div>

        {formError ? <ErrorMessage message={formError} /> : null}
      </div>

      <ModalActions>
        <button type="button" onClick={onSave} className="btn-primary">
          Satışı Kaydet
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Kapat
        </button>
      </ModalActions>
    </ModalFrame>
  );
}

function CostAndSubscriptionFields({
  formState,
  currentStock,
  onUpdateField,
  showStatus = false,
}: {
  formState: SubscriptionFormState;
  currentStock: number;
  onUpdateField: (field: keyof SubscriptionFormState, value: string) => void;
  showStatus?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField label="Paket">
        <select
          value={formState.packageName}
          onChange={(event) => onUpdateField("packageName", event.target.value)}
          className="input-pop w-full"
        >
          {PACKAGE_OPTIONS.map((packageName) => (
            <option key={packageName} value={packageName}>
              {packageName}
            </option>
          ))}
        </select>
      </FormField>
      {showStatus ? (
        <FormField label="Durum">
          <select
            value={formState.status}
            onChange={(event) =>
              onUpdateField(
                "status",
                event.target.value as SubscriptionStatus,
              )
            }
            className="input-pop w-full"
          >
            <option value="active">Aktif</option>
            <option value="cancelled">İptal</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </FormField>
      ) : null}
      <FormField label="Abonelik başlangıcı">
        <input
          type="date"
          value={formState.subscriptionStartDate}
          onChange={(event) =>
            onUpdateField("subscriptionStartDate", event.target.value)
          }
          className="input-pop w-full"
        />
      </FormField>
      <FormField label="Anlaşma Süresi (Ay)">
        <NumberInput
          value={formState.subscriptionMonths}
          onChange={(value) => onUpdateField("subscriptionMonths", value)}
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
      <FormField label="Ek hizmet geliri">
        <NumberInput
          value={formState.extraServiceRevenue}
          onChange={(value) => onUpdateField("extraServiceRevenue", value)}
          placeholder="Opsiyonel"
        />
      </FormField>
      <CostFields
        formState={formState}
        currentStock={currentStock}
        onUpdateField={onUpdateField}
      />
    </div>
  );
}

function CostFields<TField extends string>({
  formState,
  currentStock,
  onUpdateField,
}: {
  formState: CostFormState;
  currentStock: number;
  onUpdateField: (field: TField, value: string) => void;
}) {
  const enteredQuantity = parseQuantity(formState.nfcCardQuantity);
  const exceedsStock = enteredQuantity > currentStock;

  return (
    <>
      <FormField label="NFC kart adedi">
        <NumberInput
          value={formState.nfcCardQuantity}
          onChange={(value) => onUpdateField("nfcCardQuantity" as TField, value)}
        />
        <p className="text-xs font-medium text-[#64748B]">
          Mevcut stok: {currentStock} adet
        </p>
        {exceedsStock ? (
          <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-2 text-xs font-semibold text-[#B91C1C]">
            Girilen adet mevcut stoktan fazla.
          </p>
        ) : null}
      </FormField>
      <FormField label="1 NFC kart maliyeti">
        <NumberInput
          value={formState.nfcCardUnitCost}
          onChange={(value) => onUpdateField("nfcCardUnitCost" as TField, value)}
        />
      </FormField>
      <FormField label="Baskı gideri">
        <NumberInput
          value={formState.printCost}
          onChange={(value) => onUpdateField("printCost" as TField, value)}
        />
      </FormField>
      <FormField label="Tasarım gideri">
        <NumberInput
          value={formState.designCost}
          onChange={(value) => onUpdateField("designCost" as TField, value)}
        />
      </FormField>
      <FormField label="Teslimat / yol gideri">
        <NumberInput
          value={formState.deliveryCost}
          onChange={(value) => onUpdateField("deliveryCost" as TField, value)}
        />
      </FormField>
      <FormField label="Kurulum gideri">
        <NumberInput
          value={formState.setupCost}
          onChange={(value) => onUpdateField("setupCost" as TField, value)}
        />
      </FormField>
      <FormField label="Diğer gider">
        <NumberInput
          value={formState.otherCost}
          onChange={(value) => onUpdateField("otherCost" as TField, value)}
        />
      </FormField>
    </>
  );
}

function SubscriptionListItem({
  record,
  currentMonthKey,
  onOpenDetail,
  onOpenEdit,
}: {
  record: NormalizedAccountingRecord;
  currentMonthKey: string;
  onOpenDetail: (record: NormalizedAccountingRecord) => void;
  onOpenEdit: (record: NormalizedAccountingRecord) => void;
}) {
  const currentPayment = record.paymentsByMonth[currentMonthKey];

  return (
    <article className="grid gap-3 bg-white p-4 md:grid-cols-[minmax(0,1.5fr)_0.7fr_0.7fr_0.7fr_0.7fr_0.8fr_1fr] md:items-center">
      <div className="min-w-0">
        <h3 className="truncate font-heading text-base font-semibold text-[#0F172A]">
          {record.businessName}
        </h3>
        <p className="mt-1 truncate text-sm text-[#64748B]">
          {record.location}
        </p>
      </div>
      <MiniMetric label="Paket" value={record.packageName} />
      <MiniMetric label="Aylık Ücret" value={formatCurrency(record.monthlyFee)} />
      <MiniMetric label="Kurulum" value={formatCurrency(record.setupFee)} />
      <div>
        <Pill label={getStatusLabel(record.status)} tone={getStatusTone(record.status)} />
      </div>
      <MiniMetric
        label="Bu Ay Ödeme"
        value={currentPayment?.isPaid ? "Ödendi" : "Bekliyor"}
      />
      <div className="flex flex-wrap gap-2 md:justify-end">
        <button
          type="button"
          onClick={() => onOpenDetail(record)}
          className="btn-secondary min-h-10 px-3 text-xs"
        >
          Detay
        </button>
        <button
          type="button"
          onClick={() => onOpenEdit(record)}
          className="btn-primary min-h-10 px-3 text-xs"
        >
          Düzenle
        </button>
      </div>
    </article>
  );
}

function OneTimeListItem({
  record,
  onOpenDetail,
}: {
  record: NormalizedAccountingRecord;
  onOpenDetail: (record: NormalizedAccountingRecord) => void;
}) {
  return (
    <article className="grid gap-3 bg-white p-4 md:grid-cols-[minmax(0,1.5fr)_0.75fr_0.75fr_0.75fr_0.55fr_0.75fr_0.7fr] md:items-center">
      <div className="min-w-0">
        <h3 className="truncate font-heading text-base font-semibold text-[#0F172A]">
          {record.businessName}
        </h3>
        <p className="mt-1 truncate text-sm text-[#64748B]">
          {record.location}
        </p>
      </div>
      <MiniMetric label="Satış Tutarı" value={formatCurrency(record.oneTimeSaleAmount)} />
      <MiniMetric label="Toplam Gider" value={formatCurrency(record.totalExpense)} />
      <MiniMetric label="Brüt Kâr" value={formatCurrency(record.grossProfit)} />
      <MiniMetric label="Marj" value={formatPercent(record.profitMargin)} />
      <MiniMetric label="Tarih" value={formatDate(record.oneTimeSaleDate)} />
      <div className="flex justify-start md:justify-end">
        <button
          type="button"
          onClick={() => onOpenDetail(record)}
          className="btn-secondary min-h-10 px-3 text-xs"
        >
          Detay
        </button>
      </div>
    </article>
  );
}

function AccountingDetailModal({
  record,
  currentMonthKey,
  onOpenEdit,
  onDelete,
  onClose,
}: {
  record: NormalizedAccountingRecord;
  currentMonthKey: string;
  onOpenEdit: (record: NormalizedAccountingRecord) => void;
  onDelete: (recordId: string) => void;
  onClose: () => void;
}) {
  const currentPayment = record.paymentsByMonth[currentMonthKey];
  const currentMonthProfit =
    record.recordType === "subscription"
      ? (currentPayment?.isPaid ? currentPayment.amount : 0) +
        (isSameMonth(record.subscriptionStartDate, currentMonthKey)
          ? record.setupFee + record.extraServiceRevenue
          : 0) -
        (isSameMonth(record.subscriptionStartDate, currentMonthKey)
          ? record.totalExpense
          : 0)
      : record.grossProfit;

  return (
    <ModalFrame
      title={record.businessName}
      eyebrow={record.recordType === "subscription" ? "Abonelik Detayı" : "Satış Detayı"}
      onClose={onClose}
    >
      <div className="grid gap-5 p-5">
        <p className="text-sm text-[#64748B]">
          {record.location} • {record.recordType === "subscription"
            ? record.packageName
            : formatDate(record.oneTimeSaleDate)}
        </p>

        {record.recordType === "one-time" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricBadge
                label="Satış Tutarı"
                value={formatCurrency(record.oneTimeSaleAmount)}
              />
              <MetricBadge
                label="Toplam Gider"
                value={formatCurrency(record.totalExpense)}
              />
              <MetricBadge
                label="Brüt Kâr"
                value={formatCurrency(record.grossProfit)}
              />
              <MetricBadge
                label="Kâr Marjı"
                value={formatPercent(record.profitMargin)}
              />
            </div>
            <ExpenseBreakdown record={record} />
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricBadge label="Paket" value={record.packageName} />
              <MetricBadge
                label="Durum"
                value={getStatusLabel(record.status)}
              />
              <MetricBadge
                label="Kurulum"
                value={formatCurrency(record.setupFee)}
              />
              <MetricBadge
                label="Aylık Ücret"
                value={formatCurrency(record.monthlyFee)}
              />
              <MetricBadge
                label="Dahil NFC"
                value={`${record.nfcCardQuantity} adet`}
              />
              <MetricBadge
                label="Başlangıç"
                value={formatDate(record.subscriptionStartDate)}
              />
              <MetricBadge
                label="Bu Ay Ödeme"
                value={currentPayment?.isPaid ? "Ödendi" : "Bekliyor"}
              />
              <MetricBadge
                label="Kurulum Stok"
                value={record.stockDeducted ? "Düşüldü" : "Eski kayıt"}
              />
              <MetricBadge
                label="Ödenen Ay"
                value={`${record.paidMonthCount} ay`}
              />
              <MetricBadge
                label="Toplam Gider"
                value={formatCurrency(record.totalExpense)}
              />
              <MetricBadge
                label="Bu Ay Kârlılık"
                value={formatCurrency(currentMonthProfit)}
              />
            </div>
            <ExpenseBreakdown record={record} />
          </>
        )}

        {record.note ? (
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <p className="text-xs font-medium text-[#64748B]">Not</p>
            <p className="mt-2 text-sm font-medium text-[#0F172A]">{record.note}</p>
          </div>
        ) : null}
      </div>

      <ModalActions>
        {record.recordType === "subscription" ? (
          <button
            type="button"
            onClick={() => onOpenEdit(record)}
            className="btn-primary"
          >
            Düzenle
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete(record.id)}
          className="btn-danger"
        >
          Sil
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Kapat
        </button>
      </ModalActions>
    </ModalFrame>
  );
}
function ExpenseBreakdown({ record }: { record: NormalizedAccountingRecord }) {
  const items = [
    ["NFC Kart", record.nfcCardTotalCost],
    ["Baskı", record.printCost],
    ["Tasarım", record.designCost],
    ["Teslimat/Yol", record.deliveryCost],
    ["Kurulum", record.setupCost],
    ["Diğer", record.otherCost],
  ];

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <h3 className="font-heading text-lg font-semibold text-[#0F172A]">
        Gider ve Kârlılık Detayı
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, value]) => (
          <MetricBadge key={label} label={String(label)} value={formatCurrency(Number(value))} />
        ))}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#E2E8F0] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-heading text-lg font-semibold text-[#0F172A]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "amber" | "red";
}) {
  const toneClass = {
    blue: "border-t-[#2563EB] text-[#2563EB]",
    green: "border-t-[#16A34A] text-[#16A34A]",
    amber: "border-t-[#D97706] text-[#D97706]",
    red: "border-t-[#DC2626] text-[#DC2626]",
  }[tone];

  return (
    <article className={`rounded-xl border border-t-2 border-[#E2E8F0] bg-white p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className={`mt-2 font-heading text-2xl font-semibold ${toneClass}`}>
        {value}
      </p>
    </article>
  );
}

function ShareCard({
  label,
  percentage,
  value,
  helper,
  tone,
}: {
  label: string;
  percentage: string;
  value: string;
  helper?: string;
  tone: "blue" | "green" | "slate";
}) {
  const toneClass = {
    blue: "bg-[#EFF6FF] text-[#2563EB]",
    green: "bg-[#F0FDF4] text-[#16A34A]",
    slate: "bg-[#F8FAFC] text-[#475569]",
  }[tone];

  return (
    <article className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
        {percentage}
      </span>
      <p className="mt-3 text-sm font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold text-[#0F172A]">
        {value}
      </p>
      {helper ? <p className="mt-2 text-xs text-[#64748B]">{helper}</p> : null}
    </article>
  );
}

function MetricBadge({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const toneClass = {
    green: "text-[#16A34A]",
    amber: "text-[#D97706]",
    red: "text-[#DC2626]",
    blue: "text-[#2563EB]",
    slate: "text-[#0F172A]",
  }[tone];

  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const toneClass = {
    green: "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]",
    amber: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
    red: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
    blue: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    slate: "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]",
  }[tone];

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {label}
    </span>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="p-5">
      <p className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
        {text}
      </p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm font-semibold text-[#B91C1C]">
      {message}
    </p>
  );
}

function ModalFrame({
  title,
  eyebrow,
  children,
  onClose,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 px-4 py-6">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] bg-white px-5 py-4">
          <div>
            <p className="page-eyebrow">{eyebrow}</p>
            <h2 className="mt-3 font-heading text-2xl font-semibold text-[#0F172A]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary min-h-10 px-4"
            aria-label="Modalı kapat"
          >
            Kapat
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ModalActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-5 py-4 sm:flex-row sm:justify-end">
      {children}
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
      <span className="text-sm font-semibold text-[#0F172A]">{label}</span>
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
