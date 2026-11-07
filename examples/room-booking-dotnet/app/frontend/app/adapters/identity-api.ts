import { ref } from "vue";
import { client, unwrap, type ApiOutcome, type UsersResponse } from "../api";
import { toChoice, type IdentityPort, type UserChoice } from "../ports/identity";

/**
 * The identity adapter: loads the seeded identities and exposes one of them as
 * the acting user. Returned directly to provideIdentity — the composition root
 * provides the implementation, not a projection of it.
 */
export function useIdentityApi(): IdentityPort {
  const users = ref<UserChoice[]>([]);
  const current = ref<UserChoice | null>(null);

  const load = async (): Promise<ApiOutcome<UsersResponse>> => {
    const result = await client.GET("/api/users");
    const outcome = unwrap(result);
    if (outcome.ok) {
      users.value = outcome.data.users.map(toChoice);
    }
    return outcome;
  };

  // The list is application-wide fixture data; load it once at composition.
  void load();

  return {
    get users(): readonly UserChoice[] {
      return users.value;
    },
    get current(): UserChoice | null {
      return current.value;
    },
    signIn(choice: UserChoice): void {
      current.value = choice;
    },
  };
}
