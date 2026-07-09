type CalculateReviewCardScoreInput = {
  rating: number;
  reviewCount: number;
  hasWebsite: boolean;
  hasPhone: boolean;
};

type ReviewCardBusinessInput = CalculateReviewCardScoreInput & {
  businessName?: string;
  category?: string;
  location?: string;
};

export type ReviewCardSectorType =
  | "food"
  | "gym"
  | "beauty"
  | "health"
  | "real-estate"
  | "retail"
  | "general";

export type ReviewCardMessageType =
  | "short-dm"
  | "professional-whatsapp"
  | "friendly-first-contact";

const sectorKeywords: Record<Exclude<ReviewCardSectorType, "general">, string[]> = {
  food: [
    "cafe",
    "kafe",
    "kahve",
    "restoran",
    "restaurant",
    "lokanta",
    "fast food",
    "doner",
    "döner",
    "pizza",
    "burger",
    "tatlı",
    "tatli",
    "pastane",
    "fırın",
    "firin",
  ],
  gym: ["spor", "spor salonu", "fitness", "gym", "pilates", "yoga"],
  beauty: [
    "kuaför",
    "kuafor",
    "berber",
    "güzellik",
    "guzellik",
    "beauty",
    "bakım",
    "bakim",
    "estetik",
    "nail",
    "tırnak",
    "tirnak",
    "epilasyon",
  ],
  health: [
    "klinik",
    "diş",
    "dis",
    "dentist",
    "doktor",
    "sağlık",
    "saglik",
    "hastane",
    "fizyoterapi",
    "psikolog",
    "veteriner",
  ],
  "real-estate": ["emlak", "gayrimenkul", "real estate", "property"],
  retail: [
    "market",
    "mağaza",
    "magaza",
    "butik",
    "giyim",
    "fashion",
    "ayakkabı",
    "ayakkabi",
    "mobilya",
    "elektronik",
    "çiçek",
    "cicek",
    "çiçekçi",
    "cicekci",
  ],
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

export function getReviewCardSectorType(category: string): ReviewCardSectorType {
  const normalizedCategory = category.toLocaleLowerCase("tr-TR");

  for (const [sector, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some((keyword) => normalizedCategory.includes(keyword))) {
      return sector as ReviewCardSectorType;
    }
  }

  return "general";
}

export function getReviewCardSectorLabel(sector: ReviewCardSectorType): string {
  const labels: Record<ReviewCardSectorType, string> = {
    food: "Cafe / Restoran",
    gym: "Spor Salonu",
    beauty: "Kuaför / Güzellik",
    health: "Klinik / Sağlık",
    "real-estate": "Emlak",
    retail: "Mağaza / Perakende",
    general: "Genel İşletme",
  };

  return labels[sector];
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

export function getReviewCardSectorSalesAngle(
  business: ReviewCardBusinessInput,
): string {
  const sector = getReviewCardSectorType(business.category ?? "");

  const salesAngles: Record<ReviewCardSectorType, string> = {
    food:
      "Cafe ve restoranlarda müşteri trafiği yüksektir. Memnun müşterilerin masadan kalkmadan veya ödeme sonrası Google puanı ve yorumu bırakmasını kolaylaştırmak, işletmenin Google’da daha güvenilir görünmesine yardımcı olur.",
    gym:
      "Spor salonlarında yeni üyeler karar vermeden önce yorumlara ve güven algısına bakar. Memnun üyelerin deneyimlerini Google yorumlarına dönüştürmek, yeni üyelik kararlarını güçlendirebilir.",
    beauty:
      "Kuaför ve güzellik sektöründe insanlar randevu almadan önce yorumları dikkatle inceler. Memnun müşterilerin kolayca puan ve yorum bırakması, işletmenin rakipler arasında daha güvenilir görünmesini sağlar.",
    health:
      "Sağlık ve klinik işletmelerinde güven algısı çok önemlidir. Memnun hastalardan düzenli geri bildirim almak, Google profilinde daha profesyonel ve güven veren bir görünüm oluşturabilir.",
    "real-estate":
      "Emlak sektöründe güven ve referans çok kritiktir. Memnun müşterilerin yorum bırakmasını kolaylaştırmak, yeni müşterilerin danışman seçerken işletmeye daha güvenli yaklaşmasını sağlayabilir.",
    retail:
      "Mağaza ve butiklerde yerel aramalarda güçlü görünmek önemlidir. Mağazaya gelen memnun müşterilerin Google’da puan ve yorum bırakmasını kolaylaştırmak, yeni müşteriler için güven oluşturabilir.",
    general:
      "Bu işletme için Yorum Kart, müşterilerden daha kolay Google puanı ve yorumu toplamak ve Google’da daha güçlü bir güven algısı oluşturmak için kullanılabilir.",
  };

  return salesAngles[sector];
}

export function getReviewCardPlacementSuggestion(
  business: ReviewCardBusinessInput,
): string {
  const sector = getReviewCardSectorType(business.category ?? "");

  const suggestions: Record<ReviewCardSectorType, string> = {
    food: "Masada, kasada veya ödeme sonrası kullanılabilir.",
    gym: "Resepsiyonda veya üyelik çıkışında kullanılabilir.",
    beauty:
      "İşlem sonrası ödeme noktasında veya ayna önü masasında kullanılabilir.",
    health:
      "Danışma bankosunda veya işlem sonrası çıkış noktasında kullanılabilir.",
    "real-estate":
      "Ofiste görüşme sonrası veya müşteri teslim sürecinde kullanılabilir.",
    retail: "Kasa yanında veya alışveriş sonrası kullanılabilir.",
    general: "Kasa, danışma veya müşteri çıkış noktasında kullanılabilir.",
  };

  return suggestions[sector];
}

export function getReviewCardMessageTypeLabel(
  type: ReviewCardMessageType,
): string {
  const labels: Record<ReviewCardMessageType, string> = {
    "short-dm": "Kısa Instagram DM",
    "professional-whatsapp": "Profesyonel WhatsApp Mesajı",
    "friendly-first-contact": "Samimi İlk Temas Mesajı",
  };

  return labels[type];
}

export function generateReviewCardMessage(
  business: ReviewCardBusinessInput,
  type: ReviewCardMessageType,
): string {
  const businessName = business.businessName ?? "Merhaba";
  const score = calculateReviewCardScore(business);
  const sector = getReviewCardSectorType(business.category ?? "");
  const sectorPhrase = getSectorMessagePhrase(sector);
  const reviewContext = getReviewContext(business);

  if (type === "short-dm") {
    return `Merhaba ${businessName}, Google işletme profilinizi inceledim. ${reviewContext} ${sectorPhrase.short} Müşterilerinizin NFC Yorum Kart ile Google puan/yorum ekranınıza kolayca ulaşmasını sağlayan basit bir sistem sunuyoruz. İsterseniz kısa bilgi gönderebilirim.`;
  }

  if (type === "professional-whatsapp") {
    return `Merhaba, ${businessName} Google profilinizi incelediğimde puan ve yorum tarafında geliştirilebilecek bir fırsat olduğunu gördüm. ${reviewContext}

NFC Yorum Kart sistemiyle müşterileriniz kartı okutarak doğrudan Google puan/yorum ekranınıza ulaşabilir. Bu süreç, memnun müşterilerden daha düzenli geri bildirim almanızı kolaylaştırır. ${sectorPhrase.professional}

Lead Finder AI analizinde işletmeniz ${score}/100 Yorum Kart aday skoru aldı (${getReviewCardRiskLevel(score)}). Uygun görürseniz nasıl çalıştığını kısaca paylaşabilirim.`;
  }

  return `Merhaba ${businessName}, küçük bir öneri için yazıyorum. ${sectorPhrase.friendly} İşletmenize gelen memnun müşterilerin Google’da yorum bırakması çoğu zaman unutuluyor.

NFC Yorum Kart ile müşteriler kartı okutup doğrudan Google puan/yorum ekranınıza ulaşabiliyor. Bu, puan ve yorum toplama sürecini kolaylaştırır; herhangi bir sonucu garanti etmez ama doğru müşteriden geri bildirim istemeyi daha pratik hale getirir. İsterseniz nasıl çalıştığını kısaca anlatabilirim.`;
}

function getReviewContext(business: ReviewCardBusinessInput): string {
  if (business.rating > 0 && business.reviewCount > 0) {
    return `${business.rating.toFixed(1)} puan ve ${business.reviewCount} yorum görünürlüğünüz için önemli bir sinyal oluşturuyor.`;
  }

  if (business.rating > 0) {
    return `${business.rating.toFixed(1)} Google puanı görünüyor; düzenli yorum toplama bu görünümü destekleyebilir.`;
  }

  if (business.reviewCount > 0) {
    return `${business.reviewCount} yorum görünür durumda; memnun müşterilerden düzenli geri bildirim almak profilinizi güçlendirebilir.`;
  }

  return "Google yorum ve puan tarafı müşteri güveni için önemli bir alan.";
}

function getSectorMessagePhrase(sector: ReviewCardSectorType): {
  short: string;
  professional: string;
  friendly: string;
} {
  const phrases: Record<
    ReviewCardSectorType,
    { short: string; professional: string; friendly: string }
  > = {
    food: {
      short:
        "Cafe/restoranlarda memnun müşterinin masadan kalkmadan veya ödeme sonrası yorum bırakması çok değerli.",
      professional:
        "Özellikle masa ve ödeme noktalarında bu kartın görünür olması, günlük müşteri trafiğini daha düzenli Google geri bildirimine dönüştürmeye yardımcı olur.",
      friendly:
        "Cafe ve restoranlarda memnun müşteri genelde hızlıca çıkar; yorum istemek için en doğru an masa veya ödeme sonrası olabiliyor.",
    },
    gym: {
      short:
        "Spor salonlarında yeni üyeler karar vermeden önce mevcut üyelerin yorumlarına bakıyor.",
      professional:
        "Memnun üyelerin deneyimini Google yorumuna dönüştürmek, yeni üyelik düşünen kişilerde güven algısını güçlendirebilir.",
      friendly:
        "Spor salonlarında mutlu üyelerin deneyimi yeni üyelik kararları için güçlü bir güven sinyali oluyor.",
    },
    beauty: {
      short:
        "Kuaför ve güzellik hizmetlerinde insanlar randevu almadan önce yorumlara özellikle dikkat ediyor.",
      professional:
        "Randevu sonrası memnun müşterinin kolayca yorum bırakması, işletmenin rakipler arasında daha güvenilir görünmesine katkı sağlayabilir.",
      friendly:
        "Kuaför ve güzellik tarafında iyi yorumlar, yeni müşterinin randevu kararını ciddi şekilde etkiliyor.",
    },
    health: {
      short:
        "Klinik ve sağlık hizmetlerinde güven algısı, Google yorumlarıyla doğrudan destekleniyor.",
      professional:
        "Memnun hastalardan düzenli geri bildirim almak, Google profilinde daha profesyonel ve güven veren bir görünüm oluşturabilir.",
      friendly:
        "Sağlık ve klinik tarafında insanlar karar vermeden önce güven veren yorumlara çok dikkat ediyor.",
    },
    "real-estate": {
      short:
        "Emlak tarafında referans ve güven, yeni müşterinin danışman seçimini doğrudan etkiliyor.",
      professional:
        "Memnun müşterilerden gelen Google yorumları, yerel bölgede danışmanlık güvenini ve referans algısını destekleyebilir.",
      friendly:
        "Emlakta insanlar çoğu zaman referansa bakarak karar veriyor; Google yorumları bu güveni görünür hale getiriyor.",
    },
    retail: {
      short:
        "Mağaza ve butiklerde yerel aramalarda güven veren yorumlar yeni müşteri kararını etkiliyor.",
      professional:
        "Mağazaya gelen memnun müşterilerin Google’da puan ve yorum bırakmasını kolaylaştırmak, yerel arama görünürlüğünü ve müşteri güvenini destekleyebilir.",
      friendly:
        "Mağazaya gelen memnun müşterilerin yorum bırakması, çevrede arama yapan yeni müşteriler için güçlü bir güven işareti oluyor.",
    },
    general: {
      short:
        "Memnun müşterilerin daha kolay Google puanı ve yorumu bırakması işletme güvenini destekleyebilir.",
      professional:
        "Yorum isteme sürecini daha pratik hale getirmek, Google profilinde daha düzenli geri bildirim toplanmasına yardımcı olur.",
      friendly:
        "Memnun müşteriden yorum istemek çoğu zaman unutuluyor; bunu kolaylaştırmak Google görünümünü destekleyebilir.",
    },
  };

  return phrases[sector];
}
