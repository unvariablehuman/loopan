import { toISODate, type DateType } from "./pantry-data";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

export interface DateCandidate { iso: string; raw: string }

function make(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  // Plausibility window for a food label: 2 years back to 10 years ahead.
  const now = new Date();
  const min = new Date(now.getFullYear() - 2, 0, 1), max = new Date(now.getFullYear() + 10, 11, 31);
  if (dt < min || dt > max) return null;
  return toISODate(dt);
}

/** Extracts plausible dates from OCR text. Numeric dates are read day-first (DD/MM/YYYY). */
export function findDates(text: string): DateCandidate[] {
  // Common OCR confusions inside digit groups
  const t = text.replace(/(?<=\d)[oO](?=\d)/g, "0").replace(/(?<=\d)[lI|](?=\d)/g, "1");
  const out: DateCandidate[] = [];
  const push = (iso: string | null, raw: string) => { if (iso && !out.some((c) => c.iso === iso)) out.push({ iso, raw: raw.trim() }); };
  let m: RegExpExecArray | null;

  const ymd = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g;
  while ((m = ymd.exec(t))) push(make(+m[1]!, +m[2]!, +m[3]!), m[0]);

  const dmy = /\b(\d{1,2})\s?[-/.]\s?(\d{1,2})\s?[-/.]\s?(\d{4}|\d{2})\b/g;
  while ((m = dmy.exec(t))) push(make(+m[3]!, +m[2]!, +m[1]!), m[0]);

  const mon = "(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\\.?";
  const dMonY = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s.\\-/]*${mon}[\\s.,\\-/]*(\\d{4}|\\d{2})\\b`, "gi");
  while ((m = dMonY.exec(t))) push(make(+m[3]!, MONTHS[m[2]!.toLowerCase()]!, +m[1]!), m[0]);

  const monDY = new RegExp(`\\b${mon}[\\s.\\-/]*(\\d{1,2})(?:st|nd|rd|th)?[\\s,.\\-/]+(\\d{4})\\b`, "gi");
  while ((m = monDY.exec(t))) push(make(+m[3]!, MONTHS[m[1]!.toLowerCase()]!, +m[2]!), m[0]);

  return out;
}

export function detectDateType(text: string): DateType | null {
  const t = text.toLowerCase();
  if (/best\s*b(efore|y)|\bbb\b|\bbbe\b|best if used/.test(t)) return "best_before";
  if (/use\s*by|\bexp(iry|ires|\.)?\b|expiration/.test(t)) return "use_by";
  return null;
}
