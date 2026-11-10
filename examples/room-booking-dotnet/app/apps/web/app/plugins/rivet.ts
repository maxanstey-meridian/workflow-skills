import { configureRivet } from "@cowork/contracts";
import { personaFetch } from "../shared/personas";

// The generated client is configured once, where the app starts.
export default defineNuxtPlugin(() => {
  configureRivet({ fetch: personaFetch });
});
