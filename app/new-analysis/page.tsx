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

type AnalysisTab = "search" | "manual";

function getSelectedIntent(): SelectedIntent {
  if (typeof window === "undefined") {
    return "review-card";
  }

  return window.localStorage.getItem(SELECTED_INTENT_STORAGE_KEY) === "web-design"
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

function createAnalysisNameFromFiles(files: File[]): string {
  const [firstFile] = files;
  const fallbackName = `Manuel Analiz - ${new Date().toLocaleDateString("tr-TR")}`;

  if (!firstFile) {
    return fallbackName;
  }

  const baseName = firstFile.name
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!baseName) {
    return fallbackName;
  }

  return files.length > 1 ? `${baseName} + ${files.length - 1} dosya` : baseName;
}

function createManualAnalysisName(
  providedName: string,
  district: string,
  category: string,
): string {
  const fallbackName = [district.trim(), category.trim()]
    .filter(Boolean)
    .join(" ");

  return providedName.trim() || fallbackName || "Manuel Veri";
}

function validateAnalysisMetadata({
  analysisName,
  city,
  district,
  category,
}: {
  analysisName: string;
  city: string;
  district: string;
  category: string;
}): string {
  if (!analysisName.trim()) {
    return "Analiz adı boş bırakılamaz.";
  }

  if (analysisName.trim().length > 100) {
    return "Analiz adı en fazla 100 karakter olabilir.";
  }

  if (
    city.trim().length > 60 ||
    district.trim().length > 60 ||
    category.trim().length > 60
  ) {
    return "Şehir, ilçe ve kategori en fazla 60 karakter olabilir.";
  }

  return "";
}

