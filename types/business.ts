export type BusinessResult = {
  businessName: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  hasWebsite: boolean;
  hasPhone: boolean;
  leadScore: number;
  mapsUrl: string;
  priceRange?: string;
};

export type ReviewCardSubscriber = BusinessResult & {
  subscribedAt?: string;
  note?: string;
  status?: string;
};

export type SelectedIntent = "review-card" | "web-design";

export type LatestAnalysis = {
  id?: string;
  analysisName?: string;
  country: string;
  city: string;
  district: string;
  category: string;
  createdAt: string;
  selectedIntent?: SelectedIntent;
  businesses: BusinessResult[];
};

export type AnalysisHistoryItem = LatestAnalysis & {
  id: string;
  businessCount: number;
};

export type MonthlyPayment = {
  monthIndex: number;
  label: string;
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
};

export type MonthlyLedgerPayment = {
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
};

export type AccountingRecord = {
  id: string;
  createdAt: string;
  subscriptionStartDate?: string;
  saleDate?: string;
  subscriberBusinessKey: string;
  businessName: string;
  category: string;
  location: string;
  packageName?: string;
  setupFee?: number;
  monthlyFee?: number;
  subscriptionMonths?: number;
  expectedMonthlyRevenue?: number;
  totalSubscriptionRevenue?: number;
  totalContractRevenue?: number;
  paidMonthlyCount?: number;
  remainingMonthlyCount?: number;
  paidMonthlyRevenue?: number;
  remainingMonthlyRevenue?: number;
  monthlyPayments?: MonthlyPayment[];
  paymentsByMonth?: Record<string, MonthlyLedgerPayment>;
  status?: "active" | "completed" | "cancelled";
  saleAmount?: number;
  nfcCardQuantity?: number;
  nfcCardUnitCost?: number;
  nfcCardTotalCost?: number;
  extraServiceRevenue?: number;
  extraServiceNote?: string;
  printCost?: number;
  designCost?: number;
  deliveryCost?: number;
  setupCost?: number;
  otherCost?: number;
  totalExpense?: number;
  totalCost?: number;
  totalRevenue?: number;
  netProfit?: number;
  partner1Share?: number;
  partner2Share?: number;
  partner3Share?: number;
  totalDistributed?: number;
  note: string;
};
