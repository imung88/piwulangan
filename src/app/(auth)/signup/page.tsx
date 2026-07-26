"use client"

import { useState } from "react"
import Link from "next/link"
import { signup } from "@/actions/auth"

export default function SignupPage() {
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signup(formData)

    if (result?.error) {
      setErrors(result.error as Record<string, string[]>)
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
            Start your learning journey.
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
          <h2 className="text-2xl font-bold text-metro-text md:text-3xl">Create Account</h2>
          <p className="mt-1 text-sm text-metro-text-secondary">Join Piwulangan today</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-metro-text">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your full name"
                className="metro-input mt-2"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-metro-error">{errors.name[0]}</p>
              )}
            </div>

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
              {errors.email && (
                <p className="mt-1 text-sm text-metro-error">{errors.email[0]}</p>
              )}
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
                minLength={6}
                placeholder="At least 6 characters"
                className="metro-input mt-2"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-metro-error">{errors.password[0]}</p>
              )}
            </div>

            {errors.form && (
              <div className="metro-error">{errors.form[0]}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="metro-btn mt-2"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-metro-text-secondary">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-metro-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
