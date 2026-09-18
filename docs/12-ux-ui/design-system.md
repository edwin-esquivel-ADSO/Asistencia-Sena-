# 12 — Design System

> [!NOTE] INSTRUCTIONS
> Replace the values below with this project's real decisions once the
> first two screens exist — a token nobody has used yet is a guess, not a
> standard. Delete this block once a second person has reviewed the
> accessibility target against the actual component library.

## Tokens

### Color

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#0B5FFF` | Primary actions: save, confirm, submit |
| `--color-danger` | `#D1293D` | Destructive actions: retire a product, void an invoice |
| `--color-success` | `#1E824C` | Confirmation banners: invoice issued, payment recorded |
| `--color-text` | `#1A1A1A` | Default body text |
| `--color-bg-surface` | `#FFFFFF` | Card and form backgrounds |

### Typography and spacing

| Token | Value | Use |
|---|---|---|
| `--font-size-h1` | `1.75rem` / 700 weight | Page titles, e.g. "Products" |
| `--font-size-body` | `1rem` / 400 weight | Table rows, labels, body copy |
| `--font-size-caption` | `0.8125rem` / 400 weight | Field hints, timestamps |
| `--space-unit` | `4px` | Base of the spacing scale: 4, 8, 16, 24, 32px |

## Component inventory

| Component | Used by | Notes |
|---|---|---|
| Button (primary / secondary / danger) | Every screen | One primary button per screen, at most |
| Data table | Product list, invoice list | Paginated, sortable by column |
| Form field with inline validation | Register product, issue invoice | Error message states the fix, not just the failure |
| Empty state | Product list, invoice list | Message plus the one action that fills it |

## Accessibility target

Target level: **WCAG 2.1 AA**.

| Aspect | Requirement |
|---|---|
| Contrast | 4.5:1 for normal text, 3:1 for large text and UI controls |
| Keyboard | Every interactive element reachable and operable without a mouse |
| Labels | Every form field has a programmatically associated label |

---

**Related:** [`./README.md`](./README.md) · [`./_template-screen.md`](./_template-screen.md)
