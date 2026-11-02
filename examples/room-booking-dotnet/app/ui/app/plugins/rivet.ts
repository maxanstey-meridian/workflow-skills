import { configureRivet } from "@roombooking/contracts";
import { readActingAsEmail } from "~/features/session";

/**
 * The one place the Rivet client is configured: the API base URL plus the dev
 * sign-in header, added per request from the acting-as choice the session
 * feature persists.
 */
export default defineNuxtPlugin(() => {
  configureRivet({
    baseUrl: "http://localhost:5000",
    fetch: async (input) => {
      const email = readActingAsEmail();
      if (email !== null) {
        input.headers.set("X-User-Email", email);
      }
      return fetch(input);
    },
  });
});
