"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { calculateLeadScore } from "@/lib/lead-score";
import { businessCategories } from "@/lib/business-categories";
import { saveAnalysisToHistory } from "@/lib/analysis-history";
import { SELECTED_INTENT_STORAGE_KEY } from "@/lib/storage-keys";
import { districtsByProvince, provinces } from "@/lib/turkey-locations";
import type { BusinessResult, LatestAnalysis, SelectedIntent } from "@/types/business";

type ManualRow = Record<string, unknown>;

function getSelectedIntent(): SelectedIntent {
  if (typeof window === "undefined") {
    return "review-card";
  }

  return window.localStorage.getItem(SELECTED_INTENT_STORAGE_KEY) ===
    "web-design"
    ? "web-design"
    : "review-card";
}

function normalizeHeader(header: string): string {
  return header
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]/g, "");
}

function getField(row: ManualRow, names: string[]): string {
  const normalizedNames = names.map(normalizeHeader);
  const matchedKey = Object.keys(row).find((key) =>
    normalizedNames.includes(normalizeHeader(key)),
  );

  const value = matchedKey ? row[matchedKey] : "";

  return value == null ? "" : String(value).trim();
}

function parseNumber(value: string): number {
  const parsedValue = Number(value.replace(",", ".").replace(/[^\d.-]/g, ""));

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function parseBooleanFromPresence(value: string): boolean {
  if (!value) {
    return false;
  }

  const normalizedValue = normalizeHeader(value);

  return !["yok", "hayir", "no", "false", "0"].includes(normalizedValue);
}

function parseCsvRows(csvText: string): ManualRow[] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let isInsideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index];
    const nextCharacter = csvText[index + 1];

    if (character === "\"" && nextCharacter === "\"") {
      currentCell += "\"";
      index += 1;
    } else if (character === "\"") {
      isInsideQuotes = !isInsideQuotes;
    } else if (character === "," && !isInsideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((character === "\n" || character === "\r") && !isInsideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell.trim());
      if (currentRow.some(Boolean)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += character;
    }
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some(Boolean)) {
    rows.push(currentRow);
  }

  const [headers, ...dataRows] = rows;

  if (!headers) {
    return [];
  }

  return dataRows.map((row) =>
    headers.reduce<ManualRow>((accumulator, header, index) => {
      accumulator[header] = row[index] ?? "";
      return accumulator;
    }, {}),
  );
}

function parseManualRows(rawText: string): ManualRow[] {
  const trimmedText = rawText.trim();

  if (!trimmedText) {
    return [];
  }

  if (trimmedText.startsWith("[") || trimmedText.startsWith("{")) {
    const parsedJson = JSON.parse(trimmedText) as unknown;

    if (Array.isArray(parsedJson)) {
      return parsedJson.filter(
        (item): item is ManualRow =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      );
    }

    if (
      typeof parsedJson === "object" &&
      parsedJson !== null &&
      "businesses" in parsedJson &&
      Array.isArray((parsedJson as { businesses: unknown }).businesses)
    ) {
      return (parsedJson as { businesses: unknown[] }).businesses.filter(
        (item): item is ManualRow =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      );
    }

    throw new Error("JSON içinde işletme listesi bulunamadı.");
  }

  return parseCsvRows(trimmedText);
}

function mapRowsToBusinesses(
  rows: ManualRow[],
  fallback: {
    city: string;
    district: string;
    category: string;
  },
): BusinessResult[] {
  return rows
    .map((row, index) => {
      const businessName =
        getField(row, ["İşletme", "İşletme Adı", "businessName", "name"]) ||
        `Manuel İşletme ${index + 1}`;
      const category =
        getField(row, ["Kategori", "category"]) || fallback.category;
      const rating = parseNumber(getField(row, ["Puan", "rating", "Google Puanı"]));
      const reviewCount = Math.round(
        parseNumber(getField(row, ["Yorum", "Yorum Sayısı", "reviewCount"])),
      );
      const location =
        getField(row, ["Adres", "Konum", "location", "address"]) ||
        `${fallback.city} / ${fallback.district}`;
      const website = getField(row, ["Web Sitesi", "website", "web"]);
      const phone = getField(row, ["Telefon", "phone", "telephone"]);
      const hasWebsite = parseBooleanFromPresence(website);
      const hasPhone = parseBooleanFromPresence(phone);
      const mapsUrl = getField(row, ["Google Maps Linki", "mapsUrl", "Maps"]) ||
        "https://maps.google.com";
      const leadScore = calculateLeadScore({
        rating,
        reviewCount,
        hasWebsite,
        hasPhone,
      });

      return {
        businessName,
        category,
        location,
        rating,
        reviewCount,
        hasWebsite,
        hasPhone,
        leadScore,
        mapsUrl,
      };
    })
    .filter((business) => business.businessName.trim().length > 0);
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
  const [manualData, setManualData] = useState("");
  const [manualImportMessage, setManualImportMessage] = useState("");
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

  function getAnalysisDefaults() {
    return {
      country: country.trim() || "Türkiye",
      city: city.trim() || "İstanbul",
      district: district.trim() || "Üsküdar",
      category: category.trim() || "Manuel Veri",
    };
  }

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setManualImportMessage("");

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

      saveAnalysisToHistory({
        ...latestAnalysis,
        selectedIntent,
      });

      router.push("/results");
    } catch {
      setErrorMessage("Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }

  function saveManualImport(rawText: string) {
    setErrorMessage("");
    setManualImportMessage("");

    try {
      const defaults = getAnalysisDefaults();
      const rows = parseManualRows(rawText);
      const businesses = mapRowsToBusinesses(rows, defaults);

      if (businesses.length === 0) {
        setErrorMessage("Yüklenecek işletme verisi bulunamadı.");
        return;
      }

      saveAnalysisToHistory({
        ...defaults,
        category: defaults.category || "Manuel Veri",
        createdAt: new Date().toISOString(),
        selectedIntent,
        businesses,
      });

      setManualImportMessage(`${businesses.length} işletme başarıyla kaydedildi.`);
      router.push("/results");
    } catch {
      setErrorMessage(
        "Manuel veri okunamadı. Lütfen JSON veya başlıklı CSV formatını kontrol edin.",
      );
    }
  }

  async function handleManualFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    setManualData(text);
    saveManualImport(text);
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

        <section className="card-pop grid gap-5 p-5">
          <div>
            <h2 className="font-heading text-2xl font-black text-[#1E293B]">
              Manuel Veri Yükle
            </h2>
            <p className="muted-text mt-2 max-w-3xl text-sm font-bold leading-6">
              Google API bağlanmadan önce kendi topladığınız CSV veya JSON
              verileriyle sistemi test edebilirsiniz.
            </p>
          </div>

          <textarea
            value={manualData}
            onChange={(event) => setManualData(event.target.value)}
            placeholder="CSV veya JSON verinizi buraya yapıştırın"
            className="input-pop min-h-40 leading-6"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="btn-secondary cursor-pointer">
              CSV / JSON Dosyası Seç
              <input
                type="file"
                accept=".csv,.json,text/csv,application/json"
                onChange={handleManualFileUpload}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={() => saveManualImport(manualData)}
              className="btn-primary"
            >
              Manuel Veriyi Kaydet
            </button>
          </div>
          {manualImportMessage ? (
            <p className="w-fit rounded-full border-2 border-[#1E293B] bg-[#34D399] px-3 py-1 text-sm font-black text-[#1E293B]">
              {manualImportMessage}
            </p>
          ) : null}
        </section>

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
