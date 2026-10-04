# Liora interface rules

**English** | [Русский](ui-rules.ru.md) | [Polski](ui-rules.pl.md)

The interface helps people add and recall material. Each screen makes its location, important information and available action clear. These rules cover the shared design and subject-specific compositions.

## Shared style

Learn is a desk with one card. Language cards use lined paper, programming a calm editor, mathematics a notebook grid and history an archive sheet. Subjects have distinct details but share controls, grades and tactile feedback.

Other screens stay quiet: one UI font, consistent colours and controls. Avoid an administrative dashboard with a frame around the whole page and nested decorative boxes. Frames belong to objects: forms, tables, cards or floating menus.

Avoid glow, noisy gradients and meaningless badges. Edges and restrained shadows provide depth. Panels do not automatically need shadows; study cards and floating layers can use them.

## Tokens, buttons and text

Controls resemble keys: a 2 px border and a bottom edge through `--edge-width`, usually 4 px. Hover lifts them 1 px, pressing moves them down 2 px with a response around 60 ms. Enable hover only for `hover: hover`.

Use `--radius-panel`, usually 20 px, and `--radius-control`, usually 12 px. Take colours, sizes, spacing, shadows and layers from tokens. Support light, dark and system themes.

Nunito is the UI font, inherited by buttons and fields. Headings generally use weight 900, buttons 800, labels 700 or 800. Code is monospace; subject styling may use another font inside card content.

Use Button from `@shared/ui`: primary, secondary, ghost and danger. Give each block one primary action. Grades always appear as Again, Hard, Good, Easy: red, amber, blue, green, with their own semantic tokens and edges.

Every control needs normal, hover, active, focus, disabled and loading states. Show a 3 px focus outline using `--color-primary-border`. Colour must not be the only state indicator.

## Layout and navigation

Navigation is on the left on wide screens and tablets, at the bottom on portrait phones, and as icons on the left in short landscape windows. Respect safe areas on all sides. Mark the active section with its icon and a short blue marker without an extra background.

Clicking an active item again must not reset data or scroll. Keep the phone toolbar compact; secondary actions may use icons with accessible names.

Flexible flex/grid containers need `min-height: 0`, `min-width: 0` and `minmax(0, 1fr)` so content can scroll inside them. Avoid accidental horizontal page scrolling.

Learn cards measure their own container through container queries. Aim for 5:3 on wide screens and a taller portrait shape, with maximum width 1440 px. Grades must fit alongside the card. Content may use the card's own `cqi` units.

Check phones, tablets, landscape and 2560 px width. Do not truncate a deck title to one letter when space allows more.

## Forms and saving

Use form, label and button elements with the correct type. Placeholders do not replace labels. Put errors beside fields and explain how to fix input. Set suitable autocomplete.

New decks require explicit creation. Existing decks save changes automatically with a clear status. Do not claim a save before it completes.

The quick language-card path uses a word and translation; extra fields live under More details. Do not replace an unknown level with A1. Enter advances and adds an entry in language forms; in code, answers and other multiline fields it inserts a line, while Ctrl/Command + Enter adds a card.

Parse pasted lists and show them before saving. Never silently remove or merge duplicates. Sequential additions and undo preserve existing cards' `subjectFields`. Keep input after errors.

Build subject fields from profiles. Choose answer language explicitly, separately from interface language and technology. Code and formulas may accompany the question or answer; never reveal answers on the front.

## Settings

Use `SettingRow`, `SettingGroup` and shared controls. Put the name and short hint on the left and control on the right. Omit a group heading if it repeats the section or describes a single obvious row.

| Data | Control |
| --- | --- |
| On or off | SettingSwitch |
| Two to six short options | SettingSegmented |
| Number | SettingStepper |
| Long list | SettingSelect |
| Free text | Full-width field |

Hints explain actual behaviour changes. On wide screens, sections and content scroll independently. Narrow screens show the section list first, then the selected section with a back action. `?tab=` preserves browser navigation.

Show current values through `buildSettingsSummaries`. Search names, hints and keywords; matching a group may reveal the whole group. Wrap custom content in `SettingContent`. Account remains separate above search.

AI settings start with a master switch. Individual functions are available while it is on. Turning it off preserves preferences and blocks late responses.

## Selects and dialogs

Use shared Select rather than a separate implementation. It accepts option children and calls `onChange` with `target.name` and `target.value`. On computers the list appears above or below the field; on phones it opens a bottom sheet.

Render floating lists through a portal into body so ancestors' transforms or container queries cannot alter fixed coordinates. Provide search from nine options. On phones, focus search only when tapped so the keyboard does not immediately cover options.

Arrows open and navigate the list, Enter selects, Escape closes it and Tab moves on. These events must not also flip a card or close an outer dialog. Mark selection with a label and check mark.

