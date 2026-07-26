"use client"

import { useState } from "react"
import Link from "next/link"
import { login } from "@/actions/auth"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await login(formData)

    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Login failed")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Brand strip */}
      <div className="bg-metro-blue px-6 py-4 md:flex md:h-screen md:w-1/2 md:flex-col md:justify-between md:p-12">
        <h1 className="text-xl font-bold tracking-tight text-white md:text-5xl">
          Piwulangan
        </h1>
        <div className="hidden md:block">
          <p className="text-lg text-white/80">
            Learning made together.
          </p>
          <div className="mt-6 flex gap-2">
            <span className="block h-3 w-12 bg-white/40" />
            <span className="block h-3 w-8 bg-white/20" />
            <span className="block h-3 w-16 bg-white/30" />
          </div>
        </div>
      </div>

      {/* Form area — fills remaining space */}
      <div className="flex flex-1 flex-col justify-center bg-metro-surface px-6 py-12 md:p-12">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="text-2xl font-bold text-metro-text md:text-3xl">Welcome back</h2>
          <p className="mt-1 text-sm text-metro-text-secondary">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-metro-text">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="metro-input mt-2"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-metro-text">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="metro-input mt-2"
              />
            </div>

            {error && (
              <div className="metro-error">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="metro-btn mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-metro-text-secondary">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-metro-blue hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
