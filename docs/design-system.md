# WorshipFlow UI system

Keep the forest-green identity and use the shared components before introducing new one-off styles.

## Foundations

`src/app/design-system.css` is the source of truth for light/dark theme tokens, the 4px spacing rhythm, control/card radii, card shadow, responsive page layout, typography, feedback colors, and theme-aware dialog/menu surfaces. `globals.css` owns resets, focus-visible behavior, print layouts, scrollbars, and reduced-motion rules; it does not contain theme-specific utility overrides.

- Background / recessed surface / raised card: `--background`, `--surface`, `--card`.
- Text / supporting text / borders: `--foreground`, `--muted`, `--border`.
- Primary action fill / hover: `--brand`, `--brand-dark`; readable accent text: `--brand-ink`.
- Keyboard focus: `--focus-ring`; destructive actions: `--danger-action`, `--danger-action-hover`, `--danger-foreground`.
- Light and dark values for every theme token live together at the top of `design-system.css`. Do not add route-specific dark-mode color overrides to `globals.css`.
- Feedback: `--success`, `--danger`, `--info`, each with a `-soft` background.
- Use one page h1, h2 for sections, then h3 for subsections. Keep descriptions at 14px with generous line height.
- Use 16px page gutters on phones, 24px on larger screens; section spacing is 24px / 32px.
- Default buttons and controls are at least 44px tall. Compact variants are for dense contextual actions.
- Retain existing `WorshipFlowLogo` and the root layout's PNG icon/Apple icon. Use `next/image` for local branding; keep authenticated remote media handling compatible with signed URLs.

## Components

| Component | Use |
| --- | --- |
| `PageContainer`, `PageHeader` | Responsive width/gutters, breadcrumbs, one page title, supporting description, action area |
| `Button`, `buttonVariants` | Buttons and links with primary, outline, secondary, ghost, link, or destructive appearance |
| `Input`, `Select`, `Textarea` | Theme-aware controls; associate labels and use `aria-describedby` for hints/errors |
| `Card`, `CardHeader`, `CardTitle`, `CardContent` | Related content and section headings |
| `EmptyState` | Explain empty vs filtered results and provide a clear next step |
| `Feedback` | Announce actual success/errors with an explanation and optional recovery actions |
| `Pagination` | Preserve existing filter URLs, show current range, disable unavailable directions |
| `Skeleton`, `WorkspaceListSkeleton` | Noninteractive loading placeholders; one accessible loading status |
| `FormSubmitButton` | Pending state, spinner, and duplicate-submit prevention through React form status |
| `ConfirmSubmitButton`, `ConfirmationDialog` | Native modal focus containment, Escape/cancel, description, explicit confirmation before submitting |
| `ProtectedForm` | Warn about unsaved edits on link navigation and page unload; never persist field values |

Use semantic elements when a wrapper is already a section/article/link; `wf-card` provides the same card surface without extra markup. Use `bg-[var(--card)]`, `bg-[var(--surface)]`, `text-[var(--foreground)]`, `text-[var(--muted)]`, `border-[var(--border)]`, and the focus token for new UI. A small compatibility layer maps the existing neutral `bg-white`, slate/gray text, border, and focus utility classes to those variables so older screens remain theme-consistent while being migrated. Do not use raw neutral color utilities for new surfaces. Keep existing layout-specific stage and print styles separate.

## Interaction rules

- One visually dominant primary action per page; use outlines for secondary navigation.
- Avoid disabled-looking links for available actions. Label icon-only buttons.
- Keep search/filter state in the URL; pagination must retain it. Clear-filter recovery must reset the page index.
- Show a success message only after an acknowledged server operation. Preserve permission checks, validation, error redirects, and server actions.
- Confirm deletions/removals with a precise description. Never put a second form inside a form.
- Apply `ProtectedForm` to the primary create/edit form, not GET filters or quick actions. It protects normal anchor navigation and reload/close; client router calls and browser same-document history traversal are not intercepted. It does not autosave drafts. Server validation redirects retain existing behavior.
- Use purposeful feedback motion only, respect reduced motion, and keep loading indicators hidden from print output.

## Validation

Run `npm test`, `npm run lint`, and `npm run build`. UI interaction tests in `tests/unit/ui-system.test.tsx` cover confirmation/cancellation, original submitter preservation, dirty-form checks, empty-state recovery, breadcrumbs, and pagination filter preservation. JSDOM tests mock native dialog opening/closing; real browser focus, layout, mobile resizing, and signed-in workflows still need browser verification.
