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
};

export type SelectedIntent = "review-card" | "web-design";

export type LatestAnalysis = {
  id?: string;
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
