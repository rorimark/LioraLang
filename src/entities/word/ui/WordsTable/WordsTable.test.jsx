import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WordsTable } from "./WordsTable.jsx";

const WORDS = [
  {
    id: "w1",
    source: "guidebook",
    target: "przewodnik",
    tertiary: "Reiseführer",
    level: "A2",
    part_of_speech: "noun",
    examples: ["Pack a guidebook", "Buy a guidebook", "Use a guidebook"],
  },
];

describe("WordsTable", () => {
  const renderTable = (props = {}) =>
    render(
      <WordsTable
        words={WORDS}
        languageLabels={{
          sourceLanguage: "English",
          targetLanguage: "Polish",
        }}
        {...props}
      />,
    );

  it("shows a short preview first and reveals the full example list on expand", () => {
    renderTable();

    expect(screen.getByText("Pack a guidebook")).toBeInTheDocument();
    expect(screen.getByText("Buy a guidebook")).toBeInTheDocument();
    expect(screen.getByText("…")).toBeInTheDocument();

    fireEvent.click(screen.getByText("guidebook").closest("tr"));

    const details = document.querySelector(".words-table__details");

    expect(details).toBeTruthy();
    expect(within(details).getByText("Pack a guidebook")).toBeInTheDocument();
    expect(within(details).getByText("Buy a guidebook")).toBeInTheDocument();
    expect(within(details).getByText("Use a guidebook")).toBeInTheDocument();
  });

  it("removes all level UI when the deck does not use levels", () => {
    renderTable({ showLevelColumn: false });

    expect(screen.queryByRole("columnheader", { name: "Level" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("guidebook").closest("tr"));

    expect(screen.queryByText("Level")).not.toBeInTheDocument();
  });

  it("shows a useful empty state when the filtered result is empty", () => {
    render(
      <WordsTable
        words={[]}
        languageLabels={{
          sourceLanguage: "English",
          targetLanguage: "Polish",
        }}
      />,
    );

    expect(screen.getByText("No words found.")).toBeInTheDocument();
  });
});
