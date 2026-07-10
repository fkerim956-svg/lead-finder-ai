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

export type AccountingRecord = {
  id: string;
  createdAt: string;
  saleDate: string;
  subscriberBusinessKey: string;
  businessName: string;
  category: string;
  location: string;
  saleAmount: number;
  nfcCardQuantity: number;
  nfcCardUnitCost: number;
  nfcCardTotalCost: number;
  printCost: number;
  designCost: number;
  deliveryCost: number;
  setupCost: number;
  otherCost: number;
  totalCost: number;
  netProfit: number;
  partner1Share: number;
  partner2Share: number;
  partner3Share: number;
  note: string;
};
