# Obrazy na fiszkach

[English](card-media.md) | [Русский](card-media.ru.md) | **Polski**

Obraz jest treścią fiszki zapisaną lokalnie. Musi działać offline, być przenoszony w pliku talii i synchronizowany.

## Dwa zastosowania

**Talia ze stroną obrazkową.** `pictureSide` wybiera przód lub tył. Ta strona pokazuje obraz zamiast języka, druga tekst. Nauka może prowadzić od obrazka do słowa lub odwrotnie.

**Obraz obok tekstu.** Zwykła fiszka językowa zachowuje słowo i tłumaczenie z opcjonalną prezentacją obrazkową. Sesja wybiera tekst lub obraz; bez obrazka używa tekstu.

Prezentacje mają jeden harmonogram SRS. Zmiana wyglądu nie tworzy kolejnego wpisu. Obecnie te możliwości należą do języków, nie każdego przedmiotu.

## Zapisane dane

Wpis zawiera `image: { assetId, alt }`. Alt zapewnia dostępność i czytelny brak obrazu. Bajty nie są w tekście słowa.

`assetId` to SHA-256 zawartości. Identyczne bajty mogą współdzielić media. Web zapisuje dane binarne w `mediaAssets`; SQLite w `media_assets`, ze wskazaniem wpisu w `image_json`.

UI otrzymuje lokalne URL przez repozytorium. Object URL są zwalniane po zamianie i zamknięciu. Subskrybenci odświeżają pobrane obrazy bez utraty karty.

## Przygotowanie pliku

`packages/shared/src/lib/media/prepareImage.js` konwertuje rastry do WebP z JPEG fallback. Obsługuje JPEG, PNG, WebP, GIF, AVIF i BMP; walidacja pakietu sprawdza zapisane bajty. SVG nie jest używany.

| Parametr | Wartość |
| --- | --- |
| Maksymalny plik wejściowy | 25 MiB |
| Dłuższy bok obrazu | 1280 px |
| Dłuższy bok miniatury | 320 px |
| Docelowy rozmiar obrazu | Około 450 KiB, zależnie od kompresji |
| Maksymalny zasób w pakiecie | 3 MiB |

Canvas usuwa oryginalne metadane. Nie gwarantuje animacji GIF ani oryginalnych bajtów; karta zapisuje przygotowany obraz.

## Eksport i import

Eksport zawiera tylko wskazane zasoby w `media`, z base64, MIME i ID. Import sprawdza limity, bajty i powiązania. Brak obrazu nie może usuwać tekstu.

Starsze talie ze stroną obrazkową pozostają w formacie 1. Zwykłe fiszki z opcjonalnymi obrazami wymagają formatu 4, aby stary edytor ich nie zgubił. [Zgodność plików](deck-format.pl.md).

## Synchronizacja i Hub

Prywatna wymiana wysyła obraz przed pakietem do zamkniętego `user-library-decks`, według użytkownika i hashu. Pobranie sprawdza hash. Niedostępny plik zachowuje wskazanie i czytelny widok zastępczy.

Publiczny Hub obsługuje talie językowe z obrazami, w tym stroną obrazkową, przez `20261001_0005_hub_picture_decks.sql`. Programowanie, matematyka i historia są blokowane możliwościami profilu, nie ogólnym zakazem obrazów.

Lokalne nieużywane pliki czekają co najmniej dobę na usunięcie. Zdalne czyszczenie czeka siedem dni i sprawdza aktualne pakiety, aby nie usuwać zasobów w użyciu podczas wymiany.

## Kontrole i ograniczenia

Sprawdź przygotowanie, współdzielenie, zamianę/usunięcie, eksport/import, pobranie brakującego pliku i widok offline. `pnpm check:media` sprawdza zapis desktop; testy jednostkowe przygotowanie i wymianę. [Polecenia](onboarding.pl.md).

AI nie generuje obecnie obrazów. Sam kontrakt pomocniczy nie oznacza dostępnej funkcji użytkownika.
