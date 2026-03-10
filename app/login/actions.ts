"use server"

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function login(formData: FormData) {
    const email = formData.get("email") as string;

    const allowedEmails = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
    if (allowedEmails.length > 0 && !allowedEmails.includes(email.toLowerCase())) {
        return redirect("/login?message=Unauthorized email address.");
    }

    try {
        const headerList = await headers();
        await auth.api.signInMagicLink({
            headers: headerList,
            body: {
                email,
                callbackURL: "/",
            },
        });
    } catch (error: any) {
        return redirect("/login?message=" + encodeURIComponent(error.message || "Failed to send magic link"));
    }

    return redirect("/login?message=Check email to continue sign in process");
}

export async function logout() {
    const headerList = await headers();
    await auth.api.signOut({
        headers: headerList,
    });
    redirect('/login')
}
