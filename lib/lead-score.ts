type CalculateLeadScoreInput = {
  rating: number;
  reviewCount: number;
  hasWebsite: boolean;
  hasPhone: boolean;
};

export function calculateLeadScore({
  rating,
  reviewCount,
  hasWebsite,
  hasPhone,
}: CalculateLeadScoreInput): number {
  let score = 0;

  if (rating < 4) {
    score += 40;
  } else if (rating <= 4.2) {
    score += 25;
  }

  if (!hasWebsite) {
    score += 20;
  }

  if (hasPhone) {
    score += 10;
  }

  if (reviewCount > 100) {
    score += 20;
  } else if (reviewCount >= 50) {
    score += 10;
  }

  return Math.min(score, 100);
}
