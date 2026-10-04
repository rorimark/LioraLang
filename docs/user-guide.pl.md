# Przewodnik użytkownika

[English](user-guide.md) | [Русский](user-guide.ru.md) | **Polski**

LioraLang przechowuje materiał w taliach i wyznacza powtórki każdej fiszki. Lokalna nauka nie wymaga rejestracji. Konto umożliwia synchronizację, publikację w Hubie i AI.

## Utwórz talię

Otwórz **Talie → Nowa talia** i wybierz przedmiot w edytorze. Wybór jest też dostępny przy tworzeniu talii przez szybkie dodawanie w **Nauce**. Wszystkie przedmioty korzystają z jednego formularza; nie ma osobnego punktu Programming.

Dla języków wybierz języki stron i opcjonalny trzeci język. Dla programowania ustaw technologię i język odpowiedzi; dla matematyki dziedzinę i język odpowiedzi; dla historii okres lub region i język odpowiedzi. Technologia może być dowolna, np. Rust, Python lub SQL.

Język odpowiedzi określa język objaśnień, także sugestii AI. Jest niezależny od języka interfejsu. Zmiana ustawienia nie tłumaczy istniejących fiszek.

Nadaj talii czytelną nazwę. Opis i tagi ułatwiają wyszukiwanie. Nową talię utwórz przyciskiem. Zmiany istniejącej talii zapisują się automatycznie; sprawdź stan zapisu przed zamknięciem.

## Dodaj fiszki

Wypełnij pytanie i odpowiedź. Pozostałe pola zależą od przedmiotu:

- Języki: tłumaczenie, przykłady, poziom, część mowy, tagi i obraz.
- Programowanie: opcjonalny kod, strona kodu, trudność i notatki.
- Matematyka: wzór, jego strona, kroki rozwiązania i trudność.
- Historia: kontekst z przodu, data i skutki z tyłu.

Kod i wzór umieszczone z odpowiedzią są ukryte do odsłonięcia. Nie umieszczaj rozwiązania w pytaniu lub kontekście historycznym, jeśli chcesz sprawdzić pamięć.

Szybkie dodawanie otwiera się też z Nauki. Talie językowe przyjmują wklejone listy z podglądem przed dodaniem. Enter tworzy nową linię w polach wielowierszowych; Ctrl/Command + Enter dodaje fiszkę. Formularz językowy umożliwia szybkie dodawanie przez Enter.

## Wzory w tekście

Fiszki matematyczne mogą łączyć tekst i LaTeX:

```text
Rozwiąż $x^2 = 4$.
Odpowiedź: \(x = \pm 2\).
Wzór ogólny:
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

W polu wzoru użyj LaTeX bez `$`. W tekście użyj `$...$` lub `\(...\)` w wierszu, a `$$...$$` lub `\[...\]` w osobnym bloku. Niepoprawny zapis pozostaje widocznym tekstem do edycji. Wzory nie są obliczane automatycznie.

## Nauka i powtórki

Wybierz talię w **Nauce**, przeczytaj pytanie i spróbuj przypomnieć odpowiedź przed odsłonięciem. Oceń wynik:

| Ocena | Kiedy ją wybrać |
| --- | --- |
| Again | Nie pamiętasz lub odpowiedź była błędna |
| Hard | Przypominasz sobie z dużym wysiłkiem |
| Good | Przypominasz sobie normalnie |
| Easy | Odpowiedź była oczywista |

Przyciski pokazują planowany odstęp do powtórki. Ocena dotyczy jednej fiszki, także po zmianie kierunku tłumaczenia albo prezentacji tekstowej na obrazkową.

Ustawienia sesji kontrolują kierunki i prezentacje dostępne dla przedmiotu. Ustawienia nauki określają dzienne limity nowych kart i powtórek. Cel dzienny jest wskazówką i nie blokuje kroków nauki. Dodatkowa sesja pomija limity bez pobierania kart z przyszłym terminem.

Swobodne przeglądanie nie zmienia harmonogramu. [Szczegóły SRS](srs.pl.md).

## Wygeneruj talię

Otwórz **Talie → Nowa talia → Zbierz talię z AI**. W Nauce użyj szybkiego dodawania i działania generowania talii. Nazwy przycisków zależą od języka interfejsu.

1. Wybierz przedmiot, temat, język odpowiedzi i kontekst.
2. Ustaw liczbę fiszek oraz dostępny poziom lub trudność.
3. Rozpocznij generowanie.
4. Sprawdź pytania, odpowiedzi i dodatkowe pola. Popraw błędy, wyklucz lub usuń zbędne szkice.
5. Utwórz talię. Wcześniej szkice nie są zapisane w bibliotece.

Programowanie, matematyka i historia oferują 5, 10 lub 20 fiszek; języki 10, 20 lub 30 słów. Model może zwrócić mniej, a okno pokaże rzeczywistą liczbę. Sprawdź poprawność i powtórzenia.

**Ustawienia → Asystent AI** zawierają główny przełącznik. Po włączeniu dostępne są osobne ustawienia sugestii słów, objaśnień po Again, sugestii kart, uzupełniania listy, talii tematycznych i opisów. Część funkcji obsługuje tylko języki. [Szczegóły AI](word-suggestions.pl.md).

## Import, eksport i Hub

Import przyjmuje `.lioradeck`, starsze `.lioralang` i obsługiwane pliki JSON. Przy zgodnych wpisach wybierz pominięcie, aktualizację lub zachowanie obu. Sprawdź przedmiot, języki i strategię zgodności przed potwierdzeniem.

Eksport zawiera materiał talii i dołączone obrazy. Służy udostępnianiu, ale nie jest pełną kopią konta ani historii powtórek. [Format i zgodność](deck-format.pl.md).

Hub zawiera publiczne talie językowe. Możesz zobaczyć zawartość, dodać talię i zgłosić niewłaściwy materiał. Programowania, matematyki i historii nie można jeszcze publikować.

## Offline i kilka urządzeń

Najpierw odwiedź web z internetem, aby zapisać zasoby. Talie, fiszki, obrazy i oceny są na urządzeniu. Desktop też korzysta z lokalnej bazy. AI, pobieranie z Huba, logowanie i wymiana z kontem potrzebują sieci.

Konto synchronizuje talie i postępy. Zmiany offline czekają na kolejną wymianę. Równoczesna edycja może utworzyć kopię konfliktową; porównaj ją z główną talią przed usunięciem. Synchronizacja nie zastępuje eksportu ważnych materiałów.

## Rozwiązywanie problemów

| Problem | Co sprawdzić |
| --- | --- |
| Brak fiszek w kolejce | Czy talia ma fiszki, czy są już do powtórki i czy osiągnięto limit dzienny? |
| AI nie odpowiada | Konto, połączenie, główny i osobny przełącznik, pozostały limit |
| Stary desktop nie importuje | Zaktualizuj aplikację; nowszy format chroni pola przed starym edytorem |
| Zniknęły lokalne talie web | Czy usunięto dane strony lub używasz innego profilu przeglądarki? |
| macOS nie instaluje aktualizacji | Pobierz wydanie ręcznie; automatyczna instalacja wymaga podpisu |

Przy powtarzającym się problemie zapisz kroki, wersję, platformę i treść błędu. Nie dołączaj niepotrzebnie tokenów konta, sekretów i prywatnych talii.
