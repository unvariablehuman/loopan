import { useEffect, useState } from "react";
import { z } from "zod";
import { AlertCircle, Barcode, CalendarClock, Info, Loader2, PackagePlus, Pencil, X } from "lucide-react";
import { usePantry } from "./PantryContext";
import { categoryLabel, CATEGORIES, locationLabel, LOCATIONS, parseDate, type Category, type DateType, type Location } from "@/lib/pantry-data";

const schema = z.object({
  name: z.string().trim().min(1, "Masukkan nama produk").max(80, "Maksimal 80 karakter"),
  category: z.enum(CATEGORIES),
  quantity: z.string().trim().min(1, "Masukkan jumlah, mis. 1 L atau 6 pcs").max(30, "Maksimal 30 karakter"),
  location: z.enum(LOCATIONS),
  expiresOn: z.string().refine((s) => parseDate(s) !== null, "Pilih tanggal yang valid"),
  dateType: z.enum(["use_by", "best_before"]),
  // Price is whole Rupiah (integer); empty is allowed since price is optional.
  price: z.string().trim().refine((s) => s === "" || (/^\d+$/.test(s) && Number(s) <= 100000000), "Gunakan angka rupiah, mis. 15000"),
});

type Form = z.input<typeof schema>;
const empty: Form = { name: "", category: "Vegetables", quantity: "", location: "Fridge", expiresOn: "", dateType: "use_by", price: "" };

const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40 aria-[invalid=true]:border-coral-foreground";

export function ItemEditor() {
  const { editor, openEditor, addItem, updateItem } = usePantry();
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setErrors({});
    if (editor?.mode === "edit") {
      const i = editor.item;
      setForm({ name: i.name, category: i.category, quantity: i.quantity, location: i.location, expiresOn: i.expiresOn, dateType: i.dateType, price: i.price != null ? String(i.price) : "" });
    } else if (editor) {
      const pf = editor.prefill;
      setForm({ ...empty, ...(pf?.name ? { name: pf.name } : {}), ...(pf?.category ? { category: pf.category } : {}), ...(pf?.expiresOn ? { expiresOn: pf.expiresOn } : {}), ...(pf?.dateType ? { dateType: pf.dateType } : {}) });
    }
    setSaving(false);
  }, [editor]);

  if (!editor) return null;
  const isEdit = editor.mode === "edit";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const close = () => openEditor(null);

  const prefill = editor.mode === "add" ? editor.prefill : undefined;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const r = schema.safeParse(form);
    if (!r.success) {
      const errs: typeof errors = {};
      for (const i of r.error.issues) errs[i.path[0] as keyof Form] ??= i.message;
      setErrors(errs);
      return;
    }
    const d = r.data;
    const payload = {
      name: d.name, category: d.category as Category, quantity: d.quantity, location: d.location as Location,
      expiresOn: d.expiresOn, dateType: d.dateType as DateType, price: d.price ? Number(d.price) : undefined,
      ...(isEdit
        ? { image: editor.item.image, tone: editor.item.tone, brand: editor.item.brand, barcode: editor.item.barcode }
        : { image: prefill?.image, brand: prefill?.brand, barcode: prefill?.barcode }),
    };
    setSaving(true);
    if (isEdit) updateItem(editor.item.id, payload);
    else addItem(payload);
    close();
  };

  const Err = ({ k }: { k: keyof Form }) => errors[k] ? <span id={`${k}-err`} className="text-xs font-medium text-coral-foreground">{errors[k]}</span> : null;
  const aria = (k: keyof Form) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-foreground/30 p-4" role="dialog" aria-modal="true" aria-labelledby="editor-title" onClick={close}>
      <form noValidate onSubmit={submit} className="card-surface my-auto w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint text-primary">
              {isEdit ? <Pencil className="h-5 w-5" /> : prefill?.barcode ? <Barcode className="h-5 w-5" /> : prefill?.expiresOn ? <CalendarClock className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
            </span>
            <div>
              <h2 id="editor-title" className="text-lg font-semibold">{isEdit ? "Ubah item" : prefill ? "Konfirmasi item" : "Tambahkan ke Dapur"}</h2>
              <p className="text-xs text-muted-foreground">
                {prefill ? "Periksa detail sebelum menyimpan. Kolom bertanda * wajib diisi." : "Kolom bertanda * wajib diisi."}
              </p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Tutup" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {prefill?.notice && (
          <div role="status" className={`mt-4 flex gap-2 rounded-lg px-3 py-2.5 text-xs ${prefill.notice.tone === "warn" ? "bg-amber text-amber-foreground" : "bg-mint text-primary-deep"}`}>
            {prefill.notice.tone === "warn" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Info className="h-4 w-4 shrink-0" />}
            <span>{prefill.notice.text}</span>
          </div>
        )}
        {(prefill?.barcode || prefill?.image || prefill?.brand) && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border bg-background p-3">
            {prefill.image ? <img src={prefill.image} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-card object-contain" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-mint text-primary"><Barcode className="h-6 w-6" /></span>}
            <div className="min-w-0 text-xs text-muted-foreground">
              {prefill.brand && <div className="truncate text-sm font-semibold text-foreground">{prefill.brand}</div>}
              {prefill.barcode && <div>Barcode {prefill.barcode}</div>}
              {prefill.barcode && !prefill.notice && <div>Info produk dari Open Food Facts</div>}
            </div>
          </div>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Nama produk *
            <input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} className={field} {...aria("name")} />
            <Err k="name" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Kategori *
            {/* Stored value stays the English canonical token (value={c}); the user sees the Indonesian label. */}
            <select value={form.category} onChange={(e) => set("category", e.target.value as Category)} className={field}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Jumlah *
            <input value={form.quantity} placeholder="mis. 1 L, 6 pcs" onChange={(e) => set("quantity", e.target.value)} className={field} {...aria("quantity")} />
            <Err k="quantity" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Lokasi penyimpanan *
            {/* Stored value stays the English canonical token (value={l}); the user sees the Indonesian label. */}
            <select value={form.location} onChange={(e) => set("location", e.target.value as Location)} className={field}>
              {LOCATIONS.map((l) => <option key={l} value={l}>{locationLabel(l)}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Perkiraan harga (Rp)
            <input inputMode="numeric" value={form.price} placeholder="mis. 15000" onChange={(e) => set("price", e.target.value)} className={field} {...aria("price")} />
            <Err k="price" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Tanggal pada kemasan *
            <input type="date" value={form.expiresOn} onChange={(e) => set("expiresOn", e.target.value)} className={field} {...aria("expiresOn")} />
            <Err k="expiresOn" />
          </label>
          <fieldset className="grid gap-1.5 text-sm font-medium">
            <legend className="mb-1.5">Jenis tanggal *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["use_by", "best_before"] as const).map((t) => (
                <label key={t} className={`flex h-10 cursor-pointer items-center justify-center rounded-lg border text-[13px] transition ${form.dateType === t ? "border-primary bg-mint text-primary-deep" : "hover:bg-muted"}`}>
                  <input type="radio" name="dateType" className="sr-only" checked={form.dateType === t} onChange={() => set("dateType", t)} />
                  {t === "use_by" ? "Tanggal pakai" : "Baik sebelum"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          “Tanggal pakai” soal keamanan; “baik sebelum” soal kualitas. Tanggal hanya panduan — selalu periksa tampilan dan aroma makanan.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">Batal</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-deep disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Simpan perubahan" : "Tambahkan ke Dapur"}
          </button>
        </div>
      </form>
    </div>
  );
}
