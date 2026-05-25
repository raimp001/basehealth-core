#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK_NAME="${CLAWDBOT_AWS_STACK_NAME:-basehealth-autoresearch}"
SERVICE_NAME="${CLAWDBOT_AWS_SERVICE_NAME:-basehealth-autoresearch-worker}"
IMAGE_TAG="${CLAWDBOT_AWS_IMAGE_TAG:-$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
AWS_REGION="${AWS_REGION:?Set AWS_REGION before deploying}"
CLAWDBOT_AWS_SUBNET_IDS="${CLAWDBOT_AWS_SUBNET_IDS:?Set CLAWDBOT_AWS_SUBNET_IDS to a comma-separated subnet list}"
CLAWDBOT_AWS_SECURITY_GROUP_IDS="${CLAWDBOT_AWS_SECURITY_GROUP_IDS:?Set CLAWDBOT_AWS_SECURITY_GROUP_IDS to a comma-separated security group list}"
ASSIGN_PUBLIC_IP="${CLAWDBOT_AWS_ASSIGN_PUBLIC_IP:-DISABLED}"
DESIRED_COUNT="${CLAWDBOT_AWS_DESIRED_COUNT:-1}"
S3_PREFIX="${CLAWDBOT_AWS_S3_PREFIX:-autoresearch}"
TASK_CPU="${CLAWDBOT_AWS_TASK_CPU:-1024}"
TASK_MEMORY="${CLAWDBOT_AWS_TASK_MEMORY:-2048}"
WORKER_POLL_SECONDS="${CLAWDBOT_AWS_WORKER_POLL_SECONDS:-20}"
VISIBILITY_TIMEOUT="${CLAWDBOT_AWS_WORKER_VISIBILITY_TIMEOUT:-300}"
ALLOW_AUTO_APPLY="${CLAWDBOT_ALLOW_AUTO_APPLY:-false}"
OPENCLAW_GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-https://gateway.openclaw.ai}"
OPENCLAW_GATEWAY_AGENT_ID="${OPENCLAW_GATEWAY_AGENT_ID:-main}"
OPENCLAW_RESEARCH_MODEL="${OPENCLAW_RESEARCH_MODEL:-gpt-4o-mini}"
OPENAI_RESEARCH_MODEL="${OPENAI_RESEARCH_MODEL:-gpt-4o-mini}"
GROQ_RESEARCH_MODEL="${GROQ_RESEARCH_MODEL:-llama-3.3-70b-versatile}"
OPENCLAW_SECRET_ARN="${OPENCLAW_SECRET_ARN:-}"
OPENAI_SECRET_ARN="${OPENAI_SECRET_ARN:-}"
GROQ_SECRET_ARN="${GROQ_SECRET_ARN:-}"
PLACEHOLDER_IMAGE="public.ecr.aws/docker/library/node:20-bookworm-slim"
TEMPLATE_PATH="$ROOT_DIR/infra/aws/autoresearch-stack.yaml"
DOCKERFILE_PATH="$ROOT_DIR/Dockerfile.autoresearch-worker"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

stack_output() {
  local key="$1"
  aws cloudformation describe-stacks \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$key'].OutputValue" \
    --output text
}

deploy_stack() {
  local worker_image_uri="$1"
  local desired_count="$2"

  aws cloudformation deploy \
    --region "$AWS_REGION" \
    --stack-name "$STACK_NAME" \
    --template-file "$TEMPLATE_PATH" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides \
      ServiceName="$SERVICE_NAME" \
      WorkerImageUri="$worker_image_uri" \
      DesiredCount="$desired_count" \
      VpcSubnetIds="$CLAWDBOT_AWS_SUBNET_IDS" \
      SecurityGroupIds="$CLAWDBOT_AWS_SECURITY_GROUP_IDS" \
      AssignPublicIp="$ASSIGN_PUBLIC_IP" \
      S3Prefix="$S3_PREFIX" \
      TaskCpu="$TASK_CPU" \
      TaskMemory="$TASK_MEMORY" \
      WorkerPollSeconds="$WORKER_POLL_SECONDS" \
      VisibilityTimeout="$VISIBILITY_TIMEOUT" \
      AllowAutoApply="$ALLOW_AUTO_APPLY" \
      OpenClawGatewayUrl="$OPENCLAW_GATEWAY_URL" \
      OpenClawGatewayAgentId="$OPENCLAW_GATEWAY_AGENT_ID" \
      OpenClawResearchModel="$OPENCLAW_RESEARCH_MODEL" \
      OpenAiResearchModel="$OPENAI_RESEARCH_MODEL" \
      GroqResearchModel="$GROQ_RESEARCH_MODEL" \
      OpenClawSecretArn="$OPENCLAW_SECRET_ARN" \
      OpenAiSecretArn="$OPENAI_SECRET_ARN" \
      GroqSecretArn="$GROQ_SECRET_ARN"
}

require_command aws
require_command docker
require_command git

echo "[1/4] Bootstrapping AWS stack with placeholder image"
deploy_stack "$PLACEHOLDER_IMAGE" 0

REPOSITORY_URI="$(stack_output EcrRepositoryUri)"
QUEUE_URL="$(stack_output WorkQueueUrl)"
BUCKET_NAME="$(stack_output ArtifactBucketName)"
LOG_GROUP_NAME="$(stack_output LogGroupName)"
CLUSTER_NAME="$(stack_output ClusterName)"

if [[ -z "$REPOSITORY_URI" || "$REPOSITORY_URI" == "None" ]]; then
  echo "Failed to read ECR repository URI from stack outputs." >&2
  exit 1
fi

REGISTRY_HOST="${REPOSITORY_URI%/*}"
IMAGE_URI="$REPOSITORY_URI:$IMAGE_TAG"

echo "[2/4] Logging into ECR and pushing worker image $IMAGE_URI"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY_HOST"
docker build -f "$DOCKERFILE_PATH" -t "$IMAGE_URI" "$ROOT_DIR"
docker push "$IMAGE_URI"

echo "[3/4] Updating stack to run the worker service"
deploy_stack "$IMAGE_URI" "$DESIRED_COUNT"

echo "[4/4] Deployment complete"
echo
echo "Worker image:      $IMAGE_URI"
echo "ECS cluster:       $CLUSTER_NAME"
echo "ECS service:       $SERVICE_NAME"
echo "Queue URL:         $QUEUE_URL"
echo "Artifact bucket:   $BUCKET_NAME"
echo "CloudWatch logs:   $LOG_GROUP_NAME"
echo
echo "Vercel app envs to set for AWS dispatch:"
echo "  AWS_REGION=$AWS_REGION"
echo "  CLAWDBOT_AWS_SQS_QUEUE_URL=$QUEUE_URL"
echo "  CLAWDBOT_AWS_S3_BUCKET=$BUCKET_NAME"
echo "  CLAWDBOT_AWS_S3_PREFIX=$S3_PREFIX"
echo "  AWS_ACCESS_KEY_ID=<vercel-app-access-key>"
echo "  AWS_SECRET_ACCESS_KEY=<vercel-app-secret-key>"
