# LioraLang

> Języki: [English (default)](README.md) | [Русский](README.ru.md) | **Polski**

Przestań zbierać słówka, które znikają z pamięci po kilku dniach.

**LioraLang to aplikacja, po której trudno wrócić do starego sposobu nauki.**
Zamienia Twoje prawdziwe słownictwo w codzienny, skuteczny system: własne talie, mocne fiszki, spaced repetition i pełną kontrolę nad danymi offline.

Jeśli naprawdę chcesz szybciej mówić i rozumieć język, LioraLang staje się Twoim codziennym narzędziem, a nie kolejną aplikacją „na chwilę”.

## Dlaczego nie będziesz chcieć uczyć się bez tego

- Uczysz się **swoich słów**, a nie przypadkowych list.
- Dane są lokalne: bez wymuszonej chmury i bez zależności od serwera.
- Tworzysz talie pod realne cele: praca, rozmowy, podróże, egzaminy, przeprowadzka.
- Duże fiszki z płynnym odwracaniem pomagają utrzymać skupienie.
- Możesz importować/eksportować talie i udostępniać je innym.

## Co dostajesz

- Tryb `Learn` z dużymi fiszkami i animacją odwracania.
- System `Decks`: tworzenie, edycja, zmiana nazwy, usuwanie, import, eksport.
- Strony talii z filtrowaniem i paginacją.
- Edytor talii: języki, opis, tagi i tabela słów.
- Sekcja `Progress` z nowoczesnymi wykresami.
- Motyw jasny i ciemny.
- Desktop-first architektura z lokalną bazą SQLite.

## Dla kogo

- Dla osób zmęczonych schematycznymi aplikacjami do nauki.
- Dla tych, którzy chcą świadomie rozwijać słownictwo.
- Dla użytkowników ceniących prywatność i lokalne dane.
- Dla każdego, kto buduje system nauki na miesiące i lata.

## Typowy flow

1. Tworzysz talię pod konkretny cel.
2. Dodajesz słowa, tłumaczenia, tagi i przykłady z życia.
3. Uczysz się codziennie w trybie `Learn`.
4. Ulepszasz talię, eksportujesz i udostępniasz.
5. Powtarzasz, aż słownictwo staje się nawykiem.

## Format importu/eksportu

LioraLang obsługuje pakiet talii z metadanymi i listą słów.
Minimalnie wymagane pole słowa: `source`.

```json
{
  "format": "lioralang.deck",
  "version": 1,
  "deck": {
    "name": "Travel Basics",
    "description": "Core words for travel",
    "sourceLanguage": "English",
    "targetLanguage": "Polish",
    "tertiaryLanguage": "Russian",
    "tags": ["travel", "starter"]
  },
  "words": [
    {
      "id": "w1",
      "source": "apple",
      "target": "jablko",
      "tertiary": "яблоко",
      "level": "A1",
      "part_of_speech": "noun",
      "tags": ["food", "basic"],
      "examples": ["I eat an apple."]
    }
  ]
}
```

## Opcjonalnie: samodzielny build

### Wymagania

- Node.js 20+
- pnpm 10+

### Instalacja

```bash
pnpm install
```

### Uruchomienie

```bash
pnpm run dev
```

### Build instalatorów

```bash
pnpm run build
pnpm run dist:test
```

Instalatory będą dostępne w folderze `release/`.

## Troubleshooting

### Electron failed to install correctly

```bash
pnpm approve-builds
pnpm install
```

### better-sqlite3 NODE_MODULE_VERSION mismatch

```bash
pnpm run rebuild:native
```

### Biały ekran w wersji packaged (`index-*.js/css` not found)

```bash
pnpm run build
pnpm run dist:test
```
