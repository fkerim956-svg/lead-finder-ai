"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { saveAnalysisToHistory } from "@/lib/analysis-history";
import { businessCategories } from "@/lib/business-categories";
import {
  cleanText,
  normalizeBusinessFromRow,
  type RawBusinessRow,
} from "@/lib/business-normalization";
import { SELECTED_INTENT_STORAGE_KEY } from "@/lib/storage-keys";
import { districtsByProvince, provinces } from "@/lib/turkey-locations";
import type { BusinessResult, LatestAnalysis, SelectedIntent } from "@/types/business";

function getSelectedIntent(): SelectedIntent {
  if (typeof window === "undefined") {
    return "review-card";
  }

  return window.localStorage.getItem(SELECTED_INTENT_STORAGE_KEY) ===
    "web-design"
    ? "web-design"
    : "review-card";
}

function detectCsvDelimiter(csvText: string): "," | ";" | "\t" {
  const firstLine = csvText.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiters = [",", ";", "\t"] as const;

  return delimiters.toSorted(
    (first, second) =>
      firstLine.split(second).length - firstLine.split(first).length,
  )[0];
}

function alignCsvRowWithHeaders(row: string[], headers: string[]): string[] {
  const alignedRow = [...row];

  while (alignedRow.length > headers.length) {
    const ratingPartIndex = alignedRow.findIndex((cell, index) => {
      const nextCell = alignedRow[index + 1];

      return /^\d$/.test(cell) && /^\d{1,2}$/.test(nextCell ?? "");
    });

    if (ratingPartIndex === -1) {
      break;
    }

    alignedRow.splice(
      ratingPartIndex,
      2,
      `${alignedRow[ratingPartIndex]},${alignedRow[ratingPartIndex + 1]}`,
    );
  }

  return alignedRow;
}

function parseCsvRows(csvText: string): RawBusinessRow[] {
  const delimiter = detectCsvDelimiter(csvText);
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
    } else if (character === delimiter && !isInsideQuotes) {
      currentRow.push(cleanText(currentCell));
      currentCell = "";
    } else if ((character === "\n" || character === "\r") && !isInsideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(cleanText(currentCell));
      if (currentRow.some(Boolean)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += character;
    }
  }

  currentRow.push(cleanText(currentCell));
  if (currentRow.some(Boolean)) {
    rows.push(currentRow);
  }

  const [headers, ...dataRows] = rows;

  if (!headers || dataRows.length === 0) {
    return [];
  }

  return dataRows.map((row) => {
    const alignedRow = alignCsvRowWithHeaders(row, headers);

    return headers.reduce<RawBusinessRow>((accumulator, header, index) => {
      accumulator[header || `column_${index}`] = alignedRow[index] ?? "";
      return accumulator;
    }, {});
  });
}

function parseManualRows(rawText: string): RawBusinessRow[] {
  const trimmedText = rawText.trim();

  if (!trimmedText) {
    return [];
  }

  if (trimmedText.startsWith("[") || trimmedText.startsWith("{")) {
    const parsedJson = JSON.parse(trimmedText) as unknown;

    if (Array.isArray(parsedJson)) {
      return parsedJson.filter(
        (item): item is RawBusinessRow =>
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
        (item): item is RawBusinessRow =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      );
    }

    throw new Error("JSON içinde işletme listesi bulunamadı.");
  }

  return parseCsvRows(trimmedText);
}

