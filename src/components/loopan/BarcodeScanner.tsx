import { useEffect, useRef, useState } from "react";
import { AlertCircle, Barcode, Keyboard, Loader2, ScanBarcode, X } from "lucide-react";
import { usePantry, type Prefill } from "./PantryContext";
import { lookupBarcode } from "@/lib/open-food-facts";

type Phase =
  | { k: "starting" }
  | { k: "scanning" }
  | { k: "camera_error"; msg: string }
  | { k: "looking_up"; code: string };

export function BarcodeScanner() {
  const { scanner, openScanner, openEditor } = usePantry();
  if (scanner !== "barcode") return null;
  return <Inner close={() => openScanner(null)} confirm={(p) => { openScanner(null); openEditor({ mode: "add", prefill: p }); }} />;
}

function Inner({ close, confirm }: { close: () => void; confirm: (p: Prefill) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const busy = useRef(false);
  const [phase, setPhase] = useState<Phase>({ k: "starting" });
  const [manual, setManual] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const handleCode = async (code: string) => {
    if (busy.current) return;
    busy.current = true;
    stopRef.current();
    setPhase({ k: "looking_up", code });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await lookupBarcode(code, ac.signal);
      if (r.status === "found") {
        confirm({ barcode: code, ...r.product });
      } else {
        confirm({
          barcode: code,
          notice: r.status === "not_found"
            ? { tone: "warn", text: "Produk tidak ditemukan di Open Food Facts. Masukkan detailnya secara manual — barcode hasil pindai tetap disimpan." }
            : { tone: "warn", text: `${r.message} Masukkan detailnya secara manual — barcode hasil pindai tetap disimpan.` },
        });
      }
    } catch {
      /* aborted on close */
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase({ k: "camera_error", msg: "Browser ini tidak mendukung akses kamera." });
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128]);
        const reader = new BrowserMultiFormatReader(hints);
        if (cancelled || !videoRef.current) return;
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current,
          (result) => { if (result) void handleCode(result.getText()); },
        );
        stopRef.current = () => controls.stop();
        if (cancelled) controls.stop();
        else setPhase((p) => (p.k === "starting" ? { k: "scanning" } : p));
      } catch (e) {
        const name = (e as Error).name;
        setPhase({
          k: "camera_error",
          msg: name === "NotAllowedError" || name === "SecurityError" ? "Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser, atau masukkan barcode di bawah."
            : name === "NotFoundError" || name === "OverconstrainedError" ? "Tidak ada kamera yang ditemukan di perangkat ini."
            : name === "NotReadableError" || name === "AbortError" ? "Kamera sedang digunakan aplikasi lain. Tutup aplikasi itu lalu coba lagi, atau masukkan barcode di bawah."
            : "Kamera tidak dapat dijalankan. Masukkan barcode di bawah saja.",
        });
      }
    })();
    return () => { cancelled = true; stopRef.current(); abortRef.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lookingUp = phase.k === "looking_up";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-labelledby="bc-title" onClick={close}>
      <div className="card-surface my-auto w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-primary"><ScanBarcode className="h-5 w-5" /></span>
            <div>
              <h2 id="bc-title" className="text-lg font-semibold">Pindai barcode</h2>
              <p className="text-xs text-muted-foreground">Posisikan barcode di dalam bingkai.</p>
            </div>
          </div>
          <button onClick={close} aria-label="Tutup" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-xl bg-foreground">
          <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${phase.k === "scanning" ? "" : "opacity-30"}`} />
          {phase.k === "scanning" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative h-[42%] w-[78%] rounded-xl border-2 border-primary-foreground/90 shadow-[0_0_0_9999px_color-mix(in_oklab,var(--color-foreground)_45%,transparent)]">
                <div className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse bg-coral-foreground" />
              </div>
            </div>
          )}
          {(phase.k === "starting" || lookingUp) && (
            <div className="absolute inset-0 grid place-items-center text-center text-sm text-primary-foreground">
              <div className="grid justify-items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                {lookingUp ? <>Mencari {phase.code}…</> : "Memulai kamera…"}
              </div>
            </div>
          )}
          {phase.k === "camera_error" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-primary-foreground">
              <div className="grid justify-items-center gap-2"><AlertCircle className="h-6 w-6" />{phase.msg}</div>
            </div>
          )}
        </div>

        <form
          className="mt-5 grid gap-2"
          onSubmit={(e) => { e.preventDefault(); if (/^\d{6,14}$/.test(manual.trim())) void handleCode(manual.trim()); }}
        >
          <label htmlFor="bc-manual" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Keyboard className="h-3.5 w-3.5" />Atau ketik nomor barcode</label>
          <div className="flex gap-2">
            <input id="bc-manual" inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} placeholder="mis. 3017620422003" disabled={lookingUp}
              className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
            <button type="submit" disabled={lookingUp || !/^\d{6,14}$/.test(manual)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-deep disabled:opacity-50">
              <Barcode className="h-4 w-4" />Cari
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <button onClick={() => { stopRef.current(); confirm({ notice: { tone: "info", text: "Memasukkan detail secara manual." } }); }} disabled={lookingUp} className="rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-mint disabled:opacity-50">Masukkan manual saja</button>
          <button onClick={close} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button>
        </div>
      </div>
    </div>
  );
}
