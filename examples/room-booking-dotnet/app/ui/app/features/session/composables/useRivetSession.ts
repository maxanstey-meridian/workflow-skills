import { client, type components } from "@roombooking/contracts";
import { computed, ref } from "vue";
import { serverRefusalText } from "~/shared/logic/refusal";
import { readActingAsEmail, writeActingAsEmail } from "../adapters/acting-as-storage";
import type { Session } from "../ports/session";

type UserDto = components["schemas"]["UserDto"];
type CapabilitiesDto = components["schemas"]["CapabilitiesDto"];

export const useRivetSession = (): Session => {
  const user = ref<UserDto | null>(null);
  const capabilities = ref<CapabilitiesDto | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const selectedEmail = ref<string | null>(readActingAsEmail());

  const actingAs = computed(() => ({
    email: selectedEmail.value ?? "",
    name: user.value?.name ?? null,
  }));

  const load = async (): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const result = await client.GET("/api/session");
      if (result.response.status === 401) {
        user.value = null;
        capabilities.value = null;
        errorMessage.value =
          "You're not signed in as anyone the service knows. Pick another user at the top of the page.";
        return;
      }
      if (result.error !== undefined) {
        errorMessage.value = serverRefusalText(
          result.error,
          "Your details could not be loaded. Try again in a moment.",
        );
        return;
      }
      if (result.data === undefined) {
        errorMessage.value = "Your details could not be loaded. Try again in a moment.";
        return;
      }
      user.value = result.data.user;
      capabilities.value = result.data.capabilities;
    } catch {
      errorMessage.value = "Can't reach the booking service. Check it's running, then try again.";
    } finally {
      isLoading.value = false;
    }
  };

  const switchTo = async (email: string): Promise<void> => {
    if (email === selectedEmail.value) {
      return;
    }
    selectedEmail.value = email;
    writeActingAsEmail(email);
    await load();
  };

  return {
    user,
    capabilities,
    actingAs,
    isLoading,
    errorMessage,
    load,
    switchTo,
  } satisfies Session;
};
