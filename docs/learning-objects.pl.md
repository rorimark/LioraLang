# Przedmioty, pola i wygląd fiszek

[English](learning-objects.md) | [Русский](learning-objects.ru.md) | **Polski**

LioraLang obsługuje języki, programowanie, matematykę i historię. Katalog ma rosnąć bez warunków w każdym formularzu i tabeli dla każdego przedmiotu.

## Wspólny wpis

Wpis ma wspólne `source`, `target`, tagi i przykłady lub notatki. Języki używają także poziomu, części mowy i trzeciego języka. Pola przedmiotu są w `subjectFields`.

Talia ma `subject` i własne `subjectFields`. Pusty przedmiot oznacza język. Historyczna nazwa `words` w kodzie, API i bazie nie ogranicza wpisu do słownictwa.

Przykładowe pola talii i wpis:

```json
{
  "subject": "programming",
  "subjectFields": {
    "technology": "Rust",
    "contentLanguage": "Polish"
  }
}
```

```json
{
  "source": "What is borrowing?",
  "target": "Dostęp do wartości przez referencję bez przenoszenia własności.",
  "subjectFields": {
    "code": "let reference = &value;",
    "codeSide": "back",
    "difficulty": "easy"
  }
}
```

`code` nie jest nową kolumną wspólnej logiki. Programming określa znaczenie i ograniczenia. Nie przenoś go do głównego wpisu dla jednego formularza.

## Odpowiedzialność profilu

Katalog to `packages/shared/src/core/usecases/subjects/`. `registry.js` rejestruje profile; `subjects.js` normalizuje pola i wybiera wygląd. Profil określa:

- ID i klucze tłumaczeń;
- pola talii/wpisu, typy, wartości, długości i domyślne ustawienia;
- podpisy stron i kierunki powtórek;
- obrazy i publikację w Hubie;
- możliwości AI, język i instrukcje;
- przód i tył z bloków;
- minimalne wersje pakietu dla nowych możliwości.

Rejestr sprawdza unikalne ID i kompletność. Import odrzuca nieznany przedmiot, aby starszy edytor nie usunął pól.

## Obecne przedmioty

| Przedmiot | Pola talii | Pola wpisu | Układ |
| --- | --- | --- | --- |
| Języki | Języki stron, trzeci język, uczona strona, strona obrazkowa | Słowo, tłumaczenie, CEFR, część mowy, przykłady, tagi, obraz | Znana fiszka językowa |
| Programowanie | `technology`, `contentLanguage` | `code`, `codeSide`, `difficulty`, pytanie, odpowiedź, notatki | Spokojny edytor i zakładka technologii |
| Matematyka | `area`, `contentLanguage` | `formula`, `formulaSide`, `steps`, `difficulty`, pytanie, odpowiedź | Siatka zeszytu, wzory i rozwiązanie |
| Historia | `period`, `contentLanguage` | `context`, `date`, `consequences`, `difficulty`, pytanie, odpowiedź | Archiwalna karta i kontekst |

`difficulty` wpisu opisuje materiał, nie trudność pamięci FSRS. Zmiana nie przepisuje harmonogramu.

## Technologie programowania

Technologia jest tekstem dowolnym. SQL, CSS, PHP, JavaScript, Rust, Java, C++, C i C# używają Programming. `profiles/technologyAppearances.js` wybiera zakładki, akcenty i szczegóły z normalizowanej technologii. Nieznane używają ogólnego wyglądu.

Bez kodu fiszka pokazuje duży termin lub pytanie. Kod ma panel z numerami oryginalnych linii i zawijaniem. Zawijanie nie zmienia zapisu. Kod nie jest wykonywany.

`codeSide` domyślnie to `front`. `back` ukrywa kod do odpowiedzi. Strona zostaje z kodem przez dodawanie, import i synchronizację.

## Matematyka

`formula` to LaTeX bez obramowania. `formulaSide` domyślnie to `back`, aby ukryć rozwiązanie. Równanie do rozwiązania można jawnie umieścić z przodu. `steps` zawiera kroki z tyłu.

