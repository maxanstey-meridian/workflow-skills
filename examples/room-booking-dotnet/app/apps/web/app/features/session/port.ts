import { useProvideInject } from "../../shared/use-provide-inject";
import type { Session } from "./use-session";

export type { Session } from "./use-session";

export const [injectSession, provideSession] = useProvideInject<Session>("Session");
