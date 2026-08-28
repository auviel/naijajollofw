#!/usr/bin/env bash
# Add/update BIMI + strict DMARC for naijajollofw.ca
# Requires CLOUDFLARE_API_TOKEN with Zone > DNS > Edit
set -euo pipefail

ZONE_ID="${CLOUDFLARE_ZONE_ID:-5c17d169148efbb983be81ae12d2dce1}"
TOKEN="${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (Zone DNS Edit)}"
BASE="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records"

upsert_txt() {
  local name="$1"
  local content="$2"
  local fqdn="${name}.naijajollofw.ca"
  local existing
  existing=$(curl -fsS -G "$BASE" \
    -H "Authorization: Bearer ${TOKEN}" \
    --data-urlencode "type=TXT" \
    --data-urlencode "name=${fqdn}" | python3 -c "import sys,json; r=json.load(sys.stdin).get('result') or []; print(r[0]['id'] if r else '')")

  if [[ -n "$existing" ]]; then
    curl -fsS -X PATCH "${BASE}/${existing}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$(python3 - <<PY
import json
print(json.dumps({"type":"TXT","name":"${name}","content":"${content}","ttl":1}))
PY
)"
    echo "Updated TXT ${name}"
  else
    curl -fsS -X POST "$BASE" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$(python3 - <<PY
import json
print(json.dumps({"type":"TXT","name":"${name}","content":"${content}","ttl":1}))
PY
)"
    echo "Created TXT ${name}"
  fi
}

# Keep your Cloudflare DMARC reporting address — edit rua if yours differs.
DMARC='v=DMARC1; p=quarantine; sp=quarantine; adkim=r; aspf=r; pct=100; rua=mailto:b88f68b859df4b8893d514d08309b219@dmarc-reports.cloudflare.com'
BIMI='v=BIMI1; l=https://naijajollofw.ca/brand/bimi-logo.svg;'

upsert_txt "_dmarc" "$DMARC"
upsert_txt "default._bimi" "$BIMI"

echo "Done. Deploy the site so https://naijajollofw.ca/brand/bimi-logo.svg is live."
