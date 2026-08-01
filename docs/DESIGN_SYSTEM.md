# StudySignal Design System

> **地位：** 視覺與體驗設計北極星。所有畫面、元件與設計決策以此為準。  
> **產品哲學：** [`PRODUCT.md`](./PRODUCT.md)  
> **實作 tokens：** `src/design-system/tokens.css`  
> **學習氛圍：** `src/design-system/atmosphere/`  
> **品牌語氣：** [`BRAND_VOICE.md`](./BRAND_VOICE.md)  
> **最後更新：** 2026-08-01

---

## Study Atmospheres

Not color themes — emotional learning environments. Students choose today’s atmosphere before studying.

| ID | Name | Feeling |
|----|------|---------|
| `warm-paper` | **Warm Paper** / ☀️ 暖紙模式 | Morning · notebook · coffee · warm sunlight |
| `night-study` | **Night Study** / 🌙 夜間學習 | Desk lamp · night reading · calm focus |
| `forest-focus` | **Forest Focus** / 🌲 森林專注 | Nature · deep concentration · relaxing green |
| `ocean-calm` | **Ocean Calm** / 🌊 海洋靜心 | Sea · breathe · reading · peace |

- UI language: **學習氛圍** — never “Theme” / “Light Mode” / “Dark Mode”.
- Picker: top-right → bottom sheet / popover (`SsAtmospherePicker`).
- Persist with `localStorage` key `studysignal.atmosphere` (migrates from legacy `studysignal.theme`).
- **Architecture:** mount `AtmosphereProvider` once in the root App Router `layout.tsx` (never per-page). Init script runs `beforeInteractive` to set `data-atmosphere` before hydration.
- DOM: `data-atmosphere` on `<html>` + `.ss-v1` (canonical); `data-theme` mirrored for compatibility.
- **Picker layout:** absolute top-right inside `.ss-phone-frame` (`max-w-lg`) — never `fixed` to the browser viewport.
- Transition: **500ms** elegant cross-fade via CSS variables.
- Components use CSS variables only. Add future atmospheres (Autumn, Winter, Spring, Summer, Space, Library, Minimal, Kids) as a registry entry + `[data-atmosphere="…"]` token block — no component changes.

### Atmosphere palettes

| Atmosphere | Background | Card | Primary | Accent |
|------------|------------|------|---------|--------|
| Warm Paper | `#F6F1E8` | `#FFFDF9` | `#4D7BF3` | — |
| Night Study | `#181715` | `#262320` | `#E8B86A` | — |
| Forest Focus | `#EEF5EE` | `#FAFFFA` | `#5A8F5A` | `#8EBE6E` |
| Ocean Calm | `#EDF7FA` | `#FCFFFF` | `#4D8FD8` | `#7CC4D8` |

Background, cards, buttons, icons, progress, and shadows all follow the active atmosphere tokens.

---

## Role

StudySignal is an AI learning companion that helps students **think independently** instead of giving answers directly.

Design must feel like opening a warm study notebook — calm guidance, never cold tech theater.

---

## Overall Style

| Be | Avoid |
|----|--------|
| Warm paper notebook | SaaS / admin dashboard |
| Calm & cozy | Finance / analytics chrome |
| Premium & minimal | Neon, glassmorphism, gaming UI |
| Friendly coach | Pure white walls |
| Muji + Apple polish | Heavy borders & dense grids |

---

## Color Palette

| Role | Hex | Token |
|------|-----|--------|
| App background | `#F6F1E8` | `--ss-bg` |
| Secondary background | `#FBF8F3` | `--ss-bg-elevated` |
| Card | `#FFFDF9` | `--ss-card` |
| Border | `#E8DFD1` | `--ss-border` |
| Primary | `#4D7BF3` | `--ss-primary` |
| Text | `#2E2A25` | `--ss-fg` |
| Text secondary | `#6E665D` | `--ss-fg-muted` |
| Text hint | `#9E968C` | `--ss-fg-hint` |
| Success | `#4CAF7D` | `--ss-success` |
| Warning | `#F4B860` | `--ss-warning` |
| Error | Muted red `#C47A6F` | `--ss-danger` |

Supporting:

| Role | Hex | Token |
|------|-----|--------|
| Primary hover | `#3F6DE6` | `--ss-primary-hover` |
| Primary soft | `#E8EEFC` | `--ss-primary-soft` |
| On primary | `#FFFDF9` | `--ss-on-primary` |
| Companion / AI soft | `#EEF3FC` | `--ss-ai-soft` |

**Page wash (Warm Paper):** `linear-gradient(180deg, #F8F5EF 0%, #F4EFE7 100%)` — almost invisible.  
**Never use pure `#FFFFFF` for page backgrounds.** Cards use warm `#FFFDF9`, not stark white.

### Night Study palette

| Role | Hex | Token |
|------|-----|--------|
| Background | `#181715` | `--ss-bg` |
| Secondary | `#201D1A` | `--ss-bg-elevated` |
| Card | `#262320` | `--ss-card` |
| Border | `#3A352F` | `--ss-border` |
| Primary (gold) | `#E8B86A` | `--ss-primary` |
| Title | `#F7EEDF` | `--ss-fg` |
| Body | `#D5C9B8` | `--ss-fg-muted` |
| Hint | `#9E9488` | `--ss-fg-hint` |
| Success | `#76C893` | `--ss-success` |
| Warning | `#F6C453` | `--ss-warning` |
| Danger | `#E57373` | `--ss-danger` |

Primary button (Night Study): gradient `#E8B86A` → `#D69F54` via `--ss-btn-primary-bg`.

---

## Typography

- Large welcoming / editorial headlines
- Comfortable reading (line-height ~1.5–1.65)
- Rounded modern font (Nunito / Nunito Sans)
- Plenty of breathing room — never dense dashboard type

---

## Components

- Paper cards: **24–28px** radius (`--ss-radius-lg` / `--ss-radius-xl`), soft shadow, light border
- Pill buttons with soft hover
- Outlined icons (avoid heavy fills)
- Comfortable spacing between cards
- **No heavy borders**

---

## Experience

Every page should feel:

- Like a premium education notebook
- Like a patient AI tutor / personal coach
- Like sitting at a clean wooden desk in a quiet library

The interface should **reduce stress** and **increase focus**.

---

## Mobile First

Design for phones first. Desktop is only an expanded version.

---

## Emotion

| Audience | Feeling |
|----------|---------|
| Students | “I want to study.” — not “I have to.” |
| Parents | “My child is accompanied.” — not “another dashboard.” |

**Brand keywords:** Warm · Calm · Hope · Growth · Gentle · Focused · Premium · Comfortable · Friendly · Minimal

**Microcopy map:** Progress → 今天完成了 · Statistics → 今天的成果 · Recommendation → AI 建議 · Dashboard → 今天  

**Never show “73% complete”** — use journey phrases (`progressVoice.ts`).  

Every screen should feel like a learning journal / AI companion — never software chrome.  
Voice rules: [`BRAND_VOICE.md`](./BRAND_VOICE.md).

Never design pages that feel cold, overly technical, or complicated.

---

## Decision Rule

Whenever there is a design decision, **always choose simplicity over decoration**.

The interface should disappear, allowing students to focus entirely on learning.

Every element must have a purpose.  
**If an element does not improve learning, remove it.**
