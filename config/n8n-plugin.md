# n8n API Plugin

## Endpoints (via /api/n8n proxy)
- GET /api/n8n?resource=workflows - List all workflows
- GET /api/n8n?resource=executions - List recent executions

## Direct n8n API (internal)
- Base URL: http://127.0.0.1:5678
- Auth: API key from /data/n8n/.api_key
- Header: X-N8N-API-KEY: {key}

### Workflow Management
- GET /rest/workflows - List workflows
- GET /rest/workflows/{id} - Get workflow
- POST /rest/workflows - Create workflow
- PUT /rest/workflows/{id} - Update workflow
- POST /rest/workflows/{id}/activate - Activate
- POST /rest/workflows/{id}/deactivate - Deactivate

### Executions
- GET /rest/executions - List executions
- GET /rest/executions/{id} - Get execution details
