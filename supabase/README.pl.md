# Backend Supabase

[English](README.md) | [Русский](README.ru.md) | **Polski**

Supabase obsługuje konta, prywatne biblioteki, postęp, Hub i AI. Lokalna nauka nie zależy od jego dostępności. Ten katalog zawiera migracje SQL i Edge Functions; wdrożenie strony nie stosuje ich automatycznie.

## Migracje

Stosuj pliki kolejno i sprawdzaj historię wykonanych migracji. Przed zmianą istniejącego projektu zrób kopię i przejrzyj zmiany. Nie usuwaj automatycznie starych danych, aby przejść na nowy model własności.

| Plik w `migrations/` | Dodaje |
| --- | --- |
| `20260331_0001_auth_hub_foundation.sql` | Profile, właścicieli Hub, wersje talii, RLS i publiczny magazyn |
| `20260427_0002_account_sync_foundation.sql` | Urządzenia, prywatną bibliotekę, wersje i zdarzenia postępu |
| `20260427_0003_account_sync_storage.sql` | Prywatny bucket plików i zasady dostępu |
| `20261001_0004_word_suggestion_allowance.sql` | Śledzenie dziennego limitu AI |
| `20261001_0005_hub_picture_decks.sql` | Publikację językowych talii obrazkowych i limity plików Hub |
| `20261001_0006_hub_reports.sql` | Zgłoszenia, ukrywanie i moderację |
| `20261001_0007_word_suggestion_allowance_read.sql` | Odczyt pozostałego limitu i jedno źródło jego wielkości |

Publiczny Hub używa bucketu `decks`, prywatna biblioteka `user-library-decks`. RLS i zasady magazynu ograniczają prywatne dane do właściciela. Pola przedmiotów są przenoszone w pakietach JSON; nowy przedmiot sam w sobie nie wymaga kolejnej tabeli.

## Konfiguracja klienta i Auth

Klient otrzymuje tylko `VITE_SUPABASE_URL` i `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. Klucz jest publiczny; uprawnienia administracyjne nie mogą od niego zależeć. Skonfiguruj dozwolone redirect URL dla OAuth w web i desktop.

Publikowanie i zgłoszenia wymagają konta z potwierdzonym adresem. Anonimowe logowanie nie zastępuje modelu własności. Przy przenoszeniu starszego serwera osobno sprawdź wcześniejsze rekordy i zasady, zamiast uruchamiać bezwarunkowe czyszczenie.

## Edge Functions

### suggest-word

`functions/suggest-word/` obsługuje słowa, listy, tematy, podpowiedzi, opisy i generowanie dla przedmiotów. Używa Gemini i wymaga serwerowego sekretu `GEMINI_API_KEY`; `GEMINI_MODEL` jest opcjonalny.

Pozostaw włączoną weryfikację JWT. Funkcja dodatkowo sprawdza użytkownika, format żądania i limit. Obecnie konto ma 300 przyjętych żądań na dobę UTC; `word_suggestion_allowance()` zwraca pozostały limit.

Serwer importuje wspólny katalog przedmiotów z `packages/shared`. Sprawdź, czy bundler uwzględnia te względne zależności. Inaczej strona może znać przedmiot, który funkcja odrzuca. Po wdrożeniu wykonaj rzeczywiste żądanie dla każdego zmienionego task. [Kontrakty AI](../docs/word-suggestions.pl.md).

### delete-account

`functions/delete-account/` sprawdza token przez Auth, wymaga potwierdzenia adresem użytkownika, usuwa jego pliki z obu bucketów, a następnie konto. Powiązane wiersze są usuwane kaskadowo. Lokalnych talii na urządzeniach nie zmienia.

Używa serwerowego `SUPABASE_SERVICE_ROLE_KEY`, dostarczanego przez Supabase. Nie udostępniaj tego klucza klientowi. Weryfikacja JWT pozostaje włączona. Usuwanie sprawdzaj na osobnym koncie testowym.

## Polecenia wdrożenia

Właściciel projektu wykonuje je z katalogu głównego repozytorium, używając zalogowanego Supabase CLI. Zastąp `PROJECT_REF` identyfikatorem swojego projektu. Flagi sprawdzono w pomocy CLI 2.117.0; przed użyciem innej wersji sprawdź jej `--help`.

Najpierw przejrzyj planowane migracje:

```sh
supabase db push --project-ref PROJECT_REF --dry-run
```

Po sprawdzeniu listy i wykonaniu kopii zastosuj migracje:

```sh
supabase db push --project-ref PROJECT_REF
```

Sekrety serwera umieść w lokalnym pliku poza Git, np. `.env.supabase.local`. Nie wpisuj prawdziwych kluczy do instrukcji, historii powłoki ani logów.

```sh
supabase secrets set --project-ref PROJECT_REF --env-file .env.supabase.local
supabase functions deploy suggest-word --project-ref PROJECT_REF
supabase functions deploy delete-account --project-ref PROJECT_REF
```

Nie używaj `--no-verify-jwt` dla tych funkcji. Bundling zależy od środowiska CLI: sprawdź obecność wspólnych plików we wdrożeniu i wynik na projekcie testowym. Repozytorium nie zawiera wspólnego `supabase/config.toml`; własny lokalny stos skonfiguruj osobno.

## Zgłoszenia i moderacja Hub

Potwierdzony użytkownik może zgłosić publiczną talię raz. Trzech różnych zgłaszających powoduje ukrycie talii. Ponowna publikacja przez właściciela nie znosi blokady.

Administrator może odczytać podsumowanie w SQL Editor:

```sql
select * from public.hub_deck_report_summary;
```

`moderate_hub_deck(uuid, text)` przyjmuje `hide`, `restore` lub `remove`. Zwykły klient nie może jej wywołać. Przywrócenie odkrywa talię i czyści zgłoszenia; usunięcie kasuje wiersz, a obsługa pliku magazynu jest osobną czynnością. Aby ukryć wybraną talię:

```sql
select public.moderate_hub_deck('DECK_UUID'::uuid, 'hide');
```

`DECK_UUID` jest przykładowym oznaczeniem, nie poprawnym UUID. Przed operacją administracyjną sprawdź wybraną talię.

## Sprawdzanie dostępu

Na danych testowych sprawdź dwóch użytkowników, odczyt cudzej prywatnej talii i pliku, dostęp bez sesji, niepotwierdzony adres, powtórzone zdarzenie postępu, limit, ukrytą talię i usuwanie konta. Wyłączenie przycisku nie zastępuje RLS ani kontroli serwera.

[Magazyn i synchronizacja](../docs/platforms-and-storage.pl.md) · [Konfiguracja klienta](../docs/onboarding.pl.md) · [Znane ograniczenia](../docs/code-audit.pl.md)
