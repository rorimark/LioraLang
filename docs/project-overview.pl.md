# Opis produktu

[English](project-overview.md) | [Русский](project-overview.ru.md) | **Polski**

LioraLang pomaga zapamiętywać własny materiał za pomocą fiszek i powtórek rozłożonych w czasie. Podstawowy cykl to dodanie materiału, przypomnienie odpowiedzi, ocena i powrót w wyznaczonym terminie.

Aplikacja obsługuje słowa i wyrażenia, programowanie, reguły i zadania matematyczne, wydarzenia historyczne oraz związki przyczynowe. Użytkownik wybiera materiał lub sprawdza szkice zaproponowane przez AI.

## Możliwości wersji 0.9.1

- Tworzenie, edycja, szybkie dodawanie, import i eksport talii.
- Cztery przedmioty z własnymi polami i układami: języki, programowanie, matematyka i historia.
- FSRS-5, limity dzienne, ustawienia sesji, swobodne przeglądanie i dodatkowe sesje.
- Obrazy na fiszkach językowych i talie z całą stroną obrazkową.
- LaTeX w tekście matematycznym i osobne pole wzoru.
- AI do sugestii językowych, kart innych przedmiotów i generowania talii z edycją szkiców.
- Postępy, kalendarz aktywności i naklejki za osiągnięcia.
- Opcjonalne konto, prywatna synchronizacja, urządzenia i publiczny Hub talii językowych.
- Web z pamięcią offline, wydania na macOS Apple Silicon i Windows x64.
- Jasny i ciemny motyw, responsywna nawigacja i dwanaście języków interfejsu.

## Różnice między przedmiotami

Fiszki językowe opierają się na słowie i tłumaczeniu. Programowanie używa terminu, pytania i opcjonalnego kodu w spokojnym panelu edytora. Matematyka pokazuje wzory i kroki rozwiązania. Historia korzysta z kontekstu, dat i skutków.

Przedmiot określa edytor i układ fiszki. Technologia zmienia wygląd programowania bez tworzenia osobnych przedmiotów SQL, PHP czy Rust. Dowolne technologie korzystają z ogólnego profilu Programming.

Język interfejsu nie określa języka odpowiedzi. Talie inne niż językowe mają osobny język treści, którego przestrzega AI. [Szczegóły przedmiotów](learning-objects.pl.md).

## Funkcje lokalne i online

Edycja, przeglądanie, powtórki, statystyki i pliki talii działają lokalnie. Web używa IndexedDB, desktop SQLite. Web wymaga pierwszej wizyty online do zapisania zasobów.

Konto, synchronizacja, Hub i AI używają serwera. AI wysyła odpowiedni materiał dostawcy i wymaga połączenia. Prywatna synchronizacja obsługuje wszystkie obecne przedmioty; publiczny Hub obecnie obsługuje języki.

## Ograniczenia produktu

Kod fiszki nie jest wykonywany, a wzory nie są automatycznie rozwiązywane. AI może się mylić, więc szkice wymagają sprawdzenia. Nie ma wbudowanego modelu lokalnego, generowania obrazów, pełnego importu PDF ani automatycznego wydobywania kart z dowolnych stron.

Wyczyszczenie danych przeglądarki może usunąć bibliotekę lokalną. Eksport talii nie jest kopią konta. Równoczesna edycja może tworzyć kopie konfliktowe. Wydania desktop nie są podpisane, a aktualizacje macOS instaluje się ręcznie.

## Dodawanie funkcji

Dodaj przedmiot, gdy ma użyteczne różnice w polach lub sposobie przypominania. Profil powinien je opisywać, działać offline i zachowywać dane po eksporcie, imporcie oraz synchronizacji. Usługi i harmonogram pozostają wspólne.

Kroki implementacji opisują [architektura](architecture.pl.md) i [przedmioty](learning-objects.pl.md). [Przewodnik użytkownika](user-guide.pl.md) pokazuje codzienną pracę.
