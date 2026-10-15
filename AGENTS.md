<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Pantry state lives only in `src/components/loopan/PantryContext.tsx` (localStorage `loopan.pantry.v1`, loaded in useEffect); all pages/widgets read from it — single data model, avoids drift between dashboard and lists.
- Store only the expiry date (`expiresOn`, YYYY-MM-DD); compute days/status via helpers in `src/lib/pantry-data.ts` — labels must never be hardcoded.
- Scanners (`BarcodeScanner`, `ExpiryScanner`) only produce a `Prefill` and hand off to `ItemEditor`; saving always goes through the editor so validation/persistence stay in one place. Browser-only libs (@zxing, tesseract.js) are dynamically imported inside effects/handlers to keep SSR safe.
