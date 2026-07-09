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

export type LatestAnalysis = {
  country: string;
  city: string;
  district: string;
  category: string;
  createdAt: string;
  businesses: BusinessResult[];
};
