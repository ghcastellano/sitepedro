#!/bin/zsh
# Roda SQL no Supabase via Management API. Lê o token de ../.mcp.json (gitignored).
# Uso:  echo "select count(*) from public.sumulas;" | scripts/db_query.sh
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="kxiwvwbqnmqlaldqsaod"
TOKEN=$(python3 -c "import json;print(json.load(open('$ROOT/.mcp.json'))['mcpServers']['supabase']['env']['SUPABASE_ACCESS_TOKEN'])")
python3 -c 'import json,sys;print(json.dumps({"query":sys.stdin.read()}))' | \
curl -s "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data-binary @-
