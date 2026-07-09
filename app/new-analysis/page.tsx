"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { businessCategories } from "@/lib/business-categories";
import {
  LATEST_ANALYSIS_STORAGE_KEY,
  SELECTED_INTENT_STORAGE_KEY,
} from "@/lib/storage-keys";
import { districtsByProvince, provinces } from "@/lib/turkey-locations";
import type { LatestAnalysis } from "@/types/business";

type SelectedIntent = "review-card" | "web-design";

function getSelectedIntent(): SelectedIntent {
  if (typeof window === "undefined") {
    return "review-card";
  }

  return window.localStorage.getItem(SELECTED_INTENT_STORAGE_KEY) ===
    "web-design"
    ? "web-design"
    : "review-card";
}

export default function NewAnalysisPage() {
  const router = useRouter();
  const [selectedIntent] = useState<SelectedIntent>(getSelectedIntent);
  const [country] = useState("Türkiye");
  const [city, setCity] = useState("İstanbul");
  const [district, setDistrict] = useState("Kadıköy");
  const [category, setCategory] = useState("Cafe");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const availableDistricts = districtsByProvince[city] ?? [];
  const intentContent =
    selectedIntent === "web-design"
      ? {
          label: "Web Tasarım",
          title: "Web Tasarım için işletme analizi",
          subtitle:
            "Web sitesi olmayan, dijital vitrini zayıf ve ulaşılabilir işletmeleri bul.",
        }
      : {
          label: "Yorum Kart",
          title: "Yorum Kart için işletme analizi",
          subtitle:
            "Google’da puanı düşük, yorumları zayıf veya müşteri güveni eksik görünen işletmeleri bul.",
        };

  function handleCityChange(selectedCity: string) {
    const nextDistricts = districtsByProvince[selectedCity] ?? [];

    setCity(selectedCity);
    setDistrict(nextDistricts[0] ?? "");
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const trimmedCountry = country.trim();
    const trimmedCity = city.trim();
    const trimmedDistrict = district.trim();
    const trimmedCategory = category.trim();

    if (!trimmedCountry || !trimmedCity || !trimmedDistrict || !trimmedCategory) {
      setErrorMessage(
        "Lütfen ülke, şehir, ilçe ve kategori alanlarını doldurun.",
      );
      return;
    }

    setIsLoading(true);

    try {
      const [response] = await Promise.all([
        fetch("/api/business-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            country: trimmedCountry,
            city: trimmedCity,
            district: trimmedDistrict,
            category: trimmedCategory,
          }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 1000)),
      ]);

      if (!response.ok) {
        throw new Error("Analiz oluşturulamadı.");
      }

      const latestAnalysis = (await response.json()) as LatestAnalysis;

      window.localStorage.setItem(
        LATEST_ANALYSIS_STORAGE_KEY,
        JSON.stringify(latestAnalysis),
      );

      router.push("/results");
    } catch {
      setErrorMessage("Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-6 lg:py-10">
        <header className="relative grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <p className="page-eyebrow">{intentContent.label} Modu</p>
            <h1 className="page-title mt-5">{intentContent.title}</h1>
            <p className="muted-text mt-4 max-w-2xl text-base font-medium leading-7">
              {intentContent.subtitle}
            </p>
          </div>
          <Link href="/" className="btn-secondary w-fit">
            Modu Değiştir
          </Link>
        </header>

        <form onSubmit={handleAnalyze} className="card-pop grid gap-5 p-5 md:grid-cols-2">
          <SelectField label="Ülke">
            <select value={country} disabled className="input-pop">
              <option value="Türkiye">Türkiye</option>
            </select>
          </SelectField>

          <SelectField label="Şehir">
            <select
              value={city}
              onChange={(event) => handleCityChange(event.target.value)}
              className="input-pop"
            >
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </SelectField>

          <SelectField label="İlçe">
            <select
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              disabled={availableDistricts.length === 0}
              className="input-pop"
            >
              {availableDistricts.length > 0 ? (
                availableDistricts.map((provinceDistrict) => (
                  <option key={provinceDistrict} value={provinceDistrict}>
                    {provinceDistrict}
                  </option>
                ))
              ) : (
                <option value="">İlçe verisi yakında eklenecek</option>
              )}
            </select>
          </SelectField>

          <SelectField label="Kategori">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="input-pop"
            >
              {businessCategories.map((businessCategory) => (
                <option key={businessCategory} value={businessCategory}>
                  {businessCategory}
                </option>
              ))}
            </select>
          </SelectField>

          <div className="md:col-span-2">
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? "Analiz ediliyor..." : "Analiz Et"}
            </button>
          </div>
        </form>

        {errorMessage ? (
          <section className="card-pop border-[#B91C1C] bg-[#FFE4E6] p-4">
            <p className="text-sm font-extrabold text-[#7F1D1D]">{errorMessage}</p>
          </section>
        ) : null}

        {isLoading ? (
          <section className="card-pop bg-[#F5F3FF] p-6">
            <p className="text-sm font-extrabold text-[#1E293B]">
              Test işletme listesi hazırlanıyor...
            </p>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function SelectField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-black text-[#1E293B]">{label}</span>
      {children}
    </label>
  );
}