Dialogs need a heading, accessible name, managed focus and focus restoration on close. Escape closes the nearest active layer. Confirm loss of unsaved input where it can actually occur.

## Deck generation window

New-deck generation uses a separate window: subject, context, topic, language, count and difficulty, then editable drafts. Do not include ordinary quick-add tabs or an existing-deck selector.

On desktop, settings and drafts scroll independently. Phones use a vertical form with creation accessible at the bottom. Nothing is saved before confirmation.

Each draft has its own side, inclusion and removal controls. Show the actual selected card count. Explain quota, offline state, sign-in, errors and cancellation near the action. Do not replace the user's text until they apply a suggestion.

## Progress, charts and stickers

Shared `buildLearningStats` calculates statistics from platform data. Do not invent percentages or examples to fill an empty screen. Distinguish unique learned cards from answers.

Charts use `--chart-*`, clear labels and a legend for multiple series. Leave gaps between bars, usually at least 2 px. Provide an accessible description and data table. Validate palettes through the shared validator instead of arbitrary component colours.

Calendars show whole weeks: 17, 26, 39 or 53 according to space and data age. Use one tab stop, arrows, a clear tooltip and live description. Measure the container and update geometry when resized.

Deck progress has stable pages of six, in two columns on wide screens. Long names may truncate with a full title, but row heights must not jump. Keep numbers readable.

Shared `buildAchievements` calculates stickers. Eight families have their own thresholds; never award stickers just to fill an album. Event achievements use logs, while content-dependent achievements are recalculated. Streak progress uses the current streak; totals use the overall result.

Earned stickers have colour, a white edge and slight tilt. Locked stickers are straight, dotted and understandable. Text and icons fit completely, with label contrast at least 4.5:1. Tilts and masks must not crop numbers or long labels. Achievement history belongs to the profile.

## Account and sync

The account card uses shared statistics and achievements; its calendar adapts to 17 or 12 available weeks. Calculate pointer tilt through requestAnimationFrame and transform, not a new React render on every movement.

The account flip shows one side and swaps it at the edge, avoiding reliance on backface alone in Firefox. Guests see a clear preview and sign-in. Unconfirmed accounts can resend confirmation.

Background sync must not flash Syncing on every pass. Prominent loading is for manual or first sync; errors and offline state remain visible. Queue refresh must not briefly hide the current study card.

## Tables and pages

Catalogs use shared `CardCatalogPagination`: back, page and next on narrow screens. Do not wrap labels letter by letter. Keep the page in the URL, preserve it on return, reset it on filter changes and clamp it when the list shrinks.

Sorting, empty states, errors and loading preserve layout. Deletion clearly states what is removed and whether recovery is possible.

## Animation and accessibility

Animations support actions without delaying calculations or saving. Use a separate copy through `useLeavingCard` for departing cards, with a cleanup timeout if animationend never arrives.

Animate transform and opacity; tactile edges may change width. Spring curves suit lifting and appearing, ordinary ease suits colour. `prefers-reduced-motion` removes movement; retain end-event dependencies with a short fade or another reliable completion.

Touch targets are at least 44 by 44 px. Focus is visible, tab order predictable, and input does not accidentally zoom. Tabs, menus, tooltips and modals need correct roles and relationships. Unlabelled icons need aria-label. Colour alone must not communicate a key result.

## Translations and writing

Write short, concrete text naming the action. Do not expose internal protocol or implementation names in product forms unless useful. Avoid long dashes in documentation and new text: use sentences, colons or rewrite. Maintain English primary documentation and complete Russian and Polish versions.

Get `/app` strings through `t()` from the i18n catalog. Add each key to English and the other 11 languages. Brand, author and user-provided names are data, not translation strings.

Use forms selected by `Intl.PluralRules`, not a number joined to a universal word. ru, uk and pl need one/few/many/other, cs one/few/other, ja other. Format dates, percentages, numbers and sizes through `useI18n`, without hardcoded en-US.

Pure models return keys or accept a formatter; do not import React just to translate. Errors carry `i18nKey`. Mark incomplete languages `pending: true` and omit them from selection. Defaults follow the system or browser, then English.

The landing has a URL per language, static HTML, canonical, hreflang, OG, JSON-LD, sitemap and robots. First render works without window, document and localStorage. New locales require checking prerender and `vercel.json`, not just the language list.

Check long labels on phones in at least en, de, pl and ja. Catalogs need matching keys, placeholders and nonempty translations. Use `pnpm check:i18n` and catalog tests.

## When a UI task is complete

Check the main path, loading, empty, error and success states; new and existing decks; keyboard and touch; phones and landscape; both themes and long translations. Controls follow shared components, fields persist and errors keep input.

[User guide](../docs/user-guide.md) · [Subjects](../docs/learning-objects.md) · [Checks](../docs/onboarding.md)
