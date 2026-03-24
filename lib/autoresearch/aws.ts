import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs"
import { getAutoResearchAwsConfig } from "@/lib/autoresearch/config"
import type { AutoResearchRun } from "@/lib/autoresearch/types"

let s3Client: S3Client | null = null
let sqsClient: SQSClient | null = null

function getAwsRegion(): string {
  const config = getAutoResearchAwsConfig()
  if (!config.region) {
    throw new Error("AWS auto-research is not configured: missing AWS_REGION.")
  }
  return config.region
}

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: getAwsRegion() })
  }
  return s3Client
}

function getSqsClient(): SQSClient {
  if (!sqsClient) {
    sqsClient = new SQSClient({ region: getAwsRegion() })
  }
  return sqsClient
}

async function bodyToString(body: unknown): Promise<string> {
  if (!body) return ""
  if (typeof (body as any).transformToString === "function") {
    return (body as any).transformToString()
  }

  const chunks: Buffer[] = []
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString("utf8")
}

export function getAutoResearchS3Key(runId: string, kind: "request" | "run" | "report" | "patch"): string {
  const config = getAutoResearchAwsConfig()
  const base = `${config.s3Prefix}/runs/${runId}`

  switch (kind) {
    case "request":
      return `${base}/request.json`
    case "run":
      return `${base}/run.json`
    case "report":
      return `${base}/report.md`
    case "patch":
      return `${base}/changes.patch`
    default:
      return `${base}/artifact.txt`
  }
}

export async function putAutoResearchObject(key: string, body: string, contentType: string): Promise<string> {
  const config = getAutoResearchAwsConfig()
  if (!config.configured || !config.s3Bucket) {
    throw new Error("AWS auto-research is not configured: missing S3 bucket.")
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )

  return key
}

export async function getAutoResearchObject(key: string): Promise<string | null> {
  const config = getAutoResearchAwsConfig()
  if (!config.configured || !config.s3Bucket) return null

  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
      }),
    )
    return await bodyToString(response.Body)
  } catch {
    return null
  }
}

export async function enqueueAwsAutoResearchRun(run: AutoResearchRun): Promise<{ messageId?: string; requestKey: string }> {
  const config = getAutoResearchAwsConfig()
  if (!config.configured || !config.s3Bucket || !config.sqsQueueUrl) {
    throw new Error("AWS auto-research is not configured. Set AWS_REGION, CLAWDBOT_AWS_SQS_QUEUE_URL, and CLAWDBOT_AWS_S3_BUCKET.")
  }

  const requestKey = getAutoResearchS3Key(run.id, "request")
  const requestPayload = {
    kind: "autoresearch.run.requested",
    runId: run.id,
    goal: run.goal,
    settings: run.settings,
    queuedAt: run.dispatch?.queuedAt || run.createdAt,
  }

  await putAutoResearchObject(requestKey, `${JSON.stringify(requestPayload, null, 2)}\n`, "application/json")

  const response = await getSqsClient().send(
    new SendMessageCommand({
      QueueUrl: config.sqsQueueUrl,
      MessageBody: JSON.stringify({
        kind: "autoresearch.run.requested",
        runId: run.id,
        requestKey,
        bucket: config.s3Bucket,
      }),
      MessageAttributes: {
        runId: {
          DataType: "String",
          StringValue: run.id,
        },
      },
    }),
  )

  return {
    messageId: response.MessageId,
    requestKey,
  }
}

export async function syncAutoResearchRunArtifactsToS3(run: AutoResearchRun, patchContent?: string | null) {
  const config = getAutoResearchAwsConfig()
  if (!config.configured) {
    return {}
  }

  const runKey = getAutoResearchS3Key(run.id, "run")
  await putAutoResearchObject(runKey, `${JSON.stringify(run, null, 2)}\n`, "application/json")

  const reportKey = run.reportMarkdown
    ? await putAutoResearchObject(getAutoResearchS3Key(run.id, "report"), run.reportMarkdown, "text/markdown; charset=utf-8")
    : undefined

  const patchKey = patchContent
    ? await putAutoResearchObject(getAutoResearchS3Key(run.id, "patch"), patchContent, "text/x-diff; charset=utf-8")
    : undefined

  return {
    runKey,
    reportKey,
    patchKey,
  }
}

export async function hydrateAutoResearchRunFromS3(run: AutoResearchRun): Promise<AutoResearchRun> {
  if (run.dispatch?.target !== "aws-sqs") {
    return run
  }

  const runKey = run.dispatch.runKey || getAutoResearchS3Key(run.id, "run")
  const raw = await getAutoResearchObject(runKey)
  if (!raw) {
    return run
  }

  try {
    const parsed = JSON.parse(raw) as AutoResearchRun
    return {
      ...run,
      ...parsed,
      dispatch: {
        ...run.dispatch,
        ...parsed.dispatch,
        runKey,
      },
    }
  } catch {
    return run
  }
}
