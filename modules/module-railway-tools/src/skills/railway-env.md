---
name: railway-env
description: View and manage Railway environment variables
---

# Railway Environment Variables

View and manage environment variables for the current Railway service.

## Usage

```
/railway-env [list|get|set|delete] [--key <name>] [--value <value>]
```

## Subcommands

### list (default)
List all environment variables for the current service.
Sensitive values are masked by default.

### get
Get a specific environment variable.
```
/railway-env get --key DATABASE_URL
```

### set
Set or update an environment variable. This triggers a redeploy.
```
/railway-env set --key LOG_LEVEL --value debug
```

### delete
Remove an environment variable. This triggers a redeploy.
```
/railway-env delete --key OLD_VARIABLE
```

## Steps

1. Check that RAILWAY_TOKEN is set
2. For `list` or `get`:
   - Query the Railway API for variables:
     ```bash
     curl -s https://backboard.railway.com/graphql/v2 \
       -H "Authorization: Bearer $RAILWAY_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{
         "query": "query { variables(projectId: \"$PROJECT_ID\", environmentId: \"$ENV_ID\", serviceId: \"$SERVICE_ID\") }"
       }'
     ```
   - Display variables with sensitive values masked
3. For `set`:
   - Upsert the variable via the API
   - Confirm the change was applied
   - Note that a redeploy will be triggered
4. For `delete`:
   - Remove the variable via the API
   - Confirm deletion

## Environment Variables Required

- `RAILWAY_TOKEN` - Railway API token
- `RAILWAY_PROJECT_ID` - Current project ID
- `RAILWAY_SERVICE_ID` - Current service ID
- `RAILWAY_ENVIRONMENT_ID` - Current environment ID

## Notes

- Setting or deleting variables triggers an automatic redeploy
- Sensitive values (containing TOKEN, SECRET, KEY, PASSWORD) are always masked in output
- Use `railway-deploy` to manually trigger a redeploy after bulk changes
