"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SELECTED_INTENT_STORAGE_KEY } from "@/lib/storage-keys";

type Intent = "review-card" | "web-design";

const workflowSteps = [
  "Veri yükle veya analiz oluştur",
  "İşletmeleri moda özel skorla sırala",
  "Favorilere ekle ve satış sürecini takip et",
];

const realFeatures = [
  "CSV/JSON yükleme",
  "Çoklu dosya desteği",
  "Analiz geçmişi",
  "Yorum Kart Skoru",
  "Web Tasarım Skoru",
  "Favoriler",
  "Abone takibi",
  "Google Maps erişimi",
  "Muhasebe",
  "NFC stok yönetimi",
  "Tahsilat takibi",
];

export default function LandingPage() {
  const router = useRouter();

  function handleIntentSelect(intent: Intent) {
    window.localStorage.setItem(SELECTED_INTENT_STORAGE_KEY, intent);
    router.push("/new-analysis");
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-[#F8FAFC] text-[#0F172A]">
      <header className="sticky top-0 z-20 border-b border-[#E2E8F0] bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <span
              className="h-9 w-9 shrink-0 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF]"
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block truncate font-heading text-base font-semibold tracking-tight text-[#0F172A] sm:text-lg">
                Lead Finder AI
              </span>
              <span className="block truncate text-xs font-medium text-[#64748B]">
                İşletme analiz ve takip aracı
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => handleIntentSelect("review-card")}
            className="btn-primary shrink-0"
          >
            Analize Başla
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_42%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 sm:px-6 md:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <p className="badge-info">Google Maps odaklı işletme analizi</p>
            <h1 className="mt-5 max-w-4xl font-heading text-[2.25rem] font-semibold leading-[1.08] tracking-tight text-[#0F172A] sm:text-5xl lg:text-[3.25rem]">
              Satış potansiyeli olan işletmeleri daha hızlı bulun.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#475569] sm:text-lg">
              İşletme verilerini analiz edin, Yorum Kart ve web tasarım için
              öncelikli müşterileri belirleyin.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleIntentSelect("review-card")}
                className="btn-primary"
              >
                Analize Başla
              </button>
              <Link href="/dashboard" className="btn-secondary">
                Dashboard&apos;a Git
              </Link>
            </div>
          </div>

          <aside className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#0F172A]">
              Lead Finder AI ile takip edebilecekleriniz
            </p>
            <div className="mt-4 grid gap-3">
              {[
                ["Analiz geçmişi", "Raporları kaydedin ve tekrar açın."],
                ["Favori listesi", "Görüşmek istediğiniz işletmeleri ayırın."],
                ["Abone ve muhasebe", "Yorum Kart abonelerini ve tahsilatları izleyin."],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                >
                  <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">{text}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <UseCaseCard
            title="Yorum Kart"
            description="Google puanı ve yorum sayısına göre Yorum Kart için öncelikli işletmeleri belirleyin."
            badgeClass="badge-review"
            borderClass="border-l-[#7C3AED]"
            features={[
              "Yorum Kart Skoru",
              "Favori işletme takibi",
              "Abone yönetimi",
              "Google Maps erişimi",
            ]}
            actionLabel="Yorum Kart Analizi"
            onSelect={() => handleIntentSelect("review-card")}
          />
          <UseCaseCard
            title="Web Tasarım"
            description="Web sitesi olmayan veya geliştirme potansiyeli bulunan işletmeleri belirleyin."
            badgeClass="badge-web"
            borderClass="border-l-[#0891B2]"
            features={[
              "Web Tasarım Skoru",
              "Web sitesi durumu",
              "Favori işletme takibi",
              "Google Maps erişimi",
            ]}
            actionLabel="Web Tasarım Analizi"
            onSelect={() => handleIntentSelect("web-design")}
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="max-w-2xl">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#0F172A]">
              Nasıl çalışır?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Manuel veri veya demo analiz akışını kullanarak rapor oluşturun,
              sonra işletmeleri seçtiğiniz kullanım amacına göre takip edin.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article
                key={step}
                className="rounded-lg border border-[#E2E8F0] bg-white p-4"
              >
                <span className="badge-info">0{index + 1}</span>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#0F172A]">
                  {step}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-[#0F172A]">
            Uygulamada bulunan özellikler
          </h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {realFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm font-medium text-[#334155]"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-[#2563EB]"
                  aria-hidden="true"
                />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-8 border-t border-[#E2E8F0] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <p className="font-heading text-base font-semibold text-[#0F172A]">
              Lead Finder AI
            </p>
            <p className="mt-1 text-sm text-[#64748B]">
              İşletme analizi, favori takibi, abonelik ve muhasebe yönetimi.
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary w-fit">
            Uygulamaya Git
          </Link>
        </div>
      </footer>
    </main>
  );
}

function UseCaseCard({
  title,
  description,
  badgeClass,
  borderClass,
  features,
  actionLabel,
  onSelect,
}: {
  title: string;
  description: string;
  badgeClass: string;
  borderClass: string;
  features: string[];
  actionLabel: string;
  onSelect: () => void;
}) {
  return (
    <article
      className={`rounded-xl border border-l-4 border-[#E2E8F0] bg-white p-5 shadow-sm ${borderClass}`}
    >
      <span className={badgeClass}>{title}</span>
      <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-[#0F172A]">
        {title} için işletme bulun
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#64748B]">{description}</p>
      <ul className="mt-5 grid gap-2">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
              aria-hidden="true"
            />
            {feature}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onSelect} className="btn-primary mt-6">
        {actionLabel}
      </button>
    </article>
  );
}
