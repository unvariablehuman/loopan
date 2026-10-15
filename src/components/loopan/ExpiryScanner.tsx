import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CalendarClock, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { usePantry } from "./PantryContext";
import { detectDateType, findDates, type DateCandidate } from "@/lib/date-ocr";
import { formatDate, parseDate, type DateType } from "@/lib/pantry-data";

type Phase = { k: "pick" } | { k: "reading"; progress: number } | { k: "done"; text: string; dates: DateCandidate[] } | { k: "error"; msg: string };

export function ExpiryScanner() {
  const { scanner, openScanner } = usePantry();
  if (scanner !== "expiry") return null;
  return <Inner close={() => openScanner(null)} />;
}

function Inner({ close }: { close: () => void }) {
  const { openScanner, openEditor } = usePantry();
  const [img, setImg] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: "pick" });
  const [date, setDate] = useState("");
  const [dateType, setDateType] = useState<DateType>("use_by");
  const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { void workerRef.current?.terminate(); if (img) URL.revokeObjectURL(img); }, [img]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhase({ k: "error", msg: "Please choose an image file." }); return; }
    const url = URL.createObjectURL(file);
    setImg(url);
    setPhase({ k: "reading", progress: 0 });
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setPhase({ k: "reading", progress: m.progress });
        },
      });
      workerRef.current = worker;
      const { data } = await worker.recognize(file);
      await worker.terminate();
      workerRef.current = null;
      const text = data.text.trim();
      const dates = findDates(text);
      setDate(dates[0]?.iso ?? "");
      setDateType(detectDateType(text) ?? "use_by");
      setPhase({ k: "done", text, dates });
    } catch {
      setPhase({ k: "error", msg: "Text recognition failed. You can still enter the date manually." });
    }
  };

  const valid = parseDate(date) !== null;
  const reading = phase.k === "reading";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-labelledby="ex-title" onClick={close}>
      <div className="card-surface my-auto w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-primary"><CalendarClock className="h-5 w-5" /></span>
            <div>
              <h2 id="ex-title" className="text-lg font-semibold">Scan expiry label</h2>
              <p className="text-xs text-muted-foreground">Take a close, well-lit photo of the date on the package.</p>
            </div>
          </div>
          <button onClick={close} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={uploadRef} type="file" accept="image/*" className="sr-only" aria-label="Upload label photo" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />

        {img ? (
          <img src={img} alt="Package label" className="mt-5 max-h-56 w-full rounded-xl border bg-foreground/5 object-contain" />
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={() => cameraRef.current?.click()} className="grid justify-items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-mint/60 p-6 text-sm font-semibold text-primary-deep hover:bg-mint">
              <Camera className="h-6 w-6" />Take photo
            </button>
            <button onClick={() => uploadRef.current?.click()} className="grid justify-items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-mint/60 p-6 text-sm font-semibold text-primary-deep hover:bg-mint">
              <Upload className="h-6 w-6" />Upload image
            </button>
          </div>
        )}

        {reading && (
          <div className="mt-4" role="status">
            <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" />Reading text… {Math.round(phase.progress * 100)}%</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mint"><div className="h-full bg-primary transition-all" style={{ width: `${phase.progress * 100}%` }} /></div>
          </div>
        )}

        {phase.k === "error" && (
          <p className="mt-4 flex gap-2 rounded-lg bg-amber px-3 py-2.5 text-xs text-amber-foreground"><AlertCircle className="h-4 w-4 shrink-0" />{phase.msg}</p>
        )}

        {phase.k === "done" && (
          <div className="mt-4 grid gap-3">
            <details className="rounded-lg border bg-background px-3 py-2 text-xs" open={phase.dates.length === 0}>
              <summary className="cursor-pointer font-semibold">Text found in the image</summary>
              <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap font-sans text-muted-foreground">{phase.text || "(no text recognized)"}</pre>
            </details>
            {phase.dates.length > 0 ? (
              <p className="flex gap-2 rounded-lg bg-mint px-3 py-2.5 text-xs text-primary-deep">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Possible date found: <b>{formatDate(phase.dates[0]!.iso)}</b> (from “{phase.dates[0]!.raw}”). Please check it against the package. Numbers are read day-first.</span>
              </p>
            ) : (
              <p className="flex gap-2 rounded-lg bg-amber px-3 py-2.5 text-xs text-amber-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>No reliable date found. Try a closer, sharper photo, or enter the date below.</span>
              </p>
            )}
            {phase.dates.length > 1 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {phase.dates.map((d) => (
                  <button key={d.iso} onClick={() => setDate(d.iso)} className={`rounded-full border px-3 py-1 ${date === d.iso ? "border-primary bg-mint" : "hover:bg-muted"}`}>{formatDate(d.iso)}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {(phase.k === "done" || phase.k === "error") && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">Date on package
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </label>
            <fieldset className="grid gap-1.5 text-sm font-medium">
              <legend className="mb-1.5">The package says</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["use_by", "best_before"] as const).map((t) => (
                  <label key={t} className={`flex h-10 cursor-pointer items-center justify-center rounded-lg border text-[13px] ${dateType === t ? "border-primary bg-mint text-primary-deep" : "hover:bg-muted"}`}>
                    <input type="radio" name="ex-dt" className="sr-only" checked={dateType === t} onChange={() => setDateType(t)} />
                    {t === "use_by" ? "Use by" : "Best before"}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">Text recognition can misread labels, especially curved, glossy or dot-printed dates. Always confirm the date yourself.</p>

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {img && !reading && <button onClick={() => { setImg(null); setPhase({ k: "pick" }); setDate(""); }} className="rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-mint">Try another photo</button>}
            {!img && <button onClick={() => setPhase({ k: "error", msg: "Enter the date manually." })} className="rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-mint">Enter date manually</button>}
          </div>
          <div className="flex gap-2">
            <button onClick={close} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
            <button
              disabled={!valid || reading}
              onClick={() => { openScanner(null); openEditor({ mode: "add", prefill: { expiresOn: date, dateType } }); }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-deep disabled:opacity-50"
            >
              Use this date
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
