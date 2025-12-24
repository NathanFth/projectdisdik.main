"use client";

import { useMemo, useState } from "react";
import { read, utils } from "xlsx";
import {
  IMPORT_SCHEMAS,
  SCHEMA_KEYS,
  matchHeaderToField,
  normalizeHeader,
  missingRequiredFields,
} from "../../lib/importSchemas";

export default function ImportExcel({ schemaKey = "SD" }) {
  const schema = useMemo(() => {
    return IMPORT_SCHEMAS[schemaKey] || null;
  }, [schemaKey]);

  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [headersRaw, setHeadersRaw] = useState([]);
  const [headerMap, setHeaderMap] = useState({});
  const [rows, setRows] = useState([]);

  const resetAll = () => {
    setFileName("");
    setError("");
    setHeadersRaw([]);
    setHeaderMap({});
    setRows([]);
  };

  const parseFile = async (file) => {
    if (!schema) {
      setError(
        `SchemaKey "${schemaKey}" tidak dikenali. Pilih salah satu: ${SCHEMA_KEYS.join(
          ", "
        )}`
      );
      return;
    }

    const ok =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls") ||
      file.name.toLowerCase().endsWith(".csv");

    if (!ok) {
      setError("Format tidak didukung. Gunakan .xlsx, .xls, atau .csv");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let wb;

      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        wb = read(text, { type: "string" });
      } else {
        const buf = await file.arrayBuffer();
        wb = read(buf, { type: "array" });
      }

      const sheetName = wb.SheetNames?.[0];
      if (!sheetName) throw new Error("Sheet tidak ditemukan");

      const sheet = wb.Sheets[sheetName];
      if (!sheet) throw new Error("Sheet pertama tidak valid");

      // header mentah baris pertama
      const headRow =
        utils.sheet_to_json(sheet, { header: 1, range: 0 })?.[0] || [];

      // rows object (key = header mentah), defval biar gak undefined
      const json = utils.sheet_to_json(sheet, { defval: "" });

      // Batasi preview 50 baris
      const limited = Array.isArray(json) ? json.slice(0, 50) : [];

      // Mapping header -> field schema (berdasarkan aliases)
      const map = {};
      (headRow || []).forEach((raw) => {
        const field = matchHeaderToField(schema, raw);
        if (field) map[String(raw)] = field;
      });

      setFileName(file.name);
      setHeadersRaw(headRow);
      setHeaderMap(map);
      setRows(limited);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Gagal membaca file. Pastikan formatnya benar.");
      setFileName("");
      setHeadersRaw([]);
      setHeaderMap({});
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const onChangeInput = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    resetAll();
    parseFile(f);
  };

  const mappedFieldsSet = useMemo(() => {
    return new Set(Object.values(headerMap || {}));
  }, [headerMap]);

  const missing = useMemo(() => {
    if (!schema) return [];
    return missingRequiredFields(schema, mappedFieldsSet);
  }, [schema, mappedFieldsSet]);

  const unknownHeaders = useMemo(() => {
    const raw = Array.isArray(headersRaw) ? headersRaw : [];
    return raw.filter((h) => !headerMap[String(h)]);
  }, [headersRaw, headerMap]);

  const canProceed = !!schema && fileName && !loading && missing.length === 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-card text-card-foreground p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              Import Excel — Skema:{" "}
              <span className="text-primary">{schemaKey}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Unggah file Excel/CSV untuk pratinjau (maks. 50 baris) dan cek
              kecocokan header dengan skema.
            </p>
          </div>

          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            disabled={loading}
            title="Reset"
          >
            Reset
          </button>
        </div>

        {!schema && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-sm">
            <div className="font-medium">SchemaKey tidak dikenali.</div>
            <div className="text-muted-foreground">
              Pilih salah satu:{" "}
              <span className="font-mono">{SCHEMA_KEYS.join(", ")}</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <label className="inline-flex items-center rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onChangeInput}
              className="hidden"
              disabled={loading || !schema}
            />
            Pilih File
          </label>

          {loading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              Membaca file...
            </div>
          )}

          {fileName && !loading && (
            <div className="text-sm text-muted-foreground">
              File: <span className="font-mono">{fileName}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Schema info */}
      {schema && (
        <div className="rounded-xl border bg-card text-card-foreground p-4">
          <h3 className="font-semibold mb-2">Aturan Skema</h3>
          <div className="grid gap-2 text-sm">
            <div>
              <span className="font-medium">Wajib:</span>{" "}
              <span className="font-mono">
                {(schema.required || []).join(", ")}
              </span>
            </div>
            <div>
              <span className="font-medium">Opsional:</span>{" "}
              <span className="font-mono">
                {(schema.optional || []).join(", ")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {schema && fileName && !loading && (
        <div className="rounded-xl border bg-card text-card-foreground overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-1">Validasi Header</h3>

            {missing.length > 0 ? (
              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-sm">
                <div className="font-medium">Kolom wajib belum terpenuhi:</div>
                <div className="font-mono mt-1">{missing.join(", ")}</div>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-green-300 bg-green-50/60 p-3 text-sm">
                <div className="font-medium">
                  Header wajib sudah terpenuhi ✅
                </div>
                <div className="text-muted-foreground">
                  Kamu bisa lanjut ke tahap mapping/commit (nanti kita
                  aktifkan).
                </div>
              </div>
            )}

            {unknownHeaders.length > 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                Header yang belum dikenali (boleh, tapi tidak dipakai):{" "}
                <span className="font-mono">
                  {unknownHeaders.map((h) => normalizeHeader(h)).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Header mapping list */}
          <div className="p-4 border-b">
            <h4 className="font-semibold mb-2">Pencocokan Header</h4>
            <div className="grid gap-2">
              {(headersRaw || []).slice(0, 50).map((raw) => {
                const matched = headerMap[String(raw)];
                return (
                  <div
                    key={`${raw}`}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      matched
                        ? "border-green-300 bg-green-50/60"
                        : "border-amber-300 bg-amber-50/60"
                    }`}
                  >
                    <div className="text-sm">
                      <div>
                        <span className="font-medium">Header file:</span>{" "}
                        {String(raw || "") || <em>(kosong)</em>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Normalized:{" "}
                        <span className="font-mono">
                          {normalizeHeader(raw)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm">
                      {matched ? (
                        <>
                          <span className="font-medium">→</span>{" "}
                          <span className="font-mono">{matched}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          Tidak dipakai
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4">
            <h4 className="font-semibold mb-2">
              Preview Data (maks. 50 baris)
            </h4>

            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Tidak ada data untuk ditampilkan.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {Object.keys(rows[0] || {})
                        .slice(0, 16)
                        .map((k) => (
                          <th
                            key={k}
                            className="text-left px-3 py-2 border-b whitespace-nowrap"
                          >
                            {k}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((r, idx) => (
                      <tr key={idx} className="even:bg-muted/20">
                        {Object.keys(rows[0] || {})
                          .slice(0, 16)
                          .map((k) => (
                            <td
                              key={k}
                              className="px-3 py-2 border-b whitespace-nowrap"
                            >
                              {String(r?.[k] ?? "")}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                disabled
                className="rounded-lg border px-3 py-2 text-muted-foreground"
                title="Langkah berikutnya: Mapping kolom manual"
              >
                Mapping Kolom (segera)
              </button>
              <button
                disabled={!canProceed}
                className={`rounded-lg border px-3 py-2 ${
                  canProceed
                    ? "text-foreground hover:bg-muted"
                    : "text-muted-foreground"
                }`}
                title={
                  canProceed
                    ? "Langkah berikutnya: Commit ke data"
                    : "Lengkapi kolom wajib dulu"
                }
              >
                Commit Data (segera)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