export default function NewAnalysisPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AnalysisTab>("search");
  const [selectedIntent] = useState<SelectedIntent>(getSelectedIntent);
  const [country] = useState("Türkiye");
  const [city, setCity] = useState("İstanbul");
  const [district, setDistrict] = useState("Kadıköy");
  const [category, setCategory] = useState("Cafe");
  const [analysisName, setAnalysisName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [manualData, setManualData] = useState("");
  const [manualAnalysisName, setManualAnalysisName] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualDistrict, setManualDistrict] = useState("");
  const [manualCategory, setManualCategory] = useState("Manuel Veri");
  const [manualImportMessage, setManualImportMessage] = useState("");
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);
  const [parsedBusinesses, setParsedBusinesses] = useState<BusinessResult[]>([]);
  const availableDistricts = districtsByProvince[city] ?? [];
  const modeBadgeClass =
    selectedIntent === "web-design" ? "badge-web" : "badge-review";
  const modePanelClass =
    selectedIntent === "web-design"
      ? "border-cyan-200 bg-cyan-50 text-cyan-700"
      : "border-violet-200 bg-violet-50 text-violet-700";
  const intentContent =
    selectedIntent === "web-design"
      ? {
          label: "Web Tasarım",
          title: "Web Tasarım için işletme analizi",
          subtitle:
            "Web sitesi olmayan, dijital vitrini zayıf ve ulaşılabilir işletmeleri bulun.",
        }
      : {
          label: "Yorum Kart",
          title: "Yorum Kart için işletme analizi",
          subtitle:
            "Google puanı, yorum sayısı ve iletişim bilgilerine göre en uygun işletmeleri önceliklendirin.",
        };

  function getFinalAnalysisName(nextDistrict: string, nextCategory: string) {
    const fallbackName = [nextDistrict.trim(), nextCategory.trim()]
      .filter(Boolean)
      .join(" ");

    return analysisName.trim() || fallbackName || "İsimsiz Analiz";
  }

  function getManualMetadata() {
    const nextCity = manualCity.trim() || "İstanbul";
    const nextDistrict = manualDistrict.trim() || "Üsküdar";
    const nextCategory = manualCategory.trim() || "Manuel Veri";

    return {
      country: "Türkiye",
      city: nextCity,
      district: nextDistrict,
      category: nextCategory,
      analysisName: createManualAnalysisName(
        manualAnalysisName,
        nextDistrict,
        nextCategory,
      ),
    };
  }

  function rowsToBusinesses(rows: RawBusinessRow[]) {
    const metadata = getManualMetadata();

    return dedupeBusinesses(
      rows
        .map((row, index) =>
          normalizeBusinessFromRow(
            row,
            {
              city: metadata.city,
              district: metadata.district,
              category: metadata.category,
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
    const metadata = getManualMetadata();
    const metadataError = validateAnalysisMetadata(metadata);

    if (metadataError) {
      setErrorMessage(metadataError);
      return;
    }

    saveAnalysisToHistory({
      ...metadata,
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

  function saveManualImport() {
    setErrorMessage("");

    try {
      const businesses =
        manualData.trim().length > 0
          ? parseAndPreviewManualData(manualData)
          : parsedBusinesses;

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

  function handlePreviewManualData() {
    setErrorMessage("");

    try {
      const businesses = parseAndPreviewManualData(manualData);

      if (businesses.length === 0) {
        setErrorMessage(
          "Geçerli işletme bulunamadı. Dosya başlıklarını veya içerikleri kontrol edin.",
        );
      }
    } catch {
      setErrorMessage("Dosya okunamadı. CSV formatını kontrol edin.");
      setParsedBusinesses([]);
    }
  }

  async function handleManualFileUpload(event: ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    setErrorMessage("");
    setManualImportMessage("");

    const files = Array.from(event.target.files ?? []);
    setSelectedFileNames(files.map((file) => file.name));

    if (files.length === 0) {
      return;
    }

    try {
      if (!manualAnalysisName.trim()) {
        setManualAnalysisName(createAnalysisNameFromFiles(files));
      }

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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={modeBadgeClass}>{intentContent.label} Modu</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {intentContent.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {intentContent.subtitle}
            </p>
          </div>
          <Link href="/" className="btn-secondary w-fit">
            Modu Değiştir
          </Link>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("search")}
                className={`min-h-10 rounded-md px-3 text-sm font-semibold transition ${
                  activeTab === "search"
                    ? "border border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Yeni Analiz
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`min-h-10 rounded-md px-3 text-sm font-semibold transition ${
                  activeTab === "manual"
                    ? "border border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                Manuel Veri Yükle
              </button>
            </div>
          </div>

          {activeTab === "search" ? (
            <form onSubmit={handleAnalyze} className="grid gap-5 p-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold text-slate-950">
                  Konum ve kategori seç
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Seçili amaç: {intentContent.label}. Bu bilgiler analiz raporunun
                  temelini oluşturur.
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${modePanelClass}`}
                >
                  {intentContent.label} için mode accent aktif
                </span>
              </div>

              <Field label="Analiz amacı">
                <input value={intentContent.label} readOnly className="input-pop" />
              </Field>

              <Field label="Analiz adı" helper="Son Analizler kısmında bu isimle görünecek.">
                <input
                  type="text"
                  value={analysisName}
                  onChange={(event) => setAnalysisName(event.target.value)}
                  placeholder="Örn: Üsküdar Cafeler - Temmuz"
                  className="input-pop"
                />
              </Field>

              <Field label="Ülke">
                <select value={country} disabled className="input-pop">
                  <option value="Türkiye">Türkiye</option>
                </select>
              </Field>

              <Field label="Şehir">
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
              </Field>

              <Field label="İlçe">
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
              </Field>

              <Field label="Kategori">
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
              </Field>

              <div className="md:col-span-2">
                <button type="submit" disabled={isLoading} className="btn-primary">
                  {isLoading ? "Analiz ediliyor..." : "Analiz Et"}
                </button>
              </div>
            </form>
          ) : (
            <section className="grid gap-6 p-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Manuel CSV / JSON yükle
                </h2>
                <p className="mt-1 max-w-3xl rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800">
                  Şehir ve ilçe bilgileri rapor metadata’sı içindir. CSV/JSON içindeki
                  işletme adresleri değiştirilmez.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Analiz adı">
                  <input
                    type="text"
                    value={manualAnalysisName}
                    onChange={(event) => setManualAnalysisName(event.target.value)}
                    placeholder="Örn: Eyüpsultan Çiçekçiler - Temmuz"
                    className="input-pop"
                  />
                </Field>

                <Field label="Kategori">
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(event) => setManualCategory(event.target.value)}
                    placeholder="Örn: Çiçekçi"
                    className="input-pop"
                  />
                </Field>

                <Field label="Şehir">
                  <input
                    type="text"
                    value={manualCity}
                    onChange={(event) => setManualCity(event.target.value)}
                    placeholder="Örn: İstanbul"
                    className="input-pop"
                  />
                </Field>

                <Field label="İlçe">
                  <input
                    type="text"
                    value={manualDistrict}
                    onChange={(event) => setManualDistrict(event.target.value)}
                    placeholder="Örn: Eyüpsultan"
                    className="input-pop"
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      CSV/JSON dosyası seçimi
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Çoklu dosya seçebilir, dosyaları tek analiz altında birleştirebilirsiniz.
                    </p>
                  </div>
                  <label className="btn-secondary cursor-pointer">
                    Dosya Seç
                    <input
                      type="file"
                      multiple
                      accept=".csv,.json,text/csv,application/json"
                      onChange={handleManualFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                {selectedFileNames.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-medium text-slate-700">
                      Seçilen dosya sayısı: {selectedFileNames.length}
                    </p>
                    <ul className="mt-2 grid gap-1 text-sm text-slate-600">
                      {selectedFileNames.map((fileName) => (
                        <li key={fileName} className="truncate">
                          {fileName}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <Field label="Metin yapıştırma alanı">
                <textarea
                  value={manualData}
                  onChange={(event) => handleManualDataChange(event.target.value)}
                  placeholder="CSV veya JSON verinizi buraya yapıştırın"
                  className="input-pop min-h-44 leading-6"
                />
              </Field>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePreviewManualData}
                  disabled={!manualData.trim()}
                  className="btn-secondary"
                >
                  Önizleme Oluştur
                </button>
                <button type="button" onClick={saveManualImport} className="btn-primary">
                  Manuel Veriyi Kaydet
                </button>
              </div>

              {manualImportMessage ? (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                  {manualImportMessage}
                </p>
              ) : null}

              {parsedBusinesses.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-slate-950">
                      Önizleme
                    </p>
                    <p className="text-sm text-slate-600">
                      {parsedBusinesses.length} işletme parse edildi, ilk 3 kayıt gösteriliyor.
                    </p>
                  </div>

                  <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
                    <table className="table-pop">
                      <thead>
                        <tr>
                          <th className="text-left">İşletme</th>
                          <th className="text-left">Puan</th>
                          <th className="text-left">Yorum</th>
                          <th className="text-left">Konum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedBusinesses.slice(0, 3).map((business) => (
                          <tr key={`${business.businessName}-${business.location}`}>
                            <td className="font-medium text-slate-950">
                              {business.businessName}
                            </td>
                            <td>{business.rating.toFixed(1)}</td>
                            <td>{business.reviewCount}</td>
                            <td className="max-w-lg text-sm text-slate-600">
                              {business.location || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid gap-3 md:hidden">
                    {parsedBusinesses.slice(0, 3).map((business) => (
                      <article
                        key={`${business.businessName}-${business.location}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="font-semibold text-slate-950">
                          {business.businessName}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Puan: {business.rating.toFixed(1)} • Yorum:{" "}
                          {business.reviewCount}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {business.location || "-"}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          )}
        </section>

        {errorMessage ? (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{errorMessage}</p>
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">
              İşletme listesi hazırlanıyor...
            </p>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}
