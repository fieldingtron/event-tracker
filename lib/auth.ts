import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { getBaseUrl } from "./env";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
    baseURL: getBaseUrl(),
    database: drizzleAdapter(db, {
        provider: "sqlite",
        schema: schema,
    }),
    plugins: [
        magicLink({
            sendMagicLink: async ({ email, url }) => {
                console.log(`[Magic Link] URL for ${email}: ${url}`);
                await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
                    to: email,
                    subject: "Your Event Tracker Login Link",
                    html: `<p>Click <a href="${url}">here</a> to sign in to Event Tracker.</p>`,
                });
            },
        }),
    ],
    emailAndPassword: {
        enabled: false,
    },
});
