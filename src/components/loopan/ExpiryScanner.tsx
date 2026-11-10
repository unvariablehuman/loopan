import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CalendarClock, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { usePantry } from "./PantryContext";
import { detectDateType, findDates, type DateCandidate } from "@/lib/date-ocr";
import { formatDate, parseDate, type DateType } from "@/lib/pantry-data";

type Phase =
  | { k: "pick" }
  | { k: "camera_starting" }
  | { k: "camera_live" }
  | { k: "camera_error"; msg: string }
  | { k: "reading"; progress: number }
  | { k: "done"; text: string; dates: DateCandidate[] }
  | { k: "error"; msg: string };

/** Load an image file, scale it down (longest side ≤ 1024px), and return a JPEG data URL
 *  small enough to persist inside the pantry item (localStorage-friendly). */
async function downscaleToDataUrl(file: File, max = 1024, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const bmp = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image load failed"));
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bmp, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ExpiryScanner() {
  const { scanner, openScanner } = usePantry();
  if (scanner !== "expiry") return null;
  return <Inner close={() => openScanner(null)} />;
}

function Inner({ close: onClose }: { close: () => void }) {
  const { openScanner, openEditor } = usePantry();
  const [img, setImg] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: "pick" });
  const [date, setDate] = useState("");
  const [dateType, setDateType] = useState<DateType>("use_by");
  const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(
    () => () => {
      void workerRef.current?.terminate();
      stopRef.current();
      if (img) URL.revokeObjectURL(img);
    },
    [img],
  );

  const close = () => {
    stopRef.current();
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhase({ k: "error", msg: "Silakan pilih berkas gambar." });
      return;
    }
    const url = URL.createObjectURL(file);
    setImg(url);
    void downscaleToDataUrl(file).then(setPhoto).catch(() => setPhoto(null));
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
      setPhase({
        k: "error",
        msg: "Pembacaan teks gagal. Anda masih bisa memasukkan tanggal secara manual.",
      });
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase({ k: "camera_error", msg: "Browser ini tidak mendukung akses kamera." });
      return;
    }
    setPhase({ k: "camera_starting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stopRef.current = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopRef.current = () => {};
      };
      if (!videoRef.current) {
        stopRef.current();
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      setPhase({ k: "camera_live" });
    } catch (e) {
      const name = (e as Error).name;
      setPhase({
        k: "camera_error",
        msg:
          name === "NotAllowedError" || name === "SecurityError"
            ? "Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser, atau unggah foto saja."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "Tidak ada kamera yang ditemukan di perangkat ini. Unggah foto saja."
              : name === "NotReadableError" || name === "AbortError"
                ? "Kamera sedang digunakan aplikasi lain. Tutup aplikasi itu lalu coba lagi, atau unggah foto saja."
                : "Kamera tidak dapat dijalankan. Unggah foto saja.",
      });
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth,
      h = video.videoHeight;
    if (!w || !h) return;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setPhase({ k: "camera_error", msg: "Gagal mengambil gambar. Unggah foto saja." });
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    stopRef.current();
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setPhase({
            k: "error",
            msg: "Gagal mengambil gambar. Anda masih bisa memasukkan tanggal secara manual.",
          });
          return;
        }
        const file = new File([blob], "expiry-capture.jpg", { type: "image/jpeg" });
        void onFile(file);
      },
      "image/jpeg",
      0.92,
    );
  };

  const valid = parseDate(date) !== null;
  const reading = phase.k === "reading";
  const cameraPhase =
    phase.k === "camera_starting" || phase.k === "camera_live" || phase.k === "camera_error";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ex-title"
      onClick={close}
    >
      <div
        className="card-surface my-auto w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-primary">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h2 id="ex-title" className="text-lg font-semibold">
                Pindai label kedaluwarsa
              </h2>
              <p className="text-xs text-muted-foreground">
                Ambil foto tanggal pada kemasan dari dekat dengan pencahayaan baik.
              </p>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Tutup"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={uploadRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Unggah foto label"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {phase.k === "pick" && !img && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => void startCamera()}
              className="grid justify-items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-mint/60 p-6 text-sm font-semibold text-primary-deep hover:bg-mint"
            >
              <Camera className="h-6 w-6" />
              Ambil Foto
            </button>
            <button
              onClick={() => uploadRef.current?.click()}
              className="grid justify-items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-mint/60 p-6 text-sm font-semibold text-primary-deep hover:bg-mint"
            >
              <Upload className="h-6 w-6" />
              Unggah Foto
            </button>
          </div>
        )}

        {cameraPhase && (
          <>
            <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-xl bg-foreground">
              <video
                ref={videoRef}
                muted
                playsInline
                className={`h-full w-full object-cover ${phase.k === "camera_live" ? "" : "opacity-30"}`}
              />
              {phase.k === "camera_starting" && (
                <div className="absolute inset-0 grid place-items-center text-center text-sm text-primary-foreground">
                  <div className="grid justify-items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Memulai kamera…
                  </div>
                </div>
              )}
              {phase.k === "camera_error" && (
                <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-primary-foreground">
                  <div className="grid justify-items-center gap-2">
                    <AlertCircle className="h-6 w-6" />
                    {phase.msg}
                  </div>
                </div>
              )}
              {phase.k === "camera_live" && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 p-4">
                  <button
                    onClick={capture}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-deep"
                  >
                    <Camera className="h-4 w-4" />
                    Ambil Gambar
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  stopRef.current();
                  setPhase({ k: "pick" });
                }}
                className="rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-mint"
              >
                Unggah foto saja
              </button>
              {phase.k === "camera_error" && (
                <>
                  <button
                    onClick={() => uploadRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
                  >
                    <Upload className="h-4 w-4" />
                    Unggah Foto
                  </button>
                  <button
                    onClick={() => {
                      stopRef.current();
                      setPhase({ k: "error", msg: "Masukkan tanggal secara manual." });
                    }}
                    className="rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-mint"
                  >
                    Masukkan tanggal manual
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {img && (
          <img
            src={img}
            alt="Label kemasan"
            className="mt-5 max-h-56 w-full rounded-xl border bg-foreground/5 object-contain"
          />
        )}

        {reading && (
          <div className="mt-4" role="status">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Membaca teks… {Math.round(phase.progress * 100)}%
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mint">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${phase.progress * 100}%` }}
              />
            </div>
          </div>
        )}

        {phase.k === "error" && (
          <p className="mt-4 flex gap-2 rounded-lg bg-amber px-3 py-2.5 text-xs text-amber-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {phase.msg}
          </p>
        )}

        {phase.k === "done" && (
          <div className="mt-4 grid gap-3">
            <details
              className="rounded-lg border bg-background px-3 py-2 text-xs"
              open={phase.dates.length === 0}
            >
              <summary className="cursor-pointer font-semibold">Teks yang ditemukan pada gambar</summary>
              <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap font-sans text-muted-foreground">
                {phase.text || "(tidak ada teks terbaca)"}
              </pre>
            </details>
            {phase.dates.length > 0 ? (
              <p className="flex gap-2 rounded-lg bg-mint px-3 py-2.5 text-xs text-primary-deep">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Kemungkinan tanggal ditemukan: <b>{formatDate(phase.dates[0]!.iso)}</b> (dari “
                  {phase.dates[0]!.raw}”). Harap cocokkan dengan kemasan. Angka dibaca dengan hari
                  di depan.
                </span>
              </p>
            ) : (
              <p className="flex gap-2 rounded-lg bg-amber px-3 py-2.5 text-xs text-amber-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  Tidak ada tanggal yang dapat diandalkan. Coba foto lebih dekat dan tajam, atau
                  masukkan tanggal di bawah.
                </span>
              </p>
            )}
            {phase.dates.length > 1 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {phase.dates.map((d) => (
                  <button
                    key={d.iso}
                    onClick={() => setDate(d.iso)}
                    className={`rounded-full border px-3 py-1 ${date === d.iso ? "border-primary bg-mint" : "hover:bg-muted"}`}
                  >
                    {formatDate(d.iso)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(phase.k === "done" || phase.k === "error") && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              Tanggal pada kemasan
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>
            <fieldset className="grid gap-1.5 text-sm font-medium">
              <legend className="mb-1.5">Pada kemasan tertulis</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["use_by", "best_before"] as const).map((t) => (
                  <label
                    key={t}
                    className={`flex h-10 cursor-pointer items-center justify-center rounded-lg border text-[13px] ${dateType === t ? "border-primary bg-mint text-primary-deep" : "hover:bg-muted"}`}
                  >
                    <input
                      type="radio"
                      name="ex-dt"
                      className="sr-only"
                      checked={dateType === t}
                      onChange={() => setDateType(t)}
                    />
                    {t === "use_by" ? "Tanggal pakai" : "Baik sebelum"}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          Pembacaan teks bisa salah, terutama pada label melengkung, mengilap, atau tanggal cetak
          titik. Selalu pastikan tanggalnya sendiri.
        </p>

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            {img && !reading && (
              <button
                onClick={() => {
                  stopRef.current();
                  setImg(null);
                  setPhoto(null);
                  setPhase({ k: "pick" });
                  setDate("");
                }}
                className="rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-mint"
              >
                Coba foto lain
              </button>
            )}
            {!img && !cameraPhase && (
              <button
                onClick={() => setPhase({ k: "error", msg: "Masukkan tanggal secara manual." })}
                className="rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-mint"
              >
                Masukkan tanggal manual
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={close}
              className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              Batal
            </button>
            <button
              disabled={!valid || reading}
              onClick={() => {
                openScanner(null);
                openEditor({
                  mode: "add",
                  prefill: { expiresOn: date, dateType, image: photo ?? undefined },
                });
              }}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-deep disabled:opacity-50"
            >
              Gunakan tanggal ini
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
