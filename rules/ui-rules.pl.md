# Zasady interfejsu LioraLang

[English](ui-rules.md) | [Русский](ui-rules.ru.md) | **Polski**

Interfejs pomaga dodawać i przypominać sobie materiał. Każdy ekran jasno wskazuje miejsce, ważne informacje i dostępne działanie. Zasady obejmują wspólny wygląd oraz układy zależne od przedmiotu.

## Wspólny styl

Learn przypomina biurko z jedną kartą. Języki zachowują papier w linie, programowanie spokojny edytor, matematyka kratkę zeszytu, a historia kartę archiwalną. Przedmioty różnią się szczegółami, ale mają wspólne sterowanie, oceny i odczucie naciskania.

Pozostałe ekrany są spokojne: jedna czcionka interfejsu, spójne kolory i kontrolki. Unikaj panelu administracyjnego z ramką wokół całej strony i zagnieżdżonymi ozdobnymi pudełkami. Ramki należą do obiektów: formularzy, tabel, kart i pływających menu.

Nie używaj poświaty, krzykliwych gradientów ani bezcelowych plakietek. Głębię tworzą krawędzie i umiarkowany cień. Panele nie wymagają cienia same w sobie; można go użyć pod kartą do nauki i pływającymi warstwami.

## Tokeny, przyciski i tekst

Kontrolki przypominają klawisze: obramowanie 2 px i dolna krawędź przez `--edge-width`, zwykle 4 px. Hover podnosi o 1 px, naciśnięcie opuszcza o 2 px z reakcją około 60 ms. Włącz hover tylko przy `hover: hover`.

Używaj `--radius-panel`, zwykle 20 px, i `--radius-control`, zwykle 12 px. Kolory, rozmiary, odstępy, cienie i warstwy pochodzą z tokenów. Obsługuj motywy light, dark i system.

Czcionką interfejsu jest Nunito, dziedziczona przez przyciski i pola. Nagłówki zwykle mają wagę 900, przyciski 800, etykiety 700 lub 800. Kod jest monospace; treść karty może używać kroju właściwego dla przedmiotu.

Używaj Button z `@shared/ui`: primary, secondary, ghost i danger. Każdy blok ma jedno główne działanie. Oceny zawsze występują w kolejności Again, Hard, Good, Easy: czerwony, bursztynowy, niebieski, zielony, z własnymi tokenami semantycznymi i krawędziami.

Każda kontrolka potrzebuje stanów normal, hover, active, focus, disabled i loading. Fokus jest widoczny: outline 3 px z `--color-primary-border`. Kolor nie może być jedynym wskaźnikiem stanu.

## Układ i nawigacja

Na szerokich ekranach i tabletach nawigacja znajduje się po lewej, na telefonach pionowych na dole, a w niskich oknach poziomych po lewej jako ikony. Uwzględniaj safe-area ze wszystkich stron. Aktywną sekcję oznaczają ikona i krótki niebieski znacznik bez dodatkowego tła.

Ponowne kliknięcie aktywnej pozycji nie resetuje danych ani przewinięcia. Pasek telefonu jest zwarty; drugorzędne działania mogą używać ikon z dostępnymi nazwami.

Rozciągane kontenery flex/grid używają `min-height: 0`, `min-width: 0` i `minmax(0, 1fr)`, aby treść przewijała się wewnątrz. Unikaj przypadkowego przewijania strony w poziomie.

Karta Learn mierzy własny kontener przez container queries. Na szerokim ekranie punktem odniesienia jest 5:3, w pionie karta jest wyższa; maksymalna szerokość to 1440 px. Oceny mieszczą się razem z kartą. Treść może używać jednostek `cqi` samej karty.

Sprawdzaj telefon, tablet, orientację poziomą i szerokość 2560 px. Nie skracaj nazwy talii do jednej litery, jeśli dostępne miejsce pozwala pokazać więcej.

## Formularze i zapis

Używaj form, label i button z właściwym type. Placeholder nie zastępuje etykiety. Błąd umieszczaj przy polu i wyjaśniaj sposób poprawy. Ustaw odpowiedni autocomplete.

Nowa talia powstaje po wyraźnym działaniu. Istniejąca zapisuje zmiany automatycznie i pokazuje czytelny status. Nie ogłaszaj zapisu przed zakończeniem operacji.

Szybka ścieżka karty językowej obejmuje słowo i tłumaczenie; dodatkowe pola są pod Więcej szczegółów. Nie zamieniaj nieznanego poziomu na A1. Enter przechodzi dalej i dodaje wpis w formularzu językowym; w kodzie, odpowiedzi i innych polach wielowierszowych tworzy linię, a Ctrl/Command + Enter dodaje kartę.

Wklejoną listę najpierw przetwórz i pokaż użytkownikowi. Nie usuwaj ani nie łącz duplikatów po cichu. Kolejne dodawanie i cofanie zachowują `subjectFields` istniejących kart. Po błędzie zachowaj wpisaną treść.

