import { getSubjectProfile, normalizeEntrySubjectFields, SUBJECT_IDS } from "@shared/core/usecases/subjects";

// Six travel words for the landing's demo session: English on the front,
// the visitor's own language on the back. An English visitor gets Polish,
// the language the demo was first written for.
const TRANSLATIONS = {
  en: { language: "Polish", words: ["podróż", "rezerwować", "rezerwacja", "anulować", "potwierdzenie", "bilet"] },
  pl: { language: "Polish", words: ["podróż", "rezerwować", "rezerwacja", "anulować", "potwierdzenie", "bilet"] },
  ru: { language: "Russian", words: ["поездка", "бронировать", "бронь", "отменить", "подтверждение", "билет"] },
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

const buildLanguageDemoDeck = (locale) => {
  const translation = TRANSLATIONS[locale] || TRANSLATIONS.en;

  return {
    sourceLanguage: "English",
    targetLanguage: translation.language,
    words: SOURCE_WORDS.map((word, index) => ({ ...word, target: translation.words[index] })),
  };
};

export const DEMO_LOCALES = Object.keys(TRANSLATIONS);

// Demo content is separate from the subject catalog. New subjects can add a
// sample here without changing the selector or session renderer.
const SUBJECT_SAMPLES = {
  programming: {
    deckFields: { technology: "JavaScript" },
    entries: [
      { code: "[1, 2, 3].map(value => value * 2)", codeSide: "front", difficulty: "easy" },
      { code: "const user = { name: \"Ada\" };\nuser.name = \"Grace\";", codeSide: "back", difficulty: "easy" },
    ],
  },
  mathematics: {
    deckFields: {},
    entries: [
      { formula: "x = \\pm 2", formulaSide: "back", difficulty: "easy" },
      { formula: "A = \\pi r^2", formulaSide: "back", difficulty: "easy" },
    ],
  },
  history: { deckFields: {}, entries: [{ difficulty: "easy" }, { difficulty: "easy" }] },
};

export const LANDING_DEMO_SUBJECTS = SUBJECT_IDS.filter((id) =>
  getSubjectProfile(id).usesLanguages || SUBJECT_SAMPLES[id],
);

export const buildLandingDemoDeck = (locale, subject = "language", t) => {
  const sample = SUBJECT_SAMPLES[subject];
  if (!sample || !t) return buildLanguageDemoDeck(locale);
  const language = TRANSLATIONS[locale]?.language || "English";
  return {
    subject,
    subjectFields: { ...sample.deckFields, contentLanguage: locale === "en" ? "English" : language },
    words: sample.entries.map((fields, index) => ({
      source: t(`landing.demo.samples.${subject}.question${index + 1}`),
      target: t(`landing.demo.samples.${subject}.answer${index + 1}`),
      subjectFields: normalizeEntrySubjectFields(subject, fields),
    })),
  };
};
