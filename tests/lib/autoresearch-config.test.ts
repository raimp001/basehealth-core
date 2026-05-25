import { describe, expect, it } from "vitest"
import { getAutoResearchAwsConfig, getProviderOrder, normalizeAutoResearchSettings } from "@/lib/autoresearch/config"

describe("auto-research config", () => {
  it("clamps iterations and trims evaluation command", () => {
    const settings = normalizeAutoResearchSettings({
      providerPreference: "groq-first",
      executionTarget: "aws-sqs",
      codeChangeMode: "patch-artifacts",
      maxIterations: 99,
      maxPatchFiles: 99,
      evaluationCommand: "  npm run test  ",
    })

    expect(settings.providerPreference).toBe("groq-first")
    expect(settings.executionTarget).toBe("aws-sqs")
    expect(settings.codeChangeMode).toBe("patch-artifacts")
    expect(settings.maxIterations).toBe(5)
    expect(settings.maxPatchFiles).toBe(3)
    expect(settings.evaluationCommand).toBe("npm run test")
  })

  it("falls back to defaults for invalid values", () => {
    const settings = normalizeAutoResearchSettings({
      providerPreference: "invalid" as any,
      executionTarget: "invalid" as any,
      codeChangeMode: "invalid" as any,
      maxIterations: 0,
      maxPatchFiles: 0,
      evaluationCommand: undefined,
    })

    expect(settings.providerPreference).toBe("openclaw-first")
    expect(settings.executionTarget).toBe("local")
    expect(settings.codeChangeMode).toBe("report-only")
    expect(settings.maxIterations).toBe(1)
    expect(settings.maxPatchFiles).toBe(1)
    expect(settings.evaluationCommand).toBe("")
  })

  it("returns provider order from the selected preference", () => {
    expect(getProviderOrder("openclaw-first")).toEqual(["openclaw", "openai", "groq"])
    expect(getProviderOrder("openai-first")).toEqual(["openai", "openclaw", "groq"])
    expect(getProviderOrder("groq-first")).toEqual(["groq", "openclaw", "openai"])
  })

  it("detects AWS env credential configuration", () => {
    const originalKey = process.env.AWS_ACCESS_KEY_ID
    const originalSecret = process.env.AWS_SECRET_ACCESS_KEY

    process.env.AWS_ACCESS_KEY_ID = "test-key"
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret"

    const aws = getAutoResearchAwsConfig()

    expect(aws.credentialsConfigured).toBe(true)
    expect(aws.credentialSource).toBe("env")

    if (originalKey === undefined) {
      delete process.env.AWS_ACCESS_KEY_ID
    } else {
      process.env.AWS_ACCESS_KEY_ID = originalKey
    }

    if (originalSecret === undefined) {
      delete process.env.AWS_SECRET_ACCESS_KEY
    } else {
      process.env.AWS_SECRET_ACCESS_KEY = originalSecret
    }
  })
})
