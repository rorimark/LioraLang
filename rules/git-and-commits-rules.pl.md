# Git i commity

[English](git-and-commits-rules.md) | [Русский](git-and-commits-rules.ru.md) | **Polski**

Historia wyjaśnia zmianę i powód. Commit to pełna część logiczna do sprawdzenia i cofnięcia bez niepowiązanej pracy.

## Przed zmianą

Sprawdź `git status`, gałąź i stan zdalny. Nie resetuj ani nie przenoś automatycznie cudzych zmian. Zwykle zadanie ma gałąź; jawne uzgodnienie pracy i publikacji w main ma pierwszeństwo.

Nazwa gałęzi opisuje zadanie i przestrzega bieżących instrukcji. Nie twórz kolejnej tylko do zapisania uzgodnionego etapu.

## Zawartość commita

Czytaj `git diff`, dodaj wybrane pliki/fragmenty, sprawdź `git diff --cached`. Unikaj ślepego `git add .` przy niepowiązanej pracy.

Zachowanie i potrzebne testy zwykle razem. Oddziel obcy refaktoring, nazwy i masowe formatowanie. Nie twórz commitów celowo niedziałających bez następnego.

Wykonaj odpowiednie kontrole. Nie deklaruj niewykonanych. Nie dodawaj tokenów, lokalnego env, baz, buildów i przypadkowych logów.

## Conventional Commits

```text
type(scope): krótki opis działania
```

| Typ | Zastosowanie |
| --- | --- |
| `feat` | Nowa funkcja |
| `fix` | Naprawa błędu |
| `refactor` | Przebudowa bez zmiany zachowania |
| `perf` | Sprawdzone przyspieszenie |
| `test` | Testy i ich infrastruktura |
| `docs` | Dokumentacja |
| `style` | Format kodu bez zmiany logiki |
| `build` | Kompilacja i zależności |
| `ci` | Automatyzacja CI |
| `chore` | Utrzymanie i przygotowanie wersji |
| `revert` | Cofnięcie opublikowanej zmiany |

Scope określa obszar, np. `srs`, `ai`, `cards`, `release`, `docs`. `style` nie służy redesignowi użytkownika; wybierz typ według zachowania.

```text
fix(srs): keep the card after a failed grade
feat(ai): add editable deck drafts
docs: refresh project guides
chore(release): prepare v0.9.1
```

Krótki tytuł bez końcowej kropki. Treść wyjaśnia powód, zgodność i kontrole. `!` lub `BREAKING CHANGE:` oznacza niezgodność z drogą migracji.

## Publikacja i historia

Publikuj ukończone etapy zgodnie z uzgodnieniem. Push nie zastępuje przeglądu staged. Sprawdź stan zdalny i zachowaj cudze commity przy integracji.

Rebase i squash własnej nieopublikowanej pracy są dozwolone. Nie przepisuj wspólnej historii i nie force-push main. Opublikowaną zmianę cofnij przez revert, chyba że ustalono inaczej.

Konflikt rozwiązuj rozumiejąc obie strony, nie wybierając całego ours/theirs dla kontynuacji. Powtórz kontrole.

## Opis dla recenzenta

Opisz problem i wynik, potem weryfikację i ważne ograniczenia. Dla osoby bez historii rozmowy. Pomijaj chronologię i porzucone opcje bez znaczenia.

Tag wydania zgadza się z `package.json`; główne notatki to `docs/releases/vX.Y.Z.md`, obok rosyjskie i polskie. [Wydawanie](../docs/onboarding.pl.md).
