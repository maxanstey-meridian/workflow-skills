import type { components } from "@roombooking/contracts";

export const benUser: components["schemas"]["UserDto"] = {
  id: "0199f6c1-0000-7000-8000-000000000001",
  name: "Ben Cohen",
  email: "ben@roombooking.dev",
  role: "member",
};

export const amaraUser: components["schemas"]["UserDto"] = {
  id: "0199f6c1-0000-7000-8000-000000000002",
  name: "Amara Okafor",
  email: "amara@roombooking.dev",
  role: "staff",
};

export const benSession: components["schemas"]["SessionResponse"] = {
  user: benUser,
  capabilities: { canManageRooms: false, canBookRooms: true },
};

export const amaraSession: components["schemas"]["SessionResponse"] = {
  user: amaraUser,
  capabilities: { canManageRooms: true, canBookRooms: false },
};

/** Booked slot inside its check-in window: the server allows both actions. */
export const checkInableBooking: components["schemas"]["BookingDto"] = {
  id: "0199f6c1-0000-7000-8000-000000000101",
  roomId: "0199f6c1-0000-7000-8000-000000000201",
  roomName: "Willow Room",
  start: "2026-11-02T14:00:00Z",
  end: "2026-11-02T15:00:00Z",
  status: "booked",
  checkInAt: null,
  checkInClosesAt: "2026-11-02T14:15:00Z",
  availableActions: ["checkIn", "cancel"],
};

/** Booked slot whose check-in window has closed: cancel only. */
export const windowClosedBooking: components["schemas"]["BookingDto"] = {
  id: "0199f6c1-0000-7000-8000-000000000102",
  roomId: "0199f6c1-0000-7000-8000-000000000202",
  roomName: "Alder Room",
  start: "2026-11-02T09:00:00Z",
  end: "2026-11-02T10:00:00Z",
  status: "booked",
  checkInAt: null,
  checkInClosesAt: "2026-11-02T09:15:00Z",
  availableActions: ["cancel"],
};