function dedupeBusinesses(businesses: BusinessResult[]): BusinessResult[] {
  const seenKeys = new Set<string>();

  return businesses.filter((business) => {
    const key = `${business.businessName.toLocaleLowerCase("tr-TR")}::${business.location.toLocaleLowerCase("tr-TR")}`;

    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

export default function NewAnalysisPage() {
  const router = useRouter();
  const [selectedIntent] = useState<SelectedIntent>(getSelectedIntent);
  const [country] = useState("Türkiye");
  const [city, setCity] = useState("İstanbul");
  const [district, setDistrict] = useState("Kadıköy");
  const [category, setCategory] = useState("Cafe");
  const [analysisName, setAnalysisName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [manualData, setManualData] = useState("");
  const [manualImportMessage, setManualImportMessage] = useState("");
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [parsedBusinesses, setParsedBusinesses] = useState<BusinessResult[]>([]);
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

  function getAnalysisDefaults() {
    return {
      country: country.trim() || "Türkiye",
      city: city.trim() || "İstanbul",
      district: district.trim() || "Üsküdar",
      category: category.trim() || "Manuel Veri",
    };
  }

  function getFinalAnalysisName(nextDistrict: string, nextCategory: string) {
    return analysisName.trim() || `${nextDistrict} ${nextCategory}`;
  }

  function rowsToBusinesses(rows: RawBusinessRow[]) {
    const defaults = getAnalysisDefaults();

    return dedupeBusinesses(
      rows
        .map((row, index) =>
          normalizeBusinessFromRow(
            row,
            {
              city: defaults.city,
              district: defaults.district,
              category: defaults.category,
            },
            index,
          ),
        )
        .filter((business) => business.businessName.trim().length > 0),
    );
  }

  function parseAndPreviewManualData(rawText: string): BusinessResult[] {
    const rows = parseManualRows(rawText);
    const businesses = rowsToBusinesses(rows);

    setParsedBusinesses(businesses);
    setManualImportMessage(
      businesses.length > 0 ? `${businesses.length} işletme okundu.` : "",
    );

    return businesses;
  }

  function handleCityChange(selectedCity: string) {
    const nextDistricts = districtsByProvince[selectedCity] ?? [];

    setCity(selectedCity);
    setDistrict(nextDistricts[0] ?? "");
  }

  function saveBusinessesAsManualAnalysis(businesses: BusinessResult[]) {
    const defaults = getAnalysisDefaults();

    saveAnalysisToHistory({
      ...defaults,
      analysisName: getFinalAnalysisName(defaults.district, defaults.category),
      category: defaults.category || "Manuel Veri",
      createdAt: new Date().toISOString(),
      selectedIntent,
      businesses,
    });

    router.push("/results");
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
        analysisName: getFinalAnalysisName(
          latestAnalysis.district,
          latestAnalysis.category,
        ),
        selectedIntent,
      });

      router.push("/results");
    } catch {
      setErrorMessage("Analiz sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }

  function saveManualImport(event?: Pick<Event, "preventDefault">) {
    event?.preventDefault();
    setErrorMessage("");

    try {
      const businesses =
        parsedBusinesses.length > 0
          ? parsedBusinesses
          : parseAndPreviewManualData(manualData);

      if (businesses.length === 0) {
        setErrorMessage(
          "Geçerli işletme bulunamadı. Dosya başlıklarını veya içerikleri kontrol edin.",
        );
        return;
      }

      saveBusinessesAsManualAnalysis(businesses);
    } catch {
      setErrorMessage("Dosya okunamadı. CSV formatını kontrol edin.");
    }
  }

  async function handleManualFileUpload(event: ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    setErrorMessage("");
    setManualImportMessage("");

    const files = Array.from(event.target.files ?? []);
    setSelectedFileCount(files.length);

    if (files.length === 0) {
      return;
    }

    try {
      const fileTexts = await Promise.all(files.map((file) => file.text()));
      const allRows = fileTexts.flatMap(parseManualRows);
      const businesses = rowsToBusinesses(allRows);

      setManualData(fileTexts.join("\n\n"));
      setParsedBusinesses(businesses);

      if (businesses.length === 0) {
        setErrorMessage(
          "Geçerli işletme bulunamadı. Dosya başlıklarını veya içerikleri kontrol edin.",
        );
        return;
      }

      setManualImportMessage(`${businesses.length} işletme okundu. Kaydetmeye hazır.`);
    } catch {
      setErrorMessage("Dosya okunamadı. CSV formatını kontrol edin.");
      setParsedBusinesses([]);
    }
  }

  function handleManualDataChange(value: string) {
    setManualData(value);
    setParsedBusinesses([]);
    setManualImportMessage("");
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
          <div className="md:col-span-2">
            <SelectField label="Analiz adı">
              <input
                type="text"
                value={analysisName}
                onChange={(event) => setAnalysisName(event.target.value)}
                placeholder="Örn: Üsküdar Cafeler - Temmuz"
                className="input-pop"
              />
              <span className="text-xs font-bold text-slate-500">
                Son Analizler kısmında bu isimle görünecek.
              </span>
            </SelectField>
          </div>

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
            onChange={(event) => handleManualDataChange(event.target.value)}
            placeholder="CSV veya JSON verinizi buraya yapıştırın"
            className="input-pop min-h-40 leading-6"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="btn-secondary cursor-pointer">
              CSV / JSON Dosyası Seç
              <input
                type="file"
                multiple
                accept=".csv,.json,text/csv,application/json"
                onChange={handleManualFileUpload}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              onClick={(event) => saveManualImport(event)}
              className="btn-primary"
            >
              Manuel Veriyi Kaydet
            </button>
          </div>

          {selectedFileCount > 0 ? (
            <p className="text-sm font-extrabold text-slate-600">
              Seçilen dosya: {selectedFileCount}
            </p>
          ) : null}
          {manualImportMessage ? (
            <p className="w-fit rounded-full border-2 border-[#1E293B] bg-[#34D399] px-3 py-1 text-sm font-black text-[#1E293B]">
              {manualImportMessage}
            </p>
          ) : null}
          {parsedBusinesses.length > 0 ? (
            <div className="grid gap-3 rounded-2xl border-2 border-[#1E293B] bg-[#FFFDF5] p-4">
              <p className="text-sm font-black text-[#1E293B]">
                Önizleme: {parsedBusinesses.length} işletme
              </p>
              <div className="grid gap-2">
                {parsedBusinesses.slice(0, 3).map((business) => (
                  <div
                    key={`${business.businessName}-${business.location}`}
                    className="rounded-xl border-2 border-[#1E293B] bg-white p-3 text-sm font-bold"
                  >
                    <p className="font-black">{business.businessName}</p>
                    <p className="text-slate-600">
                      {business.category} · {business.rating.toFixed(1)} ·{" "}
                      {business.reviewCount} yorum
                    </p>
                    <p className="text-slate-600">{business.location}</p>
                  </div>
                ))}
              </div>
            </div>
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
