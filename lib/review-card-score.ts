type CalculateReviewCardScoreInput = {
  rating: number;
  reviewCount: number;
  hasWebsite: boolean;
  hasPhone: boolean;
};

export function calculateReviewCardScore({
  rating,
  reviewCount,
  hasWebsite,
  hasPhone,
}: CalculateReviewCardScoreInput): number {
  let score = 0;

  if (rating < 4) {
    score += 35;
  } else if (rating <= 4.3) {
    score += 25;
  }

  if (reviewCount > 100) {
    score += 25;
  } else if (reviewCount >= 30) {
    score += 15;
  }

  if (hasPhone) {
    score += 10;
  }

  if (!hasWebsite) {
    score += 10;
  }

  return Math.min(score, 100);
}

export function getReviewCardFitLabel(score: number): string {
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
