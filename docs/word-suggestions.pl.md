# Asystent AI i generowanie talii

[English](word-suggestions.md) | [Русский](word-suggestions.ru.md) | **Polski**

AI pomaga tworzyć materiał bez planowania powtórek. Zapisane fiszki działają lokalnie; sugestie i generowanie wymagają konta, sieci i skonfigurowanego serwera.

Historyczna nazwa `suggest-word` obejmuje słowa, karty przedmiotowe, listy, tematy, opisy i objaśnienia.

## Ustawienia

**Ustawienia → Asystent AI** mają główny przełącznik i sześć osobnych:

| Ustawienie | Kontroluje |
| --- | --- |
| Sugestie słów | Automatyczne sugestie pustych pól językowej fiszki |
| Objaśnienia po Again | Pomoc po błędzie w obsługiwanym trybie językowym |
| Sugestie kart | Propozycje przedmiotowe z terminu, pytania lub kodu |
| Uzupełnianie listy | Uzupełnianie wklejonej listy językowej |
| Talie tematyczne | Generowanie nowej talii obsługiwanego przedmiotu |
| Opisy talii | Opisy i tagi talii językowych |

Główna preferencja to `appPreferences.aiAssistant.enabled`; osobne flagi są w `aiFeatures`. Normalizacja migruje dawne preferencje. `deckDefaults.wordSuggestions` nie jest już głównym źródłem stanu.

Wyłączenie głównego przełącznika blokuje żądania i oczekujące wyniki, zachowując wybory na później. Osobny przełącznik zatrzymuje tylko swoją funkcję. Spóźniony wynik nie stosuje się po zmianie talii, przedmiotu, języka lub wpisu.

Profile również określają możliwości. Włączenie list nie zmienia zadania matematycznego w listę językową.

## Funkcje i zadania

| Zadanie | Dostępne w | Wynik |
| --- | --- | --- |
| `word` lub brak task | Edytor językowy i szybkie dodawanie | Tłumaczenie, trzeci język, CEFR, część mowy, przykłady, tagi |
| `list` | Listy językowe | Partie do 30 wierszy |
| `topic` | Generator językowy | 10, 20 lub 30 słów według tematu i poziomu |
| `hint` | Po Again w nauce języków | Objaśnienie w języku interfejsu |
| `deck` | Talie językowe | Opis i tagi na podstawie do 40 słów |
| `concept` | Programowanie, matematyka, historia | Do trzech alternatywnych fiszek |
| `concept-topic` | Generator przedmiotowy | 5, 10 lub 20 kart według tematu i trudności |

Sugestia słowa zaczyna się po około 350 ms bez pisania. Proponuje puste pola bez zastępowania tekstu użytkownika. Można zastosować jedno pole, Tab całą sugestię, Escape ukryć.

Sugestie przedmiotowe wywołuje przycisk. Żądanie zawiera profil, termin lub pytanie, opcjonalny kod i kontekst talii. Kod nie jest wykonywany. Wynik jest walidowany według profilu formularza.

## Osobne okno generowania

Otwórz je z Nowej talii w Taliach lub szybkiego dodawania w Nauce. Tworzy nową talię, bez wyboru istniejącej i zwykłych zakładek dodawania.

Na szerokim ekranie ustawienia są z lewej, szkice z prawej, z osobnym przewijaniem. Ustawienia obejmują przedmiot, technologię lub kontekst, temat, język, liczbę i trudność lub CEFR. Telefon używa pionowego formularza z dostępnym działaniem tworzenia na dole.

Edytuj nazwę, opis, tagi i wszystkie pola fiszek; wybierz stronę kodu/wzoru, wyklucz lub usuń szkice. Przełączniki należą do konkretnej karty. Pokazana jest rzeczywista liczba także przy częściowym wyniku.

Nic nie zapisuje się przed potwierdzeniem. Tworzenie zapisuje talię i wybrane karty jednym `saveDeck`. Kolejna generacja, zmiany ustawień i zamknięcie nie mogą zastosować starej odpowiedzi.

