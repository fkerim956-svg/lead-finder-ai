"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SELECTED_INTENT_STORAGE_KEY } from "@/lib/storage-keys";

type Intent = "review-card" | "web-design";

const features = [
  {
    title: "İşletmeleri analiz eder",
    text: "Google Maps verilerinden puan, yorum sayısı, telefon ve web sitesi durumunu değerlendirir.",
  },
  {
    title: "Satış fırsatlarını öne çıkarır",
    text: "Yorum Kart veya Web Tasarım için en uygun işletmeleri skorlayarak önceliklendirir.",
  },
  {
    title: "Takip sürecini kolaylaştırır",
    text: "Favorilere ekleme, not alma, etiketleme ve hazır mesaj oluşturma ile satış sürecini düzenler.",
  },
];

const steps = [
  "Kullanım amacını seç",
  "Konum ve kategori belirle",
  "İşletmeleri analiz et",
  "Favorilere ekle ve iletişime geç",
];

const intentCards: Array<{
  intent: Intent;
  title: string;
  text: string;
  buttonLabel: string;
  accent: string;
}> = [
  {
    intent: "review-card",
    title: "Yorum Kart için işletme bul",
    text: "Google’da puanı düşük, yorumları zayıf veya müşteri güveni eksik görünen işletmeleri tespit edin. Puan ve yorum toplamayı kolaylaştırabileceğiniz en uygun adayları bulun.",
    buttonLabel: "Yorum Kart Modunu Seç",
    accent: "bg-[#FBBF24]",
  },
  {
    intent: "web-design",
    title: "Web Tasarım için işletme bul",
    text: "Web sitesi olmayan, dijital vitrini zayıf, aktif ve ulaşılabilir işletmeleri keşfedin. Web tasarım teklifi sunabileceğiniz potansiyel müşterileri listeleyin.",
    buttonLabel: "Web Tasarım Modunu Seç",
    accent: "bg-[#34D399]",
  },
];

export default function LandingPage() {
  const router = useRouter();

  function handleIntentSelect(intent: Intent) {
    window.localStorage.setItem(SELECTED_INTENT_STORAGE_KEY, intent);
    router.push("/new-analysis");
  }

  return (
    <main className="min-h-screen overflow-x-hidden text-[#1E293B]">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="font-heading text-2xl font-black text-[#1E293B]">
          Lead Finder AI
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          Dashboard
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-12 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-12">
        <div>
          <span className="page-eyebrow">Google Maps odaklı lead analiz aracı</span>
          <h1 className="mt-6 max-w-5xl font-heading text-5xl font-black leading-[0.95] tracking-tight text-[#1E293B] sm:text-6xl lg:text-7xl">
            Google Maps’te satışa hazır işletmeleri saniyeler içinde bulun
          </h1>
          <p className="mt-6 max-w-3xl text-lg font-bold leading-8 text-slate-700">
            Lead Finder AI; Google Maps üzerindeki işletmeleri puan, yorum
            sayısı, web sitesi ve telefon bilgilerine göre analiz eder. Yorum
            Kart satanlar ve web tasarımcıları için satışa uygun potansiyel
            müşteri adaylarını hızlıca listeler.
          </p>
          <p className="mt-5 max-w-2xl text-base font-extrabold leading-7 text-[#1E293B]">
            Manuel işletme aramayı bırakın. Satışa dönüşme ihtimali yüksek
            işletmeleri dakikalar içinde keşfedin.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#intent-selection" className="btn-primary">
              Analize Başla
            </a>
            <Link href="/results" className="btn-secondary">
              Demo Sonuçları Gör
            </Link>
          </div>
        </div>

        <div className="card-pop relative overflow-hidden bg-white p-5 sm:p-6 lg:rotate-1">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-[32px] border-2 border-[#1E293B] bg-[#F472B6] rotate-12" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full border-2 border-[#1E293B] bg-[#FBBF24]" />
          <div className="relative grid gap-4">
            <div className="rounded-[22px] border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
              <p className="text-sm font-black text-slate-600">Örnek analiz</p>
              <h2 className="mt-2 font-heading text-2xl font-black">
                Kadıköy Cafe Lead Listesi
              </h2>
            </div>
            {[
              ["Moda Coffee House", "⭐ 92/100", "Web sitesi yok"],
              ["Urban Bean Studio", "⭐ 86/100", "197 yorum"],
              ["Local Fit Gym", "⭐ 71/100", "Telefon var"],
            ].map(([name, score, detail]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#1E293B] bg-white p-4 shadow-[3px_3px_0_#1E293B]"
              >
                <div>
                  <p className="font-heading text-lg font-black">{name}</p>
                  <p className="text-sm font-bold text-slate-600">{detail}</p>
                </div>
                <span className="badge-pop bg-[#FBBF24]">{score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="intent-selection"
        className="mx-auto w-full max-w-7xl scroll-mt-6 px-5 py-12 sm:px-6 lg:px-8"
      >
        <div className="max-w-3xl">
          <p className="page-eyebrow bg-[#34D399]">Kullanım amacı</p>
          <h2 className="mt-5 font-heading text-4xl font-black tracking-tight sm:text-5xl">
            Ne için işletme arıyorsunuz?
          </h2>
          <p className="muted-text mt-4 text-base font-bold leading-7">
            Kullanım amacınızı seçin. Lead Finder AI sonuçları ve aksiyonları
            buna göre sadeleştirir.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {intentCards.map((card) => (
            <article key={card.intent} className="card-pop p-5 sm:p-6">
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#1E293B] ${card.accent} font-heading text-xl font-black shadow-[3px_3px_0_#1E293B]`}
              >
                {card.intent === "review-card" ? "YK" : "WT"}
              </span>
              <h3 className="mt-5 font-heading text-3xl font-black">
                {card.title}
              </h3>
              <p className="muted-text mt-4 text-base font-bold leading-7">
                {card.text}
              </p>
              <button
                type="button"
                onClick={() => handleIntentSelect(card.intent)}
                className="btn-primary mt-6 w-full sm:w-auto"
              >
                {card.buttonLabel}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <h2 className="font-heading text-4xl font-black tracking-tight sm:text-5xl">
          Lead Finder AI ne yapar?
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="card-pop p-5">
              <h3 className="font-heading text-2xl font-black">
                {feature.title}
              </h3>
              <p className="muted-text mt-4 text-sm font-bold leading-6">
                {feature.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8">
        <div className="card-pop bg-[#F5F3FF] p-5 sm:p-7">
          <h2 className="font-heading text-4xl font-black tracking-tight">
            Nasıl çalışır?
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-[22px] border-2 border-[#1E293B] bg-white p-4 shadow-[3px_3px_0_#1E293B]"
              >
                <span className="badge-pop bg-[#FBBF24]">0{index + 1}</span>
                <p className="mt-4 font-heading text-xl font-black">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:pb-20">
        <div className="card-pop grid gap-6 bg-white p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-heading text-4xl font-black tracking-tight">
              İlk analizini hemen oluştur
            </h2>
            <p className="muted-text mt-4 max-w-2xl text-base font-bold leading-7">
              Google Maps üzerinde manuel arama yapmak yerine potansiyel
              müşterileri birkaç saniyede listele.
            </p>
          </div>
          <a href="#intent-selection" className="btn-primary">
            Başla
          </a>
        </div>
      </section>
    </main>
  );
}
