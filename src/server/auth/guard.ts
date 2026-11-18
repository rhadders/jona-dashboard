import { setupToken } from "../env";
import { secretsMatch } from "../http";
import { countPasskeys } from "./passkeys";
import { hasSession } from "./session";

/**
 * Wie mag een passkey registreren: iemand die al is ingelogd, of, zolang er nog
 * geen enkele passkey bestaat, iemand met het SETUP_TOKEN uit de omgeving. Na
 * de eerste passkey doet het token niets meer.
 */
export async function mayRegisterPasskey(givenToken: string | undefined): Promise<boolean> {
  if (await hasSession()) return true;
  if ((await countPasskeys()) > 0) return false;
  const expected = setupToken();
  if (!expected || !givenToken) return false;
  return secretsMatch(givenToken, expected);
}