`GenerateDeckDialog` jest w `src/features/quick-add-words/ui/QuickAddWordsDialog.jsx`, ze stylami `GenerateDeckDialog.css`. Model używa `creationOnly` w `useQuickAddWords`.

## Język odpowiedzi

Fiszki językowe korzystają z języków stron. Inne przedmioty używają jawnego `subjectFields.contentLanguage`. AI otrzymuje go z technologią, dziedziną lub okresem; serwer nie ufa sprzecznemu `writeIn` klienta.

Język interfejsu nie jest językiem odpowiedzi, poza `hint`. Zmiana nie tłumaczy zapisanych fiszek. Wyniki wcześniejszych żądań w innym języku są odrzucane.

## Serwer i limit

`supabase/functions/suggest-word/` waliduje sesję i żądanie, potem wywołuje Gemini. `GEMINI_API_KEY` jest tylko na serwerze. Opcjonalny `GEMINI_MODEL` ustawia preferowany model; inaczej wybierane są dostępne stabilne modele Flash z fallback.

JWT verification musi być włączone. Serwer dodatkowo sprawdza użytkownika i limit. Migracje `0004` i `0007` implementują zużycie i odczyt pozostałej liczby. Obecny limit: 300 żądań na konto na dzień UTC, widoczny w ustawieniach.

Limit liczy żądania funkcji, nie wygenerowane karty. Ponowienia i fallback dostawcy mogą wywołać kilka modeli w jednym przyjętym żądaniu. Licznik nie gwarantuje stałego kosztu ani darmowego działania.

Klient czeka 15 sekund na krótkie zadania, 45 na długie. Budżety serwera to około 13 i 42 sekundy. Timeout, brak konfiguracji, limit, sieć, logowanie i przeciążenie mają czytelne stany zamiast nieskończonego ładowania.

## Dane dla dostawcy

Zadanie może wysłać słowa, pytania, kod, temat, języki, kontekst przedmiotu, pola i próbkę słów do opisu. Generowanie wysyła więcej niż słowo i parę języków.

Sekret Gemini i klucz administracyjny Supabase nie trafiają do build web ani Electron. Żądania zawierają jednak materiał użytkownika. Nie umieszczaj sekretów w fiszkach wysyłanych do AI.

## Walidacja odpowiedzi

Żądania i wyniki są normalizowane i ograniczane długością oraz wartościami. Wynik tematu używa pól profilu i usuwa duplikaty lub niepasujące wpisy. Treść jest danymi, bez wykonania kodu i wstawiania dowolnego HTML.

Walidacja sprawdza strukturę, nie fakty. Poprawnie zapisany wzór, data lub kod mogą być błędne. Sprawdź znaczenie przed zapisem.

## Kod i weryfikacja

| Ścieżka | Cel |
| --- | --- |
| `packages/shared/src/config/aiFeatures.js` | Flagi i dostępność |
| `packages/shared/src/api/createSupabaseWordSuggestApi.js` | Żądania, timeout i błędy |
| `packages/shared/src/core/usecases/subjects/` | Pola, możliwości, język i instrukcje |
| `src/features/word-suggest/` | Sugestie i zastosowanie |
| `src/features/quick-add-words/` | Listy, tematy i generator |
| `supabase/functions/suggest-word/gemini.ts` | Żądanie słowa i wybór modeli |
| `supabase/functions/suggest-word/tasks.ts` | Pozostałe zadania i wynik strukturalny |

Uruchom odpowiednio `pnpm test:run`, `pnpm check:subject-assistant` i `pnpm check:subject-topic`. Scenariusze przeglądarki podstawiają wyniki i nie sprawdzają dostępności Gemini. Sesję, limit i przykładowe zadanie wdrożonej funkcji sprawdź osobno bez ujawniania sekretów.

Deployment musi zawierać względne importy profili z `packages/shared`. Aktualizacja strony nie wdraża Edge Function. [Konfiguracja serwera](../supabase/README.pl.md) · [Środowisko](onboarding.pl.md)