Pola przedmiotu wynikają z profilu. Język odpowiedzi wybiera się jawnie, osobno od języka interfejsu i technologii. Kod i wzór mogą być przy pytaniu albo odpowiedzi; przód nie ujawnia odpowiedzi.

## Ustawienia

Używaj `SettingRow`, `SettingGroup` i wspólnych kontrolek. Nazwa i krótka wskazówka są po lewej, kontrolka po prawej. Pomiń nagłówek grupy, jeśli powtarza sekcję lub opisuje jeden oczywisty wiersz.

| Dane | Kontrolka |
| --- | --- |
| Włączone lub wyłączone | SettingSwitch |
| Od dwóch do sześciu krótkich opcji | SettingSegmented |
| Liczba | SettingStepper |
| Długa lista | SettingSelect |
| Dowolny tekst | Pole na całą szerokość wiersza |

Wskazówka wyjaśnia rzeczywistą zmianę zachowania. Na szerokich ekranach lista sekcji i treść przewijają się niezależnie. Na wąskich najpierw pojawia się lista, potem sekcja z powrotem. `?tab=` zachowuje nawigację przeglądarki.

Pokazuj bieżące wartości przez `buildSettingsSummaries`. Wyszukiwanie obejmuje nazwy, wskazówki i słowa kluczowe; dopasowanie grupy może odkrywać całą grupę. Nietypową treść opakuj w `SettingContent`. Konto pozostaje osobną pozycją nad wyszukiwaniem.

Ustawienia AI zaczynają się od głównego przełącznika. Poszczególne funkcje są dostępne, gdy jest włączony. Wyłączenie zachowuje preferencje i blokuje spóźnione odpowiedzi.

## Select i okna dialogowe

Używaj wspólnego Select zamiast osobnej implementacji. Przyjmuje elementy option i przekazuje `onChange` z `target.name` i `target.value`. Na komputerze lista pojawia się nad lub pod polem, na telefonie jako panel od dołu.

Pływającą listę renderuj portalem w body, aby transform lub container query przodka nie zmieniały współrzędnych fixed. Od dziewięciu opcji zapewnij wyszukiwanie. Na telefonie wyszukiwarka otrzymuje fokus po dotknięciu, aby klawiatura nie zasłaniała od razu opcji.

Strzałki otwierają listę i przesuwają wybór, Enter wybiera, Escape zamyka, Tab przechodzi dalej. Te zdarzenia nie mogą jednocześnie odwracać karty ani zamykać zewnętrznego okna. Zaznaczenie ma etykietę i znak wyboru.

Okno ma nagłówek, dostępną nazwę, zarządzany fokus i jego przywrócenie po zamknięciu. Escape zamyka najbliższą aktywną warstwę. Potwierdzaj utratę niezapisanego tekstu tam, gdzie rzeczywiście jest możliwa.

## Okno generowania talii

Generowanie nowej talii ma osobne okno: przedmiot, kontekst, temat, język, liczba i trudność, a potem edytowalne szkice. Nie dodawaj zakładek zwykłego szybkiego dodawania ani wyboru istniejącej talii.

Na komputerze ustawienia i szkice przewijają się niezależnie. Telefon ma pionowy formularz z dostępnym na dole tworzeniem. Nic nie zapisuje się przed potwierdzeniem.

Każdy szkic ma własne ustawienia strony, uwzględnienia i usunięcia. Pokazuj rzeczywistą liczbę wybranych kart. Limit, brak sieci, logowanie, błąd i anulowanie wyjaśniaj przy działaniu. Nie zastępuj tekstu użytkownika, dopóki nie zastosuje sugestii.

## Postęp, wykresy i naklejki

Statystyki oblicza wspólne `buildLearningStats` na danych platform. Nie wymyślaj procentów ani przykładów do wypełnienia pustego ekranu. Rozróżniaj unikalne poznane karty i liczbę odpowiedzi.

Wykresy używają `--chart-*`, czytelnych etykiet i legendy przy kilku seriach. Zachowaj odstęp między słupkami, zwykle co najmniej 2 px. Zapewnij dostępny opis i tabelę danych. Paletę sprawdza wspólny walidator, nie przypadkowe kolory komponentu.

Kalendarz pokazuje pełne tygodnie: 17, 26, 39 lub 53 zależnie od miejsca i wieku danych. Ma jeden punkt w kolejności Tab, strzałki, czytelny tooltip i opis live. Mierz kontener i aktualizuj geometrię po zmianie rozmiaru.

Postęp talii ma stabilne strony po sześć, na szerokim ekranie w dwóch kolumnach. Długie nazwy można skrócić z pełnym title, ale wysokości wierszy nie mogą skakać. Liczby pozostają czytelne.

Naklejki oblicza wspólne `buildAchievements`. Osiem rodzin ma własne progi; nie przyznawaj nagród tylko dla wypełnienia albumu. Osiągnięcia zdarzeniowe korzystają z dziennika, a zależne od bieżącej treści są przeliczane. Seria korzysta z bieżącej serii, sumy z całego wyniku.

