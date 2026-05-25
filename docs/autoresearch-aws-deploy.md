# Auto-Research AWS Deployment

This deployment path turns the BaseHealth auto-research worker into a real AWS service backed by:

- ECR for the worker image
- ECS/Fargate for the worker runtime
- SQS for queued run requests
- S3 for manifests, run state, reports, and patch artifacts
- CloudWatch Logs for worker output

## What this repo now provides

- `Dockerfile.autoresearch-worker`
- `infra/aws/autoresearch-stack.yaml`
- `scripts/deploy-autoresearch-aws.sh`

## Prerequisites

Local machine:

- AWS CLI authenticated to the target account
- Docker installed and running
- Access to subnets and a security group that can run Fargate tasks

Application credentials:

- `OPENCLAW_SECRET_ARN`, `OPENAI_SECRET_ARN`, and/or `GROQ_SECRET_ARN` in AWS Secrets Manager if you want those providers available inside ECS
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Vercel for the BaseHealth app itself so it can enqueue SQS/S3 work from `/api/admin/research`

## Required environment variables for deployment

- `AWS_REGION`
- `CLAWDBOT_AWS_SUBNET_IDS`
- `CLAWDBOT_AWS_SECURITY_GROUP_IDS`

## Optional deployment environment variables

- `CLAWDBOT_AWS_STACK_NAME`
- `CLAWDBOT_AWS_SERVICE_NAME`
- `CLAWDBOT_AWS_IMAGE_TAG`
- `CLAWDBOT_AWS_ASSIGN_PUBLIC_IP`
- `CLAWDBOT_AWS_DESIRED_COUNT`
- `CLAWDBOT_AWS_TASK_CPU`
- `CLAWDBOT_AWS_TASK_MEMORY`
- `CLAWDBOT_AWS_S3_PREFIX`
- `CLAWDBOT_AWS_WORKER_POLL_SECONDS`
- `CLAWDBOT_AWS_WORKER_VISIBILITY_TIMEOUT`
- `CLAWDBOT_ALLOW_AUTO_APPLY`
- `OPENCLAW_GATEWAY_URL`
- `OPENCLAW_GATEWAY_AGENT_ID`
- `OPENCLAW_RESEARCH_MODEL`
- `OPENAI_RESEARCH_MODEL`
- `GROQ_RESEARCH_MODEL`
- `OPENCLAW_SECRET_ARN`
- `OPENAI_SECRET_ARN`
- `GROQ_SECRET_ARN`

## Deploy

```bash
AWS_REGION=us-west-2 \
CLAWDBOT_AWS_SUBNET_IDS=subnet-aaa,subnet-bbb \
CLAWDBOT_AWS_SECURITY_GROUP_IDS=sg-aaa \
npm run autoresearch:aws:deploy
```

The deploy script performs two passes:

1. bootstraps the stack with a placeholder image and desired count `0`
2. builds and pushes the real worker image to ECR
3. updates the stack with the pushed image and the requested desired count

## After deploy

Set the following in Vercel for the BaseHealth web app:

- `AWS_REGION`
- `CLAWDBOT_AWS_SQS_QUEUE_URL`
- `CLAWDBOT_AWS_S3_BUCKET`
- `CLAWDBOT_AWS_S3_PREFIX`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Recommended optional Vercel envs:

- `CLAWDBOT_AWS_ECS_CLUSTER`
- `CLAWDBOT_AWS_ECS_SERVICE`
- `CLAWDBOT_AWS_ECS_TASK_DEFINITION`
- `CLAWDBOT_AWS_CLOUDWATCH_LOG_GROUP`

## Notes

- The ECS worker can use an IAM task role, so it does not need static AWS credentials in container env vars.
- The Vercel app does need AWS credentials unless you move queue submission behind another AWS-hosted service.
- `CLAWDBOT_ALLOW_AUTO_APPLY=true` is intentionally off by default. Keep it off until you trust the patch workflow operationally.
