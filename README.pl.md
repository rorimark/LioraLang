# LioraLang

[English](README.md) · [Русский](README.ru.md)

LioraLang pomaga uczyć się z własnych fiszek. Utwórz talię, dodaj materiał i wracaj do niego, gdy nadejdzie termin powtórki. Aplikacja działa w przeglądarce i na komputerze. Nauka lokalna nie wymaga konta.

[Otwórz aplikację](https://liora-lang.vercel.app/app/learn) · [Pobierz wersję na komputer](https://github.com/rorimark/LioraLang/releases/latest) · [Dokumentacja](docs/README.md)

## Czego możesz się uczyć

| Przedmiot | Zawartość fiszki |
| --- | --- |
| Języki | Słowo, tłumaczenie, opcjonalny trzeci język, przykłady, poziom CEFR, część mowy, tagi i obrazy |
| Programowanie | Termin lub pytanie, odpowiedź, opcjonalny kod, trudność i notatki |
| Matematyka | Zadanie lub reguła, odpowiedź, wzory LaTeX i kroki rozwiązania |
| Historia | Pytanie, kontekst, odpowiedź, data i skutki |

Każdy przedmiot ma własne pola edytora i układ fiszki. Programowanie korzysta ze spokojnego wyglądu edytora z zakładkami dla SQL, CSS, PHP, JavaScript, Rust, Java, C++, C i C#. Możesz też wpisać inną technologię.

Wzory są wyświetlane w pytaniach, odpowiedziach i objaśnieniach oraz w osobnym polu wzoru. Kod jest tylko wyświetlany, nigdy uruchamiany. Kod lub wzór możesz umieścić przy pytaniu albo przy odpowiedzi, aby nie pokazywać rozwiązania za wcześnie.

## Jak zacząć

1. Utwórz lub zaimportuj talię w **Taliach**. Wybierz przedmiot i, dla talii innych niż językowe, język odpowiedzi.
2. Dodaj fiszki w edytorze lub z ekranu **Nauka**. Do talii językowej możesz wkleić listę słów.
3. Odsłoń odpowiedź i wybierz Again, Hard, Good lub Easy. FSRS-5 wyznaczy następną powtórkę.
4. W **Postępach** sprawdzaj aktywność, nadchodzące powtórki i zdobyte naklejki.
5. Eksportuj plik `.lioradeck`, aby udostępnić talię lub zachować jej kopię.

AI może zaproponować pojedynczą fiszkę albo wygenerować talię w osobnym oknie. Przed zapisaniem możesz poprawić wszystkie szkice. Główny przełącznik i sześć przełączników funkcji znajdziesz w **Ustawieniach → Asystent AI**. Potrzebne są konto, internet i dostępny limit dzienny. Obecny limit serwera wynosi 300 żądań na konto na dobę według UTC; dostępność dostawcy może dodatkowo ograniczać usługę.

## Dane i praca bez internetu

Wersja przeglądarkowa przechowuje talie, historię powtórek i obrazy w IndexedDB. Pierwsze uruchomienie wymaga internetu, aby zapisać pliki aplikacji do pracy offline. Wyczyszczenie danych strony może usunąć lokalne talie. Eksportuj ważne materiały.

Aplikacja komputerowa korzysta z SQLite. Gotowe wydania są dostępne dla macOS na Apple Silicon i Windows x64. Nie mają jeszcze podpisu cyfrowego. Na macOS aktualizacje trzeba pobierać ręcznie, ponieważ automatyczna instalacja wymaga podpisu.

Opcjonalne konto synchronizuje bibliotekę i postępy między urządzeniami. Publiczny Hub przyjmuje obecnie talie językowe, również z obrazami. Programowanie, matematyka i historia obsługują eksport oraz prywatną synchronizację, ale nie publikację w Hubie.

Interfejs jest dostępny po angielsku, ukraińsku, rosyjsku, polsku, niemiecku, hiszpańsku, francusku, włosku, portugalsku, turecku, czesku i japońsku. Język interfejsu, język odpowiedzi i technologia programowania to osobne ustawienia.

## Uruchomienie projektu

Użyj Node.js w wersji co najmniej 22.12 i pnpm 10.33.0. Node.js 24 również działa.

```sh
git clone https://github.com/rorimark/LioraLang.git
cd LioraLang
pnpm install --frozen-lockfile
pnpm dev:web
```

Otwórz `http://localhost:5175`. Aby uruchomić Electron, użyj `pnpm dev`. Jeśli moduł SQLite wymaga przebudowania, najpierw uruchom `pnpm rebuild:native`.

Lokalny edytor i powtórki nie wymagają konfiguracji Supabase. Konto, Hub, synchronizacja i AI jej wymagają. Konfigurację, testy i wydawanie wersji opisuje [przewodnik programisty](docs/onboarding.md).

## Dalsza dokumentacja

Dokumenty techniczne są obecnie po rosyjsku.

- [Przewodnik użytkownika](docs/user-guide.md): talie, nauka, AI i typowe problemy.
- [Architektura](docs/architecture.md): React, wspólna logika i usługi platformowe.
- [Przedmioty i fiszki](docs/learning-objects.md): rozszerzanie katalogu przedmiotów.
- [Format pliku talii](docs/deck-format.md): zgodność, przykłady i limity importu.
- [SRS](docs/srs.md), [obrazy](docs/card-media.md), [AI](docs/word-suggestions.md), [dane i synchronizacja](docs/platforms-and-storage.md).
- [Historia wydań](docs/releases/README.md) i [zasady pracy z kodem](rules/code-and-components-rules.md).

Dokumentacja opisuje wersję 0.9.1. Informacje o starszych wydaniach dotyczą funkcji dostępnych w danej wersji.
