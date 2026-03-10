"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export function MagicLinkVerifier() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")
    const [status, setStatus] = useState<"idle" | "verifying" | "error">("idle")

    useEffect(() => {
        if (!token) return

        setStatus("verifying")

        authClient.magicLink.verify({
            query: {
                token,
                callbackURL: searchParams.get("callbackURL") || "/",
            },
        }).then(({ data, error }) => {
            if (error) {
                setStatus("error")
                router.replace(`/login?message=${encodeURIComponent(error.message || "Verification failed")}`)
            } else {
                router.replace(searchParams.get("callbackURL") || "/")
            }
        })
    }, [token, searchParams, router])

    if (!token) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'var(--surface-base, #111)',
            zIndex: 50,
        }}>
            <div className="panel" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: '400px' }}>
                {status === "verifying" && (
                    <>
                        <p className="title" style={{ fontSize: '1.4rem', marginBottom: '12px' }}>
                            Verifying magic link...
                        </p>
                        <p className="subtitle">Please wait while we sign you in.</p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <p className="title" style={{ fontSize: '1.4rem', marginBottom: '12px' }}>
                            Verification failed
                        </p>
                        <p className="subtitle">The magic link may have expired. Please try again.</p>
                    </>
                )}
            </div>
        </div>
    )
}
