# Images on cards

**English** | [Русский](card-media.ru.md) | [Polski](card-media.pl.md)

Images are card content stored locally. They must work offline, travel in deck files and sync across devices.

## Two uses

**Picture-side decks.** `pictureSide` chooses front or back. That side shows an image instead of a language; the other stays textual. Study can go from picture to word or word to picture.

**A picture alongside text.** Ordinary language cards keep word and translation, with an optional image presentation. Sessions can show text or image; cards without images use text.

Presentations share one SRS schedule. Switching appearance does not create another entry. These capabilities currently belong to language profiles, not every subject.

## Stored data

Entries contain `image: { assetId, alt }`. Alt text supports accessibility and a clear missing-image state. Bytes do not go into word text.

`assetId` is a SHA-256 hash of content. Equal bytes can share media. Web stores binary data in `mediaAssets`; SQLite uses `media_assets`, with entry references in `image_json`.

UI gets local URLs through the repository. Revoke object URLs on replacement and close. Subscribers refresh missing images when downloaded without losing the card.

## File preparation

`packages/shared/src/lib/media/prepareImage.js` converts supported raster inputs to WebP with JPEG fallback. Input supports JPEG, PNG, WebP, GIF, AVIF and BMP; package validation checks the saved bytes. SVG is not used.

| Parameter | Value |
| --- | --- |
| Maximum input | 25 MiB |
| Full image longest side | 1280 px |
| Thumbnail longest side | 320 px |
| Target full-image size | About 450 KiB, depending on compression |
| Maximum media asset in a package | 3 MiB |

Canvas conversion removes original metadata. Animated GIFs and original bytes are not promised; the card stores the prepared image.

## Export and import

Export includes only referenced assets in `media`, with base64, MIME type and ID. Import checks limits, bytes and references. A missing image must not discard text.

Legacy picture-side decks stay format 1. Ordinary language cards with optional images require format 4 to prevent older editors dropping them. [File compatibility](deck-format.md).

## Sync and Hub

Private sync uploads images before referencing packages into closed `user-library-decks`, scoped by user and hash. Downloads verify hashes. Unavailable files retain references and a clear placeholder.

Public Hub supports language decks with pictures, including picture-side decks, using `20261001_0005_hub_picture_decks.sql`. Programming, mathematics and history remain blocked by subject publishing capabilities, not a universal image ban.

Local unused assets wait at least a day before cleanup. Remote cleanup waits seven days and checks current packages to avoid deleting in-use assets during sync.

## Checks and limits

Check preparation, deduplication, replacement/deletion, export/import, missing-asset download and offline display. `pnpm check:media` covers desktop persistence; unit tests cover preparation and exchange. [Commands](onboarding.md).

AI does not currently generate images. A helper contract alone does not mean a user-facing feature exists.
