type CalculateReviewCardScoreInput = {
  rating: number;
  reviewCount: number;
  hasWebsite: boolean;
  hasPhone: boolean;
};

type ReviewCardBusinessInput = CalculateReviewCardScoreInput & {
  category?: string;
  location?: string;
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

export function getReviewCardRiskLevel(score: number): string {
  if (score >= 85) {
    return "Çok güçlü aday";
  }

  if (score >= 70) {
    return "Güçlü aday";
  }

  if (score >= 50) {
    return "Orta aday";
  }

  return "Zayıf aday";
}

export function getReviewCardCandidateReasons(
  business: ReviewCardBusinessInput,
): string[] {
  const reasons: string[] = [];

  if (business.rating === 0) {
    reasons.push(
      "Google puanı verisi eksik; işletmenin Google görünürlüğü ayrıca kontrol edilmeli.",
    );
  } else if (business.rating < 4.0) {
    reasons.push(
      "Google puanı düşük olduğu için müşteri güvenini artırmaya ihtiyaç duyuyor.",
    );
  } else if (business.rating < 4.3) {
    reasons.push(
      "Google puanı orta seviyede; daha fazla olumlu puan ve yorumla daha güçlü görünebilir.",
    );
  }

  if (business.reviewCount === 0) {
    reasons.push(
      "Yorum verisi eksik; işletmenin Google yorum durumu manuel kontrol edilmeli.",
    );
  } else if (business.reviewCount < 30) {
    reasons.push(
      "Yorum sayısı düşük; müşterilerden düzenli yorum toplaması işletmenin görünürlüğünü artırabilir.",
    );
  } else if (business.reviewCount < 100) {
    reasons.push(
      "Yorum sayısı gelişmeye açık; Yorum Kart ile daha düzenli geri bildirim toplayabilir.",
    );
  } else {
    reasons.push(
      "Yorum sayısı yüksek olduğu için aktif müşteri trafiği var; bu trafik puan ve yorum toplamaya dönüştürülebilir.",
    );
  }

  if (business.hasPhone) {
    reasons.push("Telefon bilgisi bulunduğu için işletmeye ulaşmak daha kolay.");
  }

  if (!business.hasWebsite) {
    reasons.push(
      "Web sitesi görünmüyor; Google profilindeki puan ve yorumlar müşteri güveni için daha kritik hale geliyor.",
    );
  }

  if (business.category) {
    reasons.push(
      `${business.category} kategorisi müşteri deneyimi ve sosyal kanıtın satın alma kararında etkili olduğu bir alan olabilir.`,
    );
  }

  return reasons.slice(0, 6);
}

export function getReviewCardSalesAngle(
  business: ReviewCardBusinessInput,
): string {
  if (business.rating > 0 && business.rating < 4.0 && business.reviewCount >= 100) {
    return "Bu işletmeye yaklaşırken, mevcut müşteri trafiğini daha fazla olumlu puan ve yoruma dönüştürme fikri öne çıkarılmalı.";
  }

  if (business.reviewCount < 30) {
    return "Bu işletmeye yaklaşırken, müşterilerden yorum istemeyi kolaylaştıran pratik NFC kart sistemi vurgulanmalı.";
  }

  if (!business.hasWebsite) {
    return "Web sitesi olmadığı için Google profilindeki güven algısının daha önemli olduğu anlatılmalı.";
  }

  return "Bu işletmeye, Google’da daha güçlü görünmek ve müşterilerden daha kolay puan/yorum toplamak üzerinden yaklaşılabilir.";
}
