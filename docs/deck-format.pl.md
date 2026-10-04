# Pliki talii

[English](deck-format.md) | [Русский](deck-format.ru.md) | **Polski**

`.lioradeck` to JSON z materiałem talii. Umożliwia udostępnianie, przenoszenie i kopię treści, bez osobistej historii odpowiedzi, ustawień konta i całej bazy.

Wspólne funkcje są w `packages/shared/src/core/usecases/importExport/deckPackage.js`: `parseDeckPackageFileText`, `validateDeckPackageObject`, `buildExportDeckPackage`. Obie platformy ich używają.

## Struktura

```json
{
  "format": "lioralang.deck",
  "version": 1,
  "deck": {
    "name": "Travel words",
    "sourceLanguage": "English",
    "targetLanguage": "Polish",
    "tags": [
      "travel"
    ]
  },
  "words": [
    {
      "id": "ticket",
      "source": "ticket",
      "target": "bilet",
      "level": "A1",
      "part_of_speech": "noun",
      "examples": [
        "I bought a train ticket."
      ],
      "tags": [
        "transport"
      ]
    }
  ]
}
```

Eksport dodaje czas, hash, tożsamość synchronizacji i pochodzenie. Pozwól aplikacji wyliczyć `contentHash`; przykład pomija opcjonalne metadane.

Import przyjmuje też obsługiwane starsze `.lioralang`, `.json` i tablice wpisów. Aliasy wspierają stare pliki, nie nowy kontrakt. Między wersjami używaj eksportu aplikacji.

## Przedmioty

`deck.subject` określa przedmiot; brak lub pusta wartość oznacza język. Pola talii są w `deck.subjectFields`, wpisu w `word.subjectFields`.

```json
{
  "format": "lioralang.deck",
  "version": 5,
  "deck": {
    "name": "Rust basics",
    "subject": "programming",
    "subjectFields": {
      "technology": "Rust",
      "contentLanguage": "Polish"
    }
  },
  "words": [
    {
      "id": "borrowing",
      "source": "What is borrowing?",
      "target": "Dostęp przez referencję bez przenoszenia własności.",
      "subjectFields": {
        "code": "let reference = &value;",
        "codeSide": "back",
        "difficulty": "easy"
      }
    }
  ]
}
```

Matematyka i historia używają formatu 6. [Pola i wartości domyślne](learning-objects.pl.md). W JSON odwrotny ukośnik wymaga escape, np. `"x = \\pm 2"`.

## Przykłady matematyki i historii

Talia matematyczna ze wzorem z odpowiedzią:

```json
{
  "format": "lioralang.deck",
  "version": 6,
  "deck": {
    "name": "Pierwiastki kwadratowe",
    "subject": "mathematics",
    "subjectFields": {
      "area": "Algebra",
      "contentLanguage": "Polish"
    }
  },
  "words": [
    {
      "id": "roots",
      "source": "Rozwiąż $x^2 = 4$.",
      "target": "Dwa pierwiastki: $x = 2$ i $x = -2$.",
      "subjectFields": {
        "formula": "x = \\pm 2",
        "formulaSide": "back",
        "steps": "1. Wyciągnij pierwiastek.\n2. Uwzględnij oba znaki.",
        "difficulty": "easy"
      }
    }
  ]
}
```

Fiszka historyczna z datą i skutkami z tyłu:

```json
{
  "format": "lioralang.deck",
  "version": 6,
  "deck": {
    "name": "Rewolucja francuska",
    "subject": "history",
    "subjectFields": {
      "period": "Francja XVIII wieku",
      "contentLanguage": "Polish"
    }
  },
  "words": [
    {
      "id": "bastille",
      "source": "Kiedy zdobyto Bastylię?",
      "target": "14 lipca 1789 r.",
      "subjectFields": {
        "context": "Początek rewolucji francuskiej.",
        "date": "14 lipca 1789 r.",
        "consequences": "Stało się symbolem rewolucji.",
        "difficulty": "easy"
      }
    }
  ]
}
```

Kontekst jest widoczny przed odpowiedzią: nie umieszczaj tam pytanej daty. Eksport może pomijać domyślne pola, np. `formulaSide: "back"`.

## Wersje i zgodność

Obecny klient czyta formaty od 1 do 6. Eksport wybiera najmniejszą wersję wymaganą przez treść. Wersja aplikacji i formatu są różne.

| Format | Wymagana możliwość |
| --- | --- |
| 1 | Zwykłe talie językowe i starsze ze stroną obrazkową |
| 2 | Podstawowe programowanie |
| 3 | Kod na stronie odpowiedzi |
| 4 | Opcjonalny obraz obok zwykłego tekstu językowego |
| 5 | Jawny język odpowiedzi przedmiotu |
| 6 | Matematyka i historia |

Programowanie z językiem odpowiedzi i kodem z tyłu eksportuje format 5. Zwykłe języki bez nowych funkcji pozostają w 1.

Stary klient odrzuca nowy format, aby zapis nie zgubił kodu, obrazów lub języka. Nie obniżaj ręcznie wersji dla ominięcia ochrony. Nieznany przedmiot również jest odrzucany.

## Obrazy

Wpis zawiera `image: { assetId, alt }`. `assetId` używa SHA-256 bajtów. `media` zawiera wskazane obrazy z MIME i base64. Pliki niewskazane są pomijane.

`pictureSide` opisuje całą stronę z obrazów. Opcjonalny obraz zwykłej fiszki to inna możliwość i wymaga formatu 4. [Przetwarzanie obrazów](card-media.pl.md).

## Normalizacja i limity

| Limit | Wartość |
| --- | --- |
| Wpisy | 50 000 |
| Tagi talii lub wpisu | 10 |
| Przykłady wpisu | 1000 |
| Zwykłe pole tekstowe | 500 znaków |
| Opis talii | 2000 znaków |
| Pliki mediów | 10 000 |
| Jeden plik | 3 MiB |

Tekst przedmiotu ma limity profilu, np. 4000 znaków kodu. Normalizacja może przyciąć tekst i usunąć nieobsługiwane pola; sprawdź wynik przed dużym importem. Limity transportu zależą od adaptera i różnią się od formatu.

Języki są sprawdzane według dostępnych wartości. Przedmiot niejęzykowy nie potrzebuje pary języków. Strona obrazkowa może nie mieć tekstu; zwykła fiszka potrzebuje sensownej treści obu stron.

## Zgodne wpisy

- `skip`: zachowaj istniejący wpis.
- `update`: zastosuj import do zgodnego wpisu.
- `keep_both`: zachowaj oba.

Strategia musi być jawna. Import nie wybiera po cichu między utratą pól a duplikatem. Sprawdź zgodność, obrazy i pola przed potwierdzeniem.

## Kontrole zmiany formatu

Sprawdź stare pliki językowe, eksport/import każdego przedmiotu, hash po normalizacji, zapis IndexedDB i SQLite, media i odmowę starego klienta. Sam test budowania obiektu nie weryfikuje trwałego zapisu.

[Architektura](architecture.pl.md) · [Dane](platforms-and-storage.pl.md) · [Kontrole](onboarding.pl.md)
