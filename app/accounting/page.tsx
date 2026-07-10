"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
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

type PackageName = "Başlangıç" | "Pro" | "Premium" | "Kurumsal";

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
  const subscriptionMonths = parseMonthCount(formState.subscriptionMonths);
  const costs = calculateCosts(formState);
  const firstMonthRevenue = setupFee + monthlyFee;

  return {
    setupFee,
    monthlyFee,
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
  const [records, setRecords] = useState<AccountingRecord[]>(getInitialRecords);
  const [subscribers] = useState<ReviewCardSubscriber[]>(getInitialSubscribers);
  const [nfcStock, setNfcStock] = useState<NfcStockData>(getInitialNfcStock);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isOneTimeModalOpen, setIsOneTimeModalOpen] = useState(false);
  const [isStockAddModalOpen, setIsStockAddModalOpen] = useState(false);
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] =
    useState<NormalizedAccountingRecord | null>(null);
  const [subscriptionFormState, setSubscriptionFormState] =
    useState<SubscriptionFormState>(initialSubscriptionFormState);
  const [oneTimeFormState, setOneTimeFormState] =
    useState<OneTimeFormState>(initialOneTimeFormState);
  const [stockAddFormState, setStockAddFormState] =
    useState<StockAddFormState>(initialStockAddFormState);
  const [stockAdjustFormState, setStockAdjustFormState] =
    useState<StockAdjustFormState>(initialStockAdjustFormState);
  const [subscriptionFormError, setSubscriptionFormError] = useState("");
  const [oneTimeFormError, setOneTimeFormError] = useState("");
  const [stockFormError, setStockFormError] = useState("");
  const currentMonthKey = getCurrentMonthKey();
  const currentMonthLabel = getMonthLabel(currentMonthKey);

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
      totalExpense: calculatedSubscription.totalExpense,
      stockDeducted: calculatedSubscription.nfcCardQuantity > 0,
      paymentsByMonth: {},
      status: "active",
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

  function handleDeleteRecord(recordId: string) {
    const deletedRecord = records.find((record) => record.id === recordId);

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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 py-8 sm:px-6 lg:py-10">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="page-eyebrow">Yorum Kart</p>
            <h1 className="page-title mt-5">Muhasebe</h1>
            <p className="muted-text mt-4 max-w-3xl text-base font-medium leading-7">
              Aylık abonelikleri, tek seferlik satışları, kârlılığı ve ortak
              paylarını sade bir panelde takip edin.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <button
              type="button"
              onClick={handleOpenSubscriptionModal}
              className="btn-primary w-fit"
            >
              Abonelik Kaydı Ekle
            </button>
            <button
              type="button"
              onClick={handleOpenOneTimeModal}
              className="btn-secondary w-fit"
            >
              Tek Seferlik Satış Ekle
            </button>
          </div>
        </header>

        <section>
          <h2 className="font-heading text-2xl font-black text-[#1E293B]">
            Bu Ayın Özeti
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          </div>
        </section>

        <NfcStockPanel
          stock={nfcStock}
          onOpenAdd={handleOpenStockAddModal}
          onOpenAdjust={handleOpenStockAdjustModal}
        />

        <StockMovementsPanel movements={nfcStock.movements.slice(0, 8)} />

        <section className="card-pop overflow-hidden">
          <div className="border-b-2 border-[#1E293B] bg-[#EDE9FE] px-5 py-4">
            <h2 className="font-heading text-2xl font-black text-[#1E293B]">
              AI Muhasebe Önerileri
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-600">
              Şimdilik API kullanmadan, mevcut kayıtlardan kural bazlı öneriler.
            </p>
          </div>
          <div className="grid gap-3 p-4">
            {accountingInsights.length === 0 ? (
              <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
                Yeterli muhasebe verisi oluşunca burada akıllı öneriler görünecek.
              </p>
            ) : (
              accountingInsights.map((insight) => (
                <p
                  key={insight}
                  className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]"
                >
                  {insight}
                </p>
              ))
            )}
          </div>
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
            <EmptyBox text="Bu ay tahsil edilecek aktif abonelik yok." />
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
                        className={
                          payment.isPaid
                            ? "btn-secondary min-h-11 px-4 text-xs"
                            : "btn-primary min-h-11 px-4 text-xs"
                        }
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
          <SectionHeader
            title="Aylık Abonelikler"
            subtitle={`${subscriptionRecords.length} abonelik kaydı`}
            action={
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={records.length === 0}
                className="btn-secondary"
              >
                Muhasebe CSV İndir
              </button>
            }
          />

          {subscriptionRecords.length === 0 ? (
            <EmptyBox text="Henüz aylık abonelik kaydı yok." />
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {subscriptionRecords.map((record) => (
                <SubscriptionListItem
                  key={record.id}
                  record={record}
                  onOpenDetail={setSelectedDetailRecord}
                  onDelete={handleDeleteRecord}
                />
              ))}
            </div>
          )}
        </section>

        <section className="card-pop overflow-hidden">
          <SectionHeader
            title="Tek Seferlik Satışlar"
            subtitle={`${oneTimeRecords.length} satış kaydı`}
          />

          {oneTimeRecords.length === 0 ? (
            <EmptyBox text="Henüz tek seferlik satış kaydı yok." />
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2">
              {oneTimeRecords.map((record) => (
                <OneTimeListItem
                  key={record.id}
                  record={record}
                  onOpenDetail={setSelectedDetailRecord}
                  onDelete={handleDeleteRecord}
                />
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
              Tek seferlik satışlar bu ay alınan tutara eklenir. Giderler 1.
              kişinin payından düşülür.
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

      {selectedDetailRecord ? (
        <AccountingDetailModal
          record={selectedDetailRecord}
          currentMonthKey={currentMonthKey}
          onClose={() => setSelectedDetailRecord(null)}
        />
      ) : null}
    </AppShell>
  );
}

function NfcStockPanel({
  stock,
  onOpenAdd,
  onOpenAdjust,
}: {
  stock: NfcStockData;
  onOpenAdd: () => void;
  onOpenAdjust: () => void;
}) {
  const isCritical = stock.currentStock <= stock.criticalStockLevel;

  return (
    <section className="card-pop overflow-hidden">
      <div className="flex flex-col gap-4 border-b-2 border-[#1E293B] bg-[#34D399] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-black text-[#1E293B]">
            NFC Kart Stoğu
          </h2>
          <p className="mt-1 text-sm font-bold text-[#1E293B]">
            Satış kayıtlarında kullanılan kart adedi stoktan otomatik düşer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenAdd} className="btn-primary">
            Stok Ekle
          </button>
          <button type="button" onClick={onOpenAdjust} className="btn-secondary">
            Stok Düzelt
          </button>
        </div>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricBadge label="Mevcut Stok" value={`${stock.currentStock} adet`} />
        <MetricBadge label="Toplam Eklenen" value={`${stock.totalAdded} adet`} />
        <MetricBadge label="Toplam Kullanılan" value={`${stock.totalUsed} adet`} />
        <MetricBadge
          label="Kritik Seviye"
          value={`${stock.criticalStockLevel} adet`}
        />
      </div>
      {isCritical ? (
        <div className="px-4 pb-4">
          <p className="rounded-2xl border-2 border-[#1E293B] bg-[#F472B6] p-3 text-sm font-black text-[#1E293B]">
            NFC kart stoğu kritik seviyede.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function StockMovementsPanel({
  movements,
}: {
  movements: NfcStockMovement[];
}) {
  return (
    <section className="card-pop overflow-hidden">
      <div className="border-b-2 border-[#1E293B] bg-[#FFFDF5] px-5 py-4">
        <h2 className="font-heading text-xl font-black text-[#1E293B]">
          Son Stok Hareketleri
        </h2>
      </div>
      {movements.length === 0 ? (
        <EmptyBox text="Henüz stok hareketi yok." />
      ) : (
        <div className="grid gap-2 p-4">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="grid gap-2 rounded-2xl border-2 border-[#1E293B] bg-white p-3 text-sm font-bold text-[#1E293B] md:grid-cols-[1fr_1fr_auto_1.5fr] md:items-center"
            >
              <span>{formatDate(movement.createdAt)}</span>
              <span>{getStockMovementLabel(movement.type)}</span>
              <span className="font-black">
                {getSignedStockQuantity(movement)}
              </span>
              <span className="text-slate-600">
                {movement.relatedBusinessName || movement.note || "Not yok"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
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

                  <div className="rounded-[24px] border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
                    <h3 className="font-heading text-xl font-black text-[#1E293B]">
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
}: {
  formState: SubscriptionFormState;
  currentStock: number;
  onUpdateField: (field: keyof SubscriptionFormState, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField label="Paket">
        <select
          value={formState.packageName}
          onChange={(event) => onUpdateField("packageName", event.target.value)}
          className="input-pop w-full"
        >
          {PACKAGE_PRESETS.map((packagePreset) => (
            <option key={packagePreset.name} value={packagePreset.name}>
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
        <p className="text-xs font-black text-slate-500">
          Mevcut stok: {currentStock} adet
        </p>
        {exceedsStock ? (
          <p className="rounded-2xl border-2 border-[#1E293B] bg-[#F472B6] p-2 text-xs font-black text-[#1E293B]">
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
  onOpenDetail,
  onDelete,
}: {
  record: NormalizedAccountingRecord;
  onOpenDetail: (record: NormalizedAccountingRecord) => void;
  onDelete: (recordId: string) => void;
}) {
  return (
    <article className="rounded-[20px] border-2 border-[#1E293B] bg-white p-4 shadow-[3px_3px_0_#1E293B]">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <h3 className="font-heading text-lg font-black text-[#1E293B]">
            {record.businessName}
          </h3>
          <p className="mt-1 text-sm font-bold text-slate-600">
            {record.packageName} • {formatCurrency(record.monthlyFee)} / ay
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill label={getStatusLabel(record.status)} color="#EDE9FE" />
            <Pill label={`${record.paidMonthCount} ay ödendi`} color="#D1FAE5" />
            <Pill label={`${record.subscriptionMonths} ay`} color="#FFFDF5" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenDetail(record)}
            className="btn-secondary min-h-10 px-3 text-xs"
          >
            Detay
          </button>
          <button
            type="button"
            onClick={() => onDelete(record.id)}
            className="btn-danger min-h-10 px-3 text-xs"
          >
            Sil
          </button>
        </div>
      </div>
    </article>
  );
}

function OneTimeListItem({
  record,
  onOpenDetail,
  onDelete,
}: {
  record: NormalizedAccountingRecord;
  onOpenDetail: (record: NormalizedAccountingRecord) => void;
  onDelete: (recordId: string) => void;
}) {
  return (
    <article className="rounded-[20px] border-2 border-[#1E293B] bg-white p-4 shadow-[3px_3px_0_#1E293B]">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <h3 className="font-heading text-lg font-black text-[#1E293B]">
            {record.businessName}
          </h3>
          <p className="mt-1 text-sm font-bold text-slate-600">
            {formatCurrency(record.oneTimeSaleAmount)} satış •{" "}
            {formatDate(record.oneTimeSaleDate)}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MiniMetric label="Gider" value={formatCurrency(record.totalExpense)} />
            <MiniMetric label="Brüt Kâr" value={formatCurrency(record.grossProfit)} />
            <MiniMetric label="Marj" value={formatPercent(record.profitMargin)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenDetail(record)}
            className="btn-secondary min-h-10 px-3 text-xs"
          >
            Detay
          </button>
          <button
            type="button"
            onClick={() => onDelete(record.id)}
            className="btn-danger min-h-10 px-3 text-xs"
          >
            Sil
          </button>
        </div>
      </div>
    </article>
  );
}

function AccountingDetailModal({
  record,
  currentMonthKey,
  onClose,
}: {
  record: NormalizedAccountingRecord;
  currentMonthKey: string;
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
        <p className="text-sm font-bold text-slate-600">
          {record.location} •{" "}
          {record.recordType === "subscription"
            ? record.packageName
            : formatDate(record.oneTimeSaleDate)}
        </p>

        {record.recordType === "one-time" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricBadge
                label="Satış"
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
                label="Kurulum"
                value={formatCurrency(record.setupFee)}
              />
              <MetricBadge
                label="Aylık Ücret"
                value={formatCurrency(record.monthlyFee)}
              />
              <MetricBadge
                label="Bu Ay Ödendi mi"
                value={currentPayment?.isPaid ? "Evet" : "Hayır"}
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
          <div className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
            <p className="text-xs font-black uppercase text-slate-500">Not</p>
            <p className="mt-2 text-sm font-bold text-[#1E293B]">{record.note}</p>
          </div>
        ) : null}
      </div>

      <ModalActions>
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
    <div className="rounded-[24px] border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
      <h3 className="font-heading text-xl font-black text-[#1E293B]">
        Gider Dağılımı
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
    <div className="flex flex-col gap-3 border-b-2 border-[#1E293B] bg-[#EDE9FE] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-heading text-xl font-black text-[#1E293B]">
          {title}
        </h2>
        <p className="mt-1 text-sm font-bold text-slate-600">{subtitle}</p>
      </div>
      {action}
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-2">
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-black text-[#1E293B]">{value}</p>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded-full border-2 border-[#1E293B] px-3 py-1 text-xs font-black text-[#1E293B]"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="p-5">
      <p className="rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4 text-sm font-extrabold text-[#1E293B]">
        {text}
      </p>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border-2 border-[#1E293B] bg-[#F472B6] p-3 text-sm font-black text-[#1E293B]">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E293B]/45 px-4 py-6">
      <section className="hard-shadow-lg max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border-2 border-[#1E293B] bg-white">
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#1E293B] bg-[#F5F3FF] px-5 py-4">
          <div>
            <p className="page-eyebrow bg-[#34D399]">{eyebrow}</p>
            <h2 className="mt-3 font-heading text-3xl font-black text-[#1E293B]">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-4">
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
    <div className="flex flex-col gap-3 border-t-2 border-[#1E293B] px-5 py-4 sm:flex-row sm:justify-end">
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
