import type { components } from "@roombooking/contracts";
import type { ComputedRef, Ref } from "vue";
import { useProvideInject } from "~/shared/composables/useProvideInject";

type UserDto = components["schemas"]["UserDto"];
type CapabilitiesDto = components["schemas"]["CapabilitiesDto"];

export interface ActingAs {
  email: string;
  /** Resolved name once the session has loaded; null before that. */
  name: string | null;
}

/**
 * The acting user and what they may do. Capabilities come from the server —
 * the UI never derives them from the role.
 */
export interface Session {
  user: Ref<UserDto | null>;
  capabilities: Ref<CapabilitiesDto | null>;
  actingAs: ComputedRef<ActingAs>;
  isLoading: Ref<boolean>;
  errorMessage: Ref<string | null>;
  load: () => Promise<void>;
  switchTo: (email: string) => Promise<void>;
}

export const [injectSession, provideSession] = useProvideInject<Session>("Session");
