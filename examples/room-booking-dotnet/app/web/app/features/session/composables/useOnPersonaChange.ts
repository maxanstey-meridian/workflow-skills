import { watch } from "vue";
import { injectSession } from "../ports/session";

/** Runs `onChange` whenever the persona changes, so pages reload their data. */
export const useOnPersonaChange = (onChange: () => void): void => {
  const session = injectSession();
  watch(session.persona, onChange);
};
