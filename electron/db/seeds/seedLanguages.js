import { db } from "../db.js";

export function seedLanguages() {
  const count = db
    .prepare(`SELECT COUNT(*) as count FROM languages`)
    .get().count;

  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO languages (code, name)
    VALUES (?, ?)
  `);

  const languages = [
    ["eng", "English"],
    ["ru", "Russian"],
    ["pl", "Polish"],
    ["ua", "Ukrainian"],
    ["de", "German"],
    ["es", "Spanish"],
    ["fr", "French"],
    ["it", "Italian"],
    ["jp", "Japanese"],
    ["cn", "Chinese"],
  ];

  const transaction = db.transaction(() => {
    for (const lang of languages) {
      insert.run(...lang);
    }
  });

  transaction();
}