Pytania, odpowiedzi, notatki i kroki łączą tekst i wzory: `$...$`, `\(...\)`, `$$...$$`, `\[...\]`. Parser oddziela matematykę od tekstu; lokalny KaTeX działa offline po zapisaniu zasobów. Błędny wzór pozostaje tekstem źródłowym. Kod i ceny nie powinny być rozpoznawane jako wzory.

Renderowanie używa `trust: false` i nie uruchamia poleceń użytkownika. Poprawny LaTeX nie dowodzi poprawnego rozwiązania; autor sprawdza obliczenia i rozumowanie.

## Historia

`period` określa kontekst talii, np. region lub epokę. `context` jest widoczny z przodu i nie może zdradzać odpowiedzi. `date` i `consequences` pojawiają się po odwróceniu. To osobne pola, nie przemianowany kod czy wzór.

## Język odpowiedzi

Talie niejęzykowe jawnie wybierają `contentLanguage` z obsługiwanych języków. JavaScript nie oznacza odpowiedzi angielskich, a język interfejsu nie określa treści.

AI otrzymuje wybór z profilem i kontekstem. Zmiana języka anuluje stare żądanie bez tłumaczenia zapisanych kart. Tworzenie i import zachowują wartość zamiast wyliczać ją z przeglądarki.

## UI i AI

Edytor, szybkie dodawanie i generator budują pola przez `subject-fields`. Typy: `text`, `multiline`, `code`, `formula`, `choice`. Strona kodu/wzoru należy do pola; przełączniki różnych kart nie wpływają na siebie.

`buildCardPresentation()` buduje bloki profilu. Renderowanie przypisuje typ do komponentu zamiast sprawdzać ID przedmiotu. Języki zachowują dawną ścieżkę.

Profil osobno deklaruje sugestie, temat, listę, opis i wskazówkę po błędzie. Ogólny przycisk AI nie włącza wszystkiego. Programowanie, matematyka i historia mają sugestie i talie tematyczne bez językowych list i wskazówek.

## Zapis i zgodność

Web i SQLite zapisują pola przedmiotu razem z treścią. Eksport, import, hash i synchronizacja uwzględniają niepuste pola. Domyślnych pól nie dodawaj niepotrzebnie do starych pakietów językowych.

Wersja pakietu zależy od użytych funkcji. Matematyka/historia wymagają formatu 6; programowanie może użyć starszego bez nowych pól. [Tabela wersji](deck-format.pl.md).

Jeden wpis pozostaje jednostką SRS. Zmiana układu, technologii i kierunku nie tworzy dziennika ani nie zeruje pamięci. Hub nadal obsługuje publikację języków, sprawdzaną w UI i wspólnej logice publikacji.

## Dodanie przedmiotu

1. Określ pola, podpisy i to, co ukryte do odsłonięcia.
2. Utwórz i zarejestruj profil. Używaj istniejących typów i bloków, chyba że nowy jest potrzebny.
3. Dodaj układ i style przez profil, zachowując wspólne sterowanie, oceny i dostępność.
4. Opisz język i AI; sprawdź też schemat i normalizację serwera.
5. Ustal wersję formatu, aby starszy klient jasno odrzucał nieobsługiwaną treść.
6. Dodaj dwanaście tłumaczeń interfejsu.
7. Sprawdź obie bazy, eksport/import, hash, prywatną synchronizację i Learn.
8. Sprawdź tworzenie/ocenę offline, telefon, oba motywy i stare języki.

Nowe klucze `subjectFields` same nie wymagają tabel ani migracji serwera. Indeksy, RLS, kontrakty i Hub mogą wymagać migracji. Nie każde rozszerzenie jest automatycznie bez migracji.

[Kontrole](onboarding.pl.md) · [AI](word-suggestions.pl.md) · [Zasady UI](../rules/ui-rules.pl.md)
