import { DeleteMessageCommand, ReceiveMessageCommand, SQSClient, type Message } from "@aws-sdk/client-sqs"
import { getAutoResearchAwsConfig, normalizeAutoResearchSettings } from "@/lib/autoresearch/config"
import { getAutoResearchObject } from "@/lib/autoresearch/aws"
import { createAutoResearchRunRecord, executePersistedAutoResearchRun } from "@/lib/autoresearch/runner"
import { readAutoResearchRun, saveAutoResearchRun } from "@/lib/autoresearch/store"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function processMessage(client: SQSClient, queueUrl: string, message: Message) {
  const body = JSON.parse(message.Body || "{}") as { kind?: string; runId?: string; requestKey?: string }
  if (body.kind !== "autoresearch.run.requested" || !body.runId || !body.requestKey) {
    throw new Error(`Unexpected message body: ${message.Body || "empty"}`)
  }

  const requestRaw = await getAutoResearchObject(body.requestKey)
  if (!requestRaw) {
    throw new Error(`Missing request manifest in S3: ${body.requestKey}`)
  }

  const request = JSON.parse(requestRaw) as {
    runId: string
    goal: string
    settings?: Record<string, unknown>
    queuedAt?: string
  }

  const settings = normalizeAutoResearchSettings(request.settings as any)
  let run = await readAutoResearchRun(request.runId)
  if (!run) {
    run = await createAutoResearchRunRecord({
      id: request.runId,
      goal: request.goal,
      settings,
      dispatch: {
        target: "aws-sqs",
        status: "processing",
        queuedAt: request.queuedAt || new Date().toISOString(),
        requestKey: body.requestKey,
      },
    })
  } else {
    run.dispatch = {
      ...(run.dispatch || {
        target: "aws-sqs",
        status: "processing",
        queuedAt: request.queuedAt || new Date().toISOString(),
      }),
      target: "aws-sqs",
      status: "processing",
      requestKey: body.requestKey,
    }
    await saveAutoResearchRun(run)
  }

  console.log(`[autoresearch-aws-worker] processing run ${request.runId}`)
  await executePersistedAutoResearchRun(request.runId, { syncToS3: true })
  console.log(`[autoresearch-aws-worker] completed run ${request.runId}`)

  if (message.ReceiptHandle) {
    await client.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle,
      }),
    )
  }
}

async function main() {
  const config = getAutoResearchAwsConfig()
  if (!config.configured || !config.region || !config.sqsQueueUrl) {
    throw new Error("AWS worker is not configured. Set AWS_REGION, CLAWDBOT_AWS_SQS_QUEUE_URL, and CLAWDBOT_AWS_S3_BUCKET.")
  }

  const once = process.argv.includes("--once")
  const waitSeconds = Number(process.env.CLAWDBOT_AWS_WORKER_POLL_SECONDS || 20)
  const client = new SQSClient({ region: config.region })

  console.log(`[autoresearch-aws-worker] started in region ${config.region}`)
  console.log(`[autoresearch-aws-worker] queue ${config.sqsQueueUrl}`)
  console.log(`[autoresearch-aws-worker] bucket ${config.s3Bucket}`)

  do {
    const response = await client.send(
      new ReceiveMessageCommand({
        QueueUrl: config.sqsQueueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: Math.min(20, Math.max(1, waitSeconds)),
        VisibilityTimeout: Number(process.env.CLAWDBOT_AWS_WORKER_VISIBILITY_TIMEOUT || 300),
      }),
    )

    const message = response.Messages?.[0]
    if (!message) {
      if (once) break
      await sleep(1000)
      continue
    }

    try {
      await processMessage(client, config.sqsQueueUrl, message)
    } catch (error) {
      console.error("[autoresearch-aws-worker] message processing failed", error)
      if (once) {
        throw error
      }
    }
  } while (!once)
}

main().catch((error) => {
  console.error("[autoresearch-aws-worker] fatal error", error)
  process.exit(1)
})
