import { calculateLeadScore } from "@/lib/lead-score";
import type { BusinessResult } from "@/types/business";

export type RawBusinessRow = Record<string, unknown>;

type NormalizeContext = {
  city: string;
  district: string;
  category: string;
};

const googleScrapedColumns = {
  businessName: ["OSrXXb"],
  category: ["rllt__details"],
  rating: ["yi40Hd"],
  reviewCount: ["RDApEe"],
  priceRange: ["rllt__details 2"],
  location: ["rllt__details 3"],
  fallbackLocation: ["rllt__details 2", "rllt__details 4"],
};

const falsePresenceValues = ["yok", "hayir", "hayır", "no", "false", "0"];

export function cleanText(value: unknown): string {
  return value == null
    ? ""
    : String(value)
        .replace(/\uFEFF/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export function cleanCategory(value: unknown): string {
  return cleanText(value)
    .replace(/^(?:[·•.\-–—|/\\]\s*)+/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]/g, "");
}

export function parseRating(value: unknown): number {
  const normalizedValue = cleanText(value)
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function parseReviewCount(value: unknown): number {
  const normalizedValue = cleanText(value)
    .replace(/[()]/g, "")
    .replace(/\s+/g, "");
  const shorthandMatch = normalizedValue.match(/^([\d.,]+)\s*[Bb]$/);

  if (shorthandMatch) {
    const shorthandValue = Number(shorthandMatch[1].replace(".", "").replace(",", "."));

    return Number.isFinite(shorthandValue)
      ? Math.round(shorthandValue * 1000)
      : 0;
  }

  const parsedValue = Number(normalizedValue.replace(/[^\d]/g, ""));

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function parseBooleanPresence(value: unknown): boolean {
  const textValue = cleanText(value);

  if (!textValue) {
    return false;
  }

  return !falsePresenceValues.includes(normalizeKey(textValue));
}

export function isAddressLike(value: unknown): boolean {
  const textValue = cleanText(value);

  if (!textValue || textValue.length < 5) {
    return false;
  }

  const normalizedValue = textValue.toLocaleLowerCase("tr-TR");
  const addressIndicators = [
    "cad",
    "cad.",
    "cd.",
    "sok",
    "sok.",
    "sk.",
    "mah",
    "mah.",
    "no:",
    "no ",
    "apt",
    "apt.",
    "blv",
    "bulv",
    "bulvar",
    "istanbul",
    "i̇stanbul",
    "üsküdar",
    "uskudar",
    "eyüpsultan",
    "eyupsultan",
    "/istanbul",
    "/i̇stanbul",
  ];

  return (
    addressIndicators.some((indicator) => normalizedValue.includes(indicator)) ||
    /\bno\s*:?\s*\d+/iu.test(textValue) ||
    /\b\d+[/-][a-z0-9]+\b/iu.test(textValue)
  );
}

function getField(row: RawBusinessRow, names: string[]): string {
  const normalizedNames = names.map(normalizeKey);
  const matchedKey = Object.keys(row).find((key) =>
    normalizedNames.includes(normalizeKey(key)),
  );

  return matchedKey ? cleanText(row[matchedKey]) : "";
}

function getFieldByPosition(row: RawBusinessRow, index: number): string {
  return cleanText(Object.values(row)[index]);
}

function appendContextIfNeeded(
  location: string,
  district: string,
  city: string,
): string {
  const normalizedLocation = location.toLocaleLowerCase("tr-TR");
  const additions = [];

  if (district && !normalizedLocation.includes(district.toLocaleLowerCase("tr-TR"))) {
    additions.push(district);
  }

  if (city && !normalizedLocation.includes(city.toLocaleLowerCase("tr-TR"))) {
    additions.push(city);
  }

  return additions.length > 0 ? `${location}, ${additions.join(", ")}` : location;
}

export function normalizeLocation(
  row: RawBusinessRow,
  district: string,
  city: string,
): string {
  const explicitLocation = getField(row, [
    "Konum",
    "Adres",
    "location",
    "address",
    "formattedAddress",
  ]);

  if (explicitLocation) {
    return appendContextIfNeeded(explicitLocation, district, city);
  }

  const googleLocation = getField(row, googleScrapedColumns.location);

  if (isAddressLike(googleLocation)) {
    return appendContextIfNeeded(googleLocation, district, city);
  }

  const fallbackLocation = googleScrapedColumns.fallbackLocation
    .map((column) => getField(row, [column]))
    .find(isAddressLike);

  if (fallbackLocation) {
    return appendContextIfNeeded(fallbackLocation, district, city);
  }

  return `${district}, ${city}`;
}

function getMapsUrlFromRow(row: RawBusinessRow): string {
  return getField(row, [
    "Google Maps Linki",
    "googleMapsUri",
    "googleMapsUrl",
    "mapsUrl",
    "Maps",
    "map",
  ]);
}

export function createMapsSearchUrl(
  businessName: string,
  location: string,
  district = "",
  city = "",
  existingMapsUrl = "",
): string {
  const trimmedUrl = cleanText(existingMapsUrl);

  if (
    trimmedUrl.startsWith("http") &&
    ![
      "https://maps.google.com",
      "http://maps.google.com",
      "https://maps.google.com/",
    ].includes(trimmedUrl)
  ) {
    return trimmedUrl;
  }

  const query = [businessName, location, district, city]
    .map(cleanText)
    .filter(Boolean)
    .join(" ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function normalizeBusinessFromRow(
  row: RawBusinessRow,
  context: NormalizeContext,
  index = 0,
): BusinessResult {
  const businessName =
    getField(row, [
      "İşletme",
      "İşletme Adı",
      "businessName",
      "name",
      ...googleScrapedColumns.businessName,
    ]) ||
    getFieldByPosition(row, 0) ||
    `Manuel İşletme ${index + 1}`;
  const category =
    cleanCategory(
      getField(row, [
        "Kategori",
        "category",
        ...googleScrapedColumns.category,
      ]) || getFieldByPosition(row, 1),
    ) || context.category;
  const rating = parseRating(
    getField(row, [
      "Puan",
      "rating",
      "Google Puanı",
      ...googleScrapedColumns.rating,
    ]) || getFieldByPosition(row, 2),
  );
  const reviewCount = parseReviewCount(
    getField(row, [
      "Yorum",
      "Yorum Sayısı",
      "reviewCount",
      ...googleScrapedColumns.reviewCount,
    ]) || getFieldByPosition(row, 3),
  );
  const location = normalizeLocation(row, context.district, context.city);
  const website = getField(row, ["Web Sitesi", "website", "web", "websiteUri"]);
  const phone = getField(row, ["Telefon", "phone", "telephone", "nationalPhoneNumber"]);
  const hasWebsite = parseBooleanPresence(website);
  const hasPhone = parseBooleanPresence(phone);
  const priceRange =
    getField(row, ["Fiyat", "priceRange", ...googleScrapedColumns.priceRange]) ||
    getFieldByPosition(row, 4) ||
    undefined;
  const leadScore = calculateLeadScore({
    rating,
    reviewCount,
    hasWebsite,
    hasPhone,
  });
  const cleanBusinessName = cleanText(businessName);

  return {
    businessName: cleanBusinessName,
    category,
    location,
    rating,
    reviewCount,
    hasWebsite,
    hasPhone,
    leadScore,
    mapsUrl: createMapsSearchUrl(
      cleanBusinessName,
      location,
      context.district,
      context.city,
      getMapsUrlFromRow(row),
    ),
    priceRange: priceRange ? cleanText(priceRange) : undefined,
  };
}
