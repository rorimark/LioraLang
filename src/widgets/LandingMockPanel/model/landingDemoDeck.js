// Six travel words for the landing's demo session: English on the front,
// the visitor's own language on the back. An English visitor gets Polish,
// the language the demo was first written for.
const TRANSLATIONS = {
  en: { language: "Polish", words: ["podróż", "rezerwować", "rezerwacja", "anulować", "potwierdzenie", "bilet"] },
  pl: { language: "Polish", words: ["podróż", "rezerwować", "rezerwacja", "anulować", "potwierdzenie", "bilet"] },
  ru: { language: "Russian", words: ["путешествие", "бронировать", "бронь", "отменить", "подтверждение", "билет"] },
  uk: { language: "Ukrainian", words: ["подорож", "бронювати", "бронювання", "скасувати", "підтвердження", "квиток"] },
  de: { language: "German", words: ["die Reise", "buchen", "die Reservierung", "stornieren", "die Bestätigung", "das Ticket"] },
  es: { language: "Spanish", words: ["el viaje", "reservar", "la reserva", "cancelar", "la confirmación", "el billete"] },
  fr: { language: "French", words: ["le voyage", "réserver", "la réservation", "annuler", "la confirmation", "le billet"] },
  it: { language: "Italian", words: ["il viaggio", "prenotare", "la prenotazione", "annullare", "la conferma", "il biglietto"] },
  pt: { language: "Portuguese", words: ["a viagem", "reservar", "a reserva", "cancelar", "a confirmação", "a passagem"] },
  tr: { language: "Turkish", words: ["yolculuk", "rezervasyon yapmak", "rezervasyon", "iptal etmek", "onay", "bilet"] },
  cs: { language: "Czech", words: ["cesta", "rezervovat", "rezervace", "zrušit", "potvrzení", "jízdenka"] },
  ja: { language: "Japanese", words: ["旅行", "予約する", "予約", "キャンセルする", "確認", "チケット"] },
};

const SOURCE_WORDS = Object.freeze([
  { source: "journey", level: "A2", example: "The journey from London to Paris was very comfortable." },
  { source: "to book", level: "B1", example: "We need to book a hotel room." },
  { source: "reservation", level: "B1", example: "I have a reservation under the name Smith." },
  { source: "to cancel", level: "B1", example: "We had to cancel our flight due to bad weather." },
  { source: "confirmation", level: "B1", example: "We received the confirmation of our flight." },
  { source: "ticket", level: "A2", example: "I bought a one-way ticket to Berlin." },
]);

export const buildLandingDemoDeck = (locale) => {
  const translation = TRANSLATIONS[locale] || TRANSLATIONS.en;

  return {
    sourceLanguage: "English",
    targetLanguage: translation.language,
    words: SOURCE_WORDS.map((word, index) => ({ ...word, target: translation.words[index] })),
  };
};

export const DEMO_LOCALES = Object.keys(TRANSLATIONS);
