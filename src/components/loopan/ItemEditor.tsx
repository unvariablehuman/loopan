import { useEffect, useState } from "react";
import { z } from "zod";
import { CalendarClock, PackagePlus, Pencil, X } from "lucide-react";
import { usePantry } from "./PantryContext";
import { CATEGORIES, LOCATIONS, parseDate, type Category, type DateType, type Location } from "@/lib/pantry-data";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a product name").max(80, "Keep it under 80 characters"),
  category: z.enum(CATEGORIES),
  quantity: z.string().trim().min(1, "Enter a quantity, e.g. 1 L or 6 pcs").max(30, "Keep it under 30 characters"),
  location: z.enum(LOCATIONS),
  expiresOn: z.string().refine((s) => parseDate(s) !== null, "Pick a valid date"),
  dateType: z.enum(["use_by", "best_before"]),
  price: z.string().trim().refine((s) => s === "" || (/^\d+(\.\d{1,2})?$/.test(s) && Number(s) <= 10000), "Use a number like 3.50"),
});

type Form = z.input<typeof schema>;
const empty: Form = { name: "", category: "Vegetables", quantity: "", location: "Fridge", expiresOn: "", dateType: "use_by", price: "" };

const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring/40 aria-[invalid=true]:border-coral-foreground";

export function ItemEditor() {
  const { editor, openEditor, addItem, updateItem } = usePantry();
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});

  useEffect(() => {
    setErrors({});
    if (editor?.mode === "edit") {
      const i = editor.item;
      setForm({ name: i.name, category: i.category, quantity: i.quantity, location: i.location, expiresOn: i.expiresOn, dateType: i.dateType, price: i.price != null ? String(i.price) : "" });
    } else if (editor) setForm(empty);
  }, [editor]);

  if (!editor) return null;
  const isEdit = editor.mode === "edit";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const close = () => openEditor(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
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
      ...(isEdit ? { image: editor.item.image, tone: editor.item.tone } : {}),
    };
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
              {isEdit ? <Pencil className="h-5 w-5" /> : editor.hint === "expiry" ? <CalendarClock className="h-5 w-5" /> : <PackagePlus className="h-5 w-5" />}
            </span>
            <div>
              <h2 id="editor-title" className="text-lg font-semibold">{isEdit ? "Edit item" : "Add food item"}</h2>
              <p className="text-xs text-muted-foreground">
                {editor.mode === "add" && editor.hint ? "Scanning isn’t available yet — enter the details manually." : "Fields marked * are required."}
              </p>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">Product name *
            <input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} className={field} {...aria("name")} />
            <Err k="name" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Category *
            <select value={form.category} onChange={(e) => set("category", e.target.value as Category)} className={field}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Quantity *
            <input value={form.quantity} placeholder="e.g. 1 L, 6 pcs" onChange={(e) => set("quantity", e.target.value)} className={field} {...aria("quantity")} />
            <Err k="quantity" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Storage location *
            <select value={form.location} onChange={(e) => set("location", e.target.value as Location)} className={field}>
              {LOCATIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Estimated price ($)
            <input inputMode="decimal" value={form.price} placeholder="Optional" onChange={(e) => set("price", e.target.value)} className={field} {...aria("price")} />
            <Err k="price" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Date on package *
            <input type="date" value={form.expiresOn} onChange={(e) => set("expiresOn", e.target.value)} className={field} {...aria("expiresOn")} />
            <Err k="expiresOn" />
          </label>
          <fieldset className="grid gap-1.5 text-sm font-medium">
            <legend className="mb-1.5">Date type *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["use_by", "best_before"] as const).map((t) => (
                <label key={t} className={`flex h-10 cursor-pointer items-center justify-center rounded-lg border text-[13px] transition ${form.dateType === t ? "border-primary bg-mint text-primary-deep" : "hover:bg-muted"}`}>
                  <input type="radio" name="dateType" className="sr-only" checked={form.dateType === t} onChange={() => set("dateType", t)} />
                  {t === "use_by" ? "Use by" : "Best before"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          “Use by” relates to safety; “best before” relates to quality. Dates are a guide only — always check how food looks and smells.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-muted">Cancel</button>
          <button type="submit" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-deep">
            {isEdit ? "Save changes" : "Add to pantry"}
          </button>
        </div>
      </form>
    </div>
  );
}
