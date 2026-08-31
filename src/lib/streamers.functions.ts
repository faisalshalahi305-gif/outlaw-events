import { createServerFn } from "@tanstack/react-start";

import { loadKickStreamers } from "./streamers.server";

export const getKickStreamers = createServerFn({ method: "GET" }).handler(async () => {
  return loadKickStreamers();
});
