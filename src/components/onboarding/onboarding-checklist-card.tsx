"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, PartyPopper, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { markOnboardingStepComplete } from "@/app/actions/onboarding"
import type { OnboardingStep } from "@/lib/onboarding-steps"

export function OnboardingChecklistCard({
  steps,
  completedIds,
  allComplete,
  welcomeSeen,
  completionTitle = "Welcome home.",
  completionMessage = "You know where to find your unit, your dues, your Board, and how to get help. You're all set.",
}: {
  steps: OnboardingStep[]
  completedIds: Set<string>
  allComplete: boolean
  welcomeSeen: boolean
  completionTitle?: string
  completionMessage?: string
}) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  if (allComplete) {
    if (welcomeSeen) return null
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-5 pb-5 flex items-start gap-3">
          <PartyPopper className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-green-900">{completionTitle}</p>
            <p className="text-sm text-green-700 mt-0.5">{completionMessage}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => {
              setDismissed(true)
              markOnboardingStepComplete("welcome_seen")
            }}
          >
            Got it
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Getting started</CardTitle>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((step) => {
          const done = completedIds.has(step.id)
          return (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-gray-50 transition-colors"
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 shrink-0" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-400">{step.description}</p>
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
