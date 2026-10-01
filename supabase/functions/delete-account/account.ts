// What delete-account decides before it removes anything: whether the
// person confirmed, and which stored files are theirs. No Deno here, so it
// is tested with the rest of the app.

// The buckets that keep a person's files, each under a folder named after
// their user id: published Hub decks, and the decks and pictures that sync.
export const USER_BUCKETS = ["decks", "user-library-decks"];

const clean = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

// The person types their email address to confirm. An account with no
// email (none exists today) types "delete".
export const isConfirmed = (confirm: unknown, email: string | null | undefined): boolean => {
  const expected = clean(email) || "delete";
  return clean(confirm) === expected;
};

type Entry = { name: string; id: string | null };
type Lister = (prefix: string, offset: number) => Promise<Entry[]>;

const PAGE = 1000;

// Every file under a folder, at any depth. Storage lists one level at a
// time and returns a folder as an entry without an id.
export const listFilesUnder = async (prefix: string, list: Lister): Promise<string[]> => {
  const files: string[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const entries = await list(prefix, offset);

    for (const entry of entries) {
      const path = `${prefix}/${entry.name}`;

      if (entry.id === null) {
        files.push(...(await listFilesUnder(path, list)));
      } else {
        files.push(path);
      }
    }

    if (entries.length < PAGE) {
      return files;
    }
  }
};

export const inBatches = <T>(items: T[], size = PAGE): T[][] => {
  const batches: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }

  return batches;
};
