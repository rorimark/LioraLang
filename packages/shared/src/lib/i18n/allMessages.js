// Every catalogue at once, for the desktop app's main process: it builds
// menus synchronously and has no bundle to keep small. The interface
// itself loads one language at a time (loadMessages.js).
import en from "./messages/en.js";
import uk from "./messages/uk.js";
import ru from "./messages/ru.js";
import pl from "./messages/pl.js";
import de from "./messages/de.js";
import es from "./messages/es.js";
import fr from "./messages/fr.js";
import it from "./messages/it.js";
import pt from "./messages/pt.js";
import tr from "./messages/tr.js";
import cs from "./messages/cs.js";
import ja from "./messages/ja.js";

export const ALL_MESSAGES = { en, uk, ru, pl, de, es, fr, it, pt, tr, cs, ja };
