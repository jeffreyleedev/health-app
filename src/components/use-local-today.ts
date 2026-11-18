import { useSyncExternalStore } from "react";
import { localDateString } from "@/lib/dates";

// No live subscription: reloading the page picks up a new day.
const noSubscription = () => () => {};

/**
 * Today's date in the user's own time zone. Returns "" while rendering on
 * the server (which only knows its own time zone); the browser fills it in.
 */
export function useLocalToday(): string {
  return useSyncExternalStore(noSubscription, () => localDateString(), () => "");
}
