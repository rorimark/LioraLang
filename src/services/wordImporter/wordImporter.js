export async function importWords() {
  const response = await fetch("/data/words.json");

  if (!response.ok) {
    throw new Error("Failed to load words");
  }

  return response.json();
}