Zdobyta naklejka jest kolorowa, z białą krawędzią i lekkim pochyleniem. Zablokowana jest prosta, przerywana i zrozumiała. Tekst i ikony mieszczą się w całości, kontrast etykiet wynosi co najmniej 4.5:1. Pochylenie i maska nie obcinają liczb ani długich podpisów. Historia osiągnięć należy do profilu.

## Konto i synchronizacja

Karta konta używa wspólnych statystyk i osiągnięć; kalendarz dopasowuje się do 17 lub 12 dostępnych tygodni. Pochylenie za wskaźnikiem obliczaj przez requestAnimationFrame i transform, bez nowego renderowania React przy każdym ruchu.

Odwracanie karty konta pokazuje jedną stronę i zmienia ją przy krawędzi, aby nie polegać tylko na backface w Firefox. Goście widzą jasny podgląd i logowanie. Niepotwierdzony adres pozwala wysłać potwierdzenie ponownie.

Synchronizacja w tle nie miga napisem Syncing przy każdym przebiegu. Wyraźne ładowanie dotyczy ręcznej lub pierwszej synchronizacji; błędy i brak sieci pozostają widoczne. Odświeżenie kolejki nie chowa na moment bieżącej karty.

## Tabele i strony

Katalog używa wspólnego `CardCatalogPagination`: wstecz, strona i dalej na wąskich ekranach. Etykiety nie zawijają się po literze. Numer strony jest w URL, powrót go zachowuje, zmiana filtra resetuje, a skrócenie listy ogranicza do poprawnego zakresu.

Sortowanie, pusty stan, błąd i ładowanie zachowują układ. Usuwanie jasno wskazuje obiekt i możliwość odzyskania.

## Animacja i dostępność

Animacje wspierają działanie bez opóźniania obliczeń i zapisu. Dla wychodzącej karty używaj osobnej kopii przez `useLeavingCard`, z limitem czasu usunięcia, jeśli animationend nie nadejdzie.

Animuj transform i opacity; dotykowa krawędź może zmieniać szerokość. Krzywa sprężynowa pasuje do podnoszenia i pojawiania, zwykłe ease do koloru. `prefers-reduced-motion` usuwa ruch; zależność od zdarzenia końca zachowaj krótkim wygaszeniem albo innym pewnym zakończeniem.

Obszar dotyku ma co najmniej 44 na 44 px. Fokus jest widoczny, kolejność Tab przewidywalna, pola nie wywołują przypadkowego powiększenia. Zakładki, menu, tooltip i modal mają właściwe role i relacje. Ikona bez etykiety otrzymuje aria-label. Kolor nie może sam przekazywać kluczowego wyniku.

## Tłumaczenia i teksty

Teksty są krótkie, konkretne i nazywają działanie. Nie pokazuj wewnętrznych nazw protokołów i implementacji w formularzach bez korzyści dla użytkownika. Unikaj długich myślników w dokumentacji i nowych tekstach: użyj zdań, dwukropków lub przebuduj frazę. Utrzymuj główną dokumentację angielską oraz pełne wersje rosyjską i polską.

Teksty `/app` pobieraj przez `t()` z katalogu i18n. Nowy klucz dodaj do en i pozostałych 11 języków. Marka, autor i nazwa użytkownika są danymi, nie tekstem do tłumaczenia.

Liczbę mnogą określają formy wybierane przez `Intl.PluralRules`; nie sklejaj liczby z jednym uniwersalnym słowem. ru, uk i pl potrzebują one/few/many/other, cs one/few/other, ja other. Daty, procenty, liczby i rozmiary formatuj funkcjami `useI18n`, bez sztywnego en-US.

Czyste modele zwracają klucze lub przyjmują formatter, bez importowania React dla tłumaczeń. Błędy przekazują `i18nKey`. Niepełny język oznacz `pending: true` i pomiń w wyborze. Domyślny język pochodzi z systemu lub przeglądarki, potem z angielskiego.

Landing ma osobny URL każdego języka, statyczny HTML, canonical, hreflang, OG, JSON-LD, sitemap i robots. Pierwsze renderowanie działa bez window, document i localStorage. Nowa lokalizacja wymaga sprawdzenia prerender i `vercel.json`, nie tylko listy języków.

Sprawdzaj długie etykiety na telefonie co najmniej w en, de, pl i ja. Katalogi mają zgodne klucze, placeholders i niepuste tłumaczenia. Używaj `pnpm check:i18n` i testów katalogów.

## Kiedy zadanie UI jest gotowe

Sprawdzone są główna ścieżka, loading, empty, error i success; nowa i istniejąca talia; klawiatura i dotyk; telefon i poziom; oba motywy i długie tłumaczenia. Sterowanie korzysta ze wspólnych komponentów, pola zapisują się, a błędy zachowują treść.

[Podręcznik użytkownika](../docs/user-guide.pl.md) · [Przedmioty](../docs/learning-objects.pl.md) · [Sprawdzanie](../docs/onboarding.pl.md)
