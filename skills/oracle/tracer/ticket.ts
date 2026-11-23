export const STATUSES = ["open", "paused", "closed"] as const;
export const ACTIONS = ["pause", "resume", "close"] as const;

export type Status = (typeof STATUSES)[number];
export type Action = (typeof ACTIONS)[number];

export type Decision = { ok: true; next: Status } | { ok: false; reason: string };

export const decide = (status: Status, action: Action): Decision => {
  if (status === "closed") {
    return { ok: false, reason: "ticket is already closed" };
  }

  if (status === "paused") {
    if (action === "resume") {
      return { ok: true, next: "open" };
    }
    return { ok: false, reason: "ticket is paused" };
  }

  if (action === "pause") {
    return { ok: true, next: "paused" };
  }

  if (action === "close") {
    return { ok: true, next: "closed" };
  }

  return { ok: false, reason: "ticket is already open" };
};
