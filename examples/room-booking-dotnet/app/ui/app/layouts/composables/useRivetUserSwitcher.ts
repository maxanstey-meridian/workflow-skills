import { client, type components } from "@roombooking/contracts";
import { watchImmediate } from "@vueuse/core";
import { ref } from "vue";
import { injectSession } from "~/features/session";

type UserDto = components["schemas"]["UserDto"];

/**
 * Everyone who can act in this dev deployment, for choosing who the browser
 * signs in as. The list needs the dev header, so it loads once a session is known.
 */
export const useRivetUserSwitcher = () => {
  const session = injectSession();
  const users = ref<UserDto[]>([]);
  const isLoading = ref(false);

  const load = async (): Promise<void> => {
    isLoading.value = true;
    try {
      const result = await client.GET("/api/users");
      if (result.error !== undefined) {
        // The header shows the session error; the picker stays empty.
        return;
      }
      users.value = result.data.users;
    } catch {
      // Transport failure: the picker stays empty; pages show their own errors.
    } finally {
      isLoading.value = false;
    }
  };

  watchImmediate(
    () => session.user.value,
    (user) => {
      if (user !== null && users.value.length === 0) {
        void load();
      }
    },
  );

  const switchTo = (email: string): Promise<void> => session.switchTo(email);

  return { users, isLoading, switchTo };
};
