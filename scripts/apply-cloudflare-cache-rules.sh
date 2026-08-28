#!/usr/bin/env bash
# Apply Naija Jollof zone cache rules (requires CLOUDFLARE_API_TOKEN with
# Zone > Cache Rules > Edit). Wrangler OAuth does not include this scope.
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-5c17d169148efbb983be81ae12d2dce1}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (Zone Cache Rules Edit)}"

curl -fsS -X PUT \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data @- <<'EOF'
{
  "rules": [
    {
      "expression": "(http.host eq \"naijajollofw.ca\" or http.host eq \"new.naijajollofw.ca\" or http.host eq \"www.naijajollofw.ca\") and (starts_with(http.request.uri.path, \"/api/\") or starts_with(http.request.uri.path, \"/account\") or http.request.uri.path eq \"/checkout\" or starts_with(http.request.uri.path, \"/dashboard\") or http.request.uri.path eq \"/login\" or http.request.uri.path eq \"/signin\" or http.request.uri.path eq \"/signup\" or http.request.uri.path eq \"/forgot-password\" or starts_with(http.request.uri.path, \"/monitoring\"))",
      "description": "Bypass cache — API, auth, checkout, dashboard, Sentry tunnel",
      "action": "set_cache_settings",
      "enabled": true,
      "action_parameters": { "cache": false }
    },
    {
      "expression": "(http.host eq \"media.naijajollofw.ca\")",
      "description": "Cache everything — R2 media custom domain",
      "action": "set_cache_settings",
      "enabled": true,
      "action_parameters": {
        "cache": true,
        "edge_ttl": { "mode": "override_origin", "default": 2678400 },
        "browser_ttl": { "mode": "override_origin", "default": 86400 }
      }
    },
    {
      "expression": "(http.host eq \"naijajollofw.ca\" or http.host eq \"new.naijajollofw.ca\" or http.host eq \"www.naijajollofw.ca\") and (starts_with(http.request.uri.path, \"/_next/static/\") or starts_with(http.request.uri.path, \"/brand/\") or http.request.uri.path eq \"/sw.js\")",
      "description": "Cache static assets — Next chunks, brand, service worker",
      "action": "set_cache_settings",
      "enabled": true,
      "action_parameters": {
        "cache": true,
        "edge_ttl": { "mode": "override_origin", "default": 2678400 },
        "browser_ttl": { "mode": "respect_origin" }
      }
    }
  ]
}
EOF

echo "Cache rules applied for zone ${ZONE_ID}."
