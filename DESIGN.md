# PALPASS institutional design tokens

These tokens are the only color, type, and radius source for light and dark. They do not change civic workflows, fees, wallet RPCs, or authentication gates.

## Color

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--brand-900` | `#064e3b` | `#34d399` | Sovereign identity, official header |
| `--brand-700` | `#047857` | `#10b981` | Primary buttons and active links |
| `--gold-700` | `#b45309` | `#f59e0b` | State seal, active step, revenue stamp |
| `--surface` | `#fafaf9` | `#0c0f0e` | Page background |
| `--surface-raised` | `#ffffff` | `#141917` | Cards and raised containers |
| `--border` | `#e7e5e4` | `#26302c` | 1px hairline |
| `--text` | `#1c1917` | `#ecefed` | Primary text |
| `--text-muted` | `#57534e` | `#9aa5a0` | Secondary and guidance text |
| `--danger` | `#dc2626` | `#f87171` | Critical and judicial actions |
| `--warning` | `#d97706` | `#fbbf24` | Pending accreditation and temporary states |

Shadcn aliases (`--background`, `--foreground`, `--card`, `--primary`, `--gold`, `--destructive`, `--muted-foreground`) point at these tokens. Do not introduce a second palette in components.

## Radius and space

Controls are 4px (`--radius-sm`). Cards and larger radius steps are 8px. Spacing stays on a 4/8px grid. Borders are 1px.

## Type

Files live in `src/fonts/` and load only through `next/font/local` with `display: swap`. No Google Fonts stylesheet.

- IBM Plex Sans Arabic (400, 500, 600, 700) is the interface face for Arabic and English. CSS variable: `--font-plex`.
- Noto Naskh Arabic (400, 700) is reserved for certificates, ministerial decisions, and the smart identity card. Class: `font-document`. CSS variable: `--font-naskh`.

Both families are under the SIL Open Font License. National ID numbers, shekel amounts, and table dates use `tabular-nums`.

## Direction

`html` sets `dir` from the locale. New layout uses logical properties only: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`. Physical `ml-*`, `mr-*`, `left-*`, and `right-*` still appear in older screens; the inventory is in `AUDIT.md`.

## Theme

The first paint reads the saved `theme` key (or the system preference) and sets `.dark` before the body draws, so the wrong theme does not flash. `next-themes` keeps the same storage key.

## What is not part of the visual language

Loud gradients, glass blur, blobs, emoji, and colored shadows are not tokens. Utility classes named `.glass` and `.text-gradient` remain in `globals.css` only until the component phases stop calling them. New screens do not use them.
