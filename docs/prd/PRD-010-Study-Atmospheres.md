# PRD-010 — Study Atmospheres

> **Status:** Implemented (visual experience)  
> **Scope:** Design system / UI only — no product functionality changes  
> **Related:** [`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md), DEC-011

## Objective

Transform the Theme System into a premium **Study Atmosphere** system. Each atmosphere creates a different emotional learning experience. Transitions feel elegant and premium.

## Atmospheres

| ID | Label | Feeling |
|----|-------|---------|
| `warm-paper` | ☀️ 暖紙模式 | Morning · notebook · coffee · warm sunlight |
| `night-study` | 🌙 夜間學習 | Desk lamp · night reading · calm focus |
| `forest-focus` | 🌲 森林專注 | Forest · nature · deep concentration |
| `ocean-calm` | 🌊 海洋靜心 | Sea · breathe · reading · peace |

## Acceptance criteria

1. Theme language replaced by Study Atmosphere / 學習氛圍.
2. Top-right picker opens a bottom sheet (mobile) / centered panel (desktop).
3. Each option shows icon, description, preview color; selected shows checkmark.
4. All surfaces (bg, cards, buttons, icons, progress, shadows) follow atmosphere tokens.
5. Atmosphere change animates ~500ms.
6. Selection persists in `localStorage` (`studysignal.atmosphere`).
7. Architecture is `AtmosphereProvider` + registry; new atmospheres need registry + token block only.

## Out of scope

New features, pages, navigation, backend, or AI behavior.
