import type { BusinessResult } from "@/types/business";

export function calculateWebDesignScore(
  business: Pick<
    BusinessResult,
    "rating" | "reviewCount" | "hasWebsite" | "hasPhone"
  >,
): number {
  let score = 0;

  if (!business.hasWebsite) {
    score += 45;
  }

  if (business.hasPhone) {
    score += 20;
  }

  if (business.reviewCount >= 100) {
    score += 20;
  } else if (business.reviewCount >= 30) {
    score += 12;
  }

  if (business.rating >= 4.0) {
    score += 10;
  } else if (business.rating >= 3.5) {
    score += 6;
  }

  return Math.min(score, 100);
}

export function getWebDesignFitLabel(score: number): string {
  if (score >= 85) {
    return "Çok uygun";
  }

  if (score >= 70) {
    return "Uygun";
  }

  if (score >= 50) {
    return "Orta";
  }

  return "Zayıf";
}
