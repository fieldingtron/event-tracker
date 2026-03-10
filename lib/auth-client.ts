import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { getBaseUrl } from "./env";

export const authClient = createAuthClient({
    baseURL: getBaseUrl(),
    plugins: [magicLinkClient()],
});
