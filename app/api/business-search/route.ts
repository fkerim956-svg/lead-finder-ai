import { calculateLeadScore } from "@/lib/lead-score";
import type { BusinessResult, LatestAnalysis } from "@/types/business";

type BusinessSearchRequest = {
  country: string;
  city: string;
  district: string;
  category: string;
};

type GooglePlace = {
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
};

type GooglePlacesTextSearchResponse = {
  places?: GooglePlace[];
};

const googlePlacesTextSearchUrl =
  "https://places.googleapis.com/v1/places:searchText";

const googlePlacesFieldMask = [
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
].join(",");

const googleApiKeyPlaceholder = "PASTE_YOUR_GOOGLE_PLACES_API_KEY_HERE";

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as Partial<BusinessSearchRequest>;

  const country = body.country?.trim();
  const city = body.city?.trim();
  const district = body.district?.trim();
  const category = body.category?.trim();

  if (!country || !city || !district || !category) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  let businesses: BusinessResult[];

  if (isGoogleApiConfigured(apiKey)) {
    try {
      businesses = await searchGooglePlaces({
        apiKey,
        country,
        city,
        district,
        category,
      });
    } catch {
      return Response.json(
        { error: "Google Places request failed" },
        { status: 500 },
      );
    }
  } else {
    businesses = createDemoBusinesses({ city, district, category });
  }

  const analysis: LatestAnalysis = {
    country,
    city,
    district,
    category,
    createdAt: new Date().toISOString(),
    businesses,
  };

  return Response.json(analysis);
}

function createDemoBusinesses({
  city,
  district,
  category,
}: {
  city: string;
  district: string;
  category: string;
}): BusinessResult[] {
  const location = `${city} / ${district}`;

  return Array.from({ length: 10 }, (_, index) => {
    const rating = Number((3.2 + (index % 6) * 0.27).toFixed(1));
    const reviewCount = 38 + index * 47;
    const hasWebsite = index % 3 !== 0;
    const hasPhone = index % 4 !== 0;

    return {
      businessName: `${district} ${category} ${index + 1}`,
      category,
      location,
      rating,
      reviewCount,
      hasWebsite,
      hasPhone,
      leadScore: calculateLeadScore({
        rating,
        reviewCount,
        hasWebsite,
        hasPhone,
      }),
      mapsUrl: "https://maps.google.com",
    };
  });
}

function isGoogleApiConfigured(apiKey: string | undefined): apiKey is string {
  return Boolean(apiKey && apiKey.trim() && apiKey !== googleApiKeyPlaceholder);
}

async function searchGooglePlaces({
  apiKey,
  country,
  city,
  district,
  category,
}: {
  apiKey: string;
  country: string;
  city: string;
  district: string;
  category: string;
}): Promise<BusinessResult[]> {
  const fallbackLocation = `${city} / ${district}`;
  const textQuery = `${category} in ${district}, ${city}, ${country}`;
  const response = await fetch(googlePlacesTextSearchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": googlePlacesFieldMask,
    },
    body: JSON.stringify({
      textQuery,
    }),
  });

  if (!response.ok) {
    throw new Error("Google Places request failed");
  }

  const data = (await response.json()) as GooglePlacesTextSearchResponse;

  return (data.places ?? []).slice(0, 20).map((place) => {
    const rating = place.rating ?? 0;
    const reviewCount = place.userRatingCount ?? 0;
    const hasWebsite = Boolean(place.websiteUri);
    const hasPhone = Boolean(place.nationalPhoneNumber);

    return {
      businessName: place.displayName?.text ?? "İsimsiz İşletme",
      category,
      location: place.formattedAddress ?? fallbackLocation,
      rating,
      reviewCount,
      hasWebsite,
      hasPhone,
      leadScore: calculateLeadScore({
        rating,
        reviewCount,
        hasWebsite,
        hasPhone,
      }),
      mapsUrl: place.googleMapsUri ?? "https://maps.google.com",
    };
  });
}
