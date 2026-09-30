import { Link } from "react-router";
import { FiCheck, FiDownload } from "react-icons/fi";
import { Button } from "@shared/ui";
import { buildDeckDetailsRoute } from "@shared/config/routes";
import { useI18n } from "@shared/lib/i18n";

// The key a Hub deck offers: add it, or, once added, open it.
export const HubDeckAction = ({ deck, localDeckId, isImporting, onImport, size }) => {
  const { t } = useI18n();
  const title = deck?.title || t("browse.untitled");

  if (localDeckId) {
    return (
      <Link
        className={`ui-button ui-button--secondary${size ? ` ui-button--${size}` : ""} hub-action hub-action--owned`}
        to={buildDeckDetailsRoute(localDeckId)}
        aria-label={t("browse.openInLibrary", { name: title })}
      >
        <FiCheck aria-hidden="true" />
        <span>{t("browse.inLibrary")}</span>
      </Link>
    );
  }

  return (
    <Button
      variant="primary"
      size={size}
      className="hub-action"
      onClick={onImport}
      isLoading={isImporting}
      disabled={isImporting || !deck?.latestVersion?.filePath}
      aria-label={t("browse.addNamed", { name: title })}
    >
      <FiDownload aria-hidden="true" />
      <span>{isImporting ? t("browse.importing") : t(size ? "browse.add" : "browse.import")}</span>
    </Button>
  );
};
