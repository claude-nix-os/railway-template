---
name: railway-logs
description: View deployment logs from the Railway service
---

# Railway Logs

View recent deployment logs for the current Railway service.

## Usage

```
/railway-logs [--lines <n>] [--follow] [--severity <level>]
```

## Options

- `--lines <n>` - Number of log lines to retrieve (default: 100, max: 500)
- `--follow` - Continuously poll for new logs every 5 seconds
- `--severity <level>` - Filter by severity: info, warn, error, debug

## Steps

1. Check that RAILWAY_TOKEN is set in the environment
2. Fetch logs from the Railway API:
   ```bash
   curl -s https://backboard.railway.com/graphql/v2 \
     -H "Authorization: Bearer $RAILWAY_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "query { deploymentLogs(deploymentId: \"$DEPLOYMENT_ID\", limit: $LIMIT) { timestamp message severity } }"
     }'
   ```
3. Format and display the logs with timestamps and severity coloring
4. If --follow is set, continue polling for new entries

## Output Format

```
[2024-01-15T10:30:00Z] [INFO]  Server started on port 3000
[2024-01-15T10:30:01Z] [INFO]  Connected to database
[2024-01-15T10:30:05Z] [WARN]  Slow query detected: 2.3s
```

## Environment Variables Required

- `RAILWAY_TOKEN` - Railway API token
- `RAILWAY_DEPLOYMENT_ID` - Current deployment ID

## Notes

- Logs are retrieved from the current deployment by default
- Use `--severity error` to quickly find issues
- Logs are returned newest-first unless --follow is used
