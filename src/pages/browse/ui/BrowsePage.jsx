import { useParams } from "react-router";
import { BrowseDeckDetailsPanel, BrowseDecksPanel } from "@widgets";

export const BrowsePage = () => {
  const { deckSlug } = useParams();
  const hasDeckSlug = typeof deckSlug === "string" && deckSlug.trim().length > 0;

  return (
    <section className="page">
      {hasDeckSlug ? (
        <BrowseDeckDetailsPanel deckSlug={deckSlug} />
      ) : (
        <BrowseDecksPanel />
      )}
    </section>
  );
};

export default BrowsePage;
