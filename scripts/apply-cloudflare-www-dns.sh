#!/usr/bin/env bash
# Add www DNS + redirect www → apex for naijajollofw.ca
# Fixes WhatsApp/link previews for www.naijajollofw.ca (was NXDOMAIN).
# Requires CLOUDFLARE_API_TOKEN with Zone > DNS > Edit and Zone > Single Redirect > Edit.
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-5c17d169148efbb983be81ae12d2dce1}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (Zone DNS + Redirect Rules Edit)}"
DNS_BASE="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records"
WWW_FQDN="www.naijajollofw.ca"
WWW_RULE_DESC="Redirect www to apex — SEO + WhatsApp link previews"

# --- 1. www CNAME (proxied) ---
# Cloudflare list filters expect the FQDN (same pattern as apply-email-dns.sh).
existing=$(curl -fsS -G "$DNS_BASE" \
  -H "Authorization: Bearer ${TOKEN}" \
  --data-urlencode "type=CNAME" \
  --data-urlencode "name=${WWW_FQDN}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin).get('result') or []; print(r[0]['id'] if r else '')")

if [[ -n "$existing" ]]; then
  curl -fsS -X PATCH "${DNS_BASE}/${existing}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"type":"CNAME","name":"www","content":"naijajollofw.ca","proxied":true,"ttl":1}'
  echo "Updated CNAME www → naijajollofw.ca"
else
  curl -fsS -X POST "$DNS_BASE" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"type":"CNAME","name":"www","content":"naijajollofw.ca","proxied":true,"ttl":1}'
  echo "Created CNAME www → naijajollofw.ca"
fi

# --- 2. Redirect www → apex (301) ---
# GET existing entrypoint rules first, then PUT a merged set so we do not wipe
# unrelated zone redirect rules.
ENTRYPOINT_URL="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/phases/http_request_dynamic_redirect/entrypoint"

entrypoint_json=$(curl -fsS "$ENTRYPOINT_URL" \
  -H "Authorization: Bearer ${TOKEN}" || echo '{"result":{"rules":[]}}')

merged=$(WWW_RULE_DESC="$WWW_RULE_DESC" python3 -c '
import json, os, sys
payload = json.loads(sys.argv[1])
result = payload.get("result") or {}
rules = list(result.get("rules") or [])
desc = os.environ["WWW_RULE_DESC"]
www_rule = {
    "expression": "(http.host eq \"www.naijajollofw.ca\")",
    "description": desc,
    "action": "redirect",
    "enabled": True,
    "action_parameters": {
        "from_value": {
            "target_url": {
                "expression": "concat(\"https://naijajollofw.ca\", http.request.uri.path)"
            },
            "status_code": 301,
            "preserve_query_string": True,
        }
    },
}
kept = [r for r in rules if r.get("description") != desc]
kept = [
    r for r in kept
    if "http.host eq \"www.naijajollofw.ca\"" not in (r.get("expression") or "")
]
# Preserve rule ids for existing rules Cloudflare already knows.
for rule in kept:
    # Drop read-only fields that PUT rejects if present as empty/unknown.
    for key in ("last_updated", "version", "ref"):
        rule.pop(key, None)
kept.append(www_rule)
print(json.dumps({"rules": kept}))
' "$entrypoint_json")

curl -fsS -X PUT "$ENTRYPOINT_URL" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$merged"

echo "Redirect rule applied (merged): www.naijajollofw.ca → https://naijajollofw.ca"
echo ""
echo "Verify:"
echo "  host www.naijajollofw.ca 8.8.8.8"
echo "  curl -sI https://www.naijajollofw.ca | grep -i location"
echo ""
echo "Clear WhatsApp/Facebook cache: https://developers.facebook.com/tools/debug/?q=https%3A%2F%2Fwww.naijajollofw.ca"
