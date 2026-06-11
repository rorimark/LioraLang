import { Navigate, useParams } from "react-router";
import { ROUTE_PATHS, buildBrowseDeckRoute } from "@shared/config/routes";

export const ShareDeckRedirectPage = () => {
  const { deckSlug } = useParams();

  if (typeof deckSlug !== "string" || deckSlug.trim().length === 0) {
    return <Navigate to={ROUTE_PATHS.browse} replace />;
  }

  return <Navigate to={buildBrowseDeckRoute(deckSlug)} replace />;
};

export default ShareDeckRedirectPage;
