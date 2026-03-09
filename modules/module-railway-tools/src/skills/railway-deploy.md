---
name: railway-deploy
description: Trigger a Railway deployment or redeploy the current service
---

# Railway Deploy

Trigger a new deployment on Railway for the current project.

## Usage

```
/railway-deploy [--service <service-name>] [--environment <env>]
```

## Steps

1. Check that RAILWAY_TOKEN is set in the environment
2. Get the current project ID from RAILWAY_PROJECT_ID env var
3. If --service is specified, look up the service ID; otherwise use RAILWAY_SERVICE_ID
4. Trigger a redeploy via the Railway API:
   ```bash
   curl -X POST https://backboard.railway.com/graphql/v2 \
     -H "Authorization: Bearer $RAILWAY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "mutation { serviceInstanceRedeploy(serviceId: \"$SERVICE_ID\", environmentId: \"$ENVIRONMENT_ID\") }"
     }'
   ```
5. Poll the deployment status until it succeeds or fails
6. Report the deployment result

## Environment Variables Required

- `RAILWAY_TOKEN` - Railway API token
- `RAILWAY_PROJECT_ID` - Project to deploy
- `RAILWAY_SERVICE_ID` - Service to deploy (or specify via --service)
- `RAILWAY_ENVIRONMENT_ID` - Target environment

## Notes

- This command triggers a redeploy of the latest commit
- Deployments typically take 1-5 minutes
- Monitor progress with `/railway-logs`
- If no service is specified, the current service is redeployed
