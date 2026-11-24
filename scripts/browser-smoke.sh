#!/usr/bin/env bash
# Browser smoke on CI's preinstalled Chromium/Chrome; no npm dependencies.
set -euo pipefail
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME" ]]; then
 echo "::warning::Chrome/Chromium unavailable on runner: physical/browser smoke remains unverified."
 exit 0
fi
PORT=4182 node scripts/dev-server.mjs >/tmp/uke-browser-server.log 2>&1 &
server=$!
profile="$(mktemp -d)"
cleanup(){kill "$server" 2>/dev/null || true;rm -rf "$profile";}
trap cleanup EXIT
for _ in $(seq 1 30);do
 if curl -fsS http://127.0.0.1:4182/tests/browser-smoke.html >/dev/null;then break;fi
 sleep .2
done
for dimensions in 390,844 1280,900;do
 output="$(mktemp)"
 timeout 50 "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --disable-extensions --disable-background-networking --no-first-run \
  --virtual-time-budget=6500 --window-size="$dimensions" \
  --user-data-dir="$profile" --dump-dom \
  http://127.0.0.1:4182/tests/browser-smoke.html >"$output" 2>/tmp/uke-browser-errors.log || {
    cat /tmp/uke-browser-errors.log;rm -f "$output";exit 1;
  }
 if ! grep -q 'id="browserQaStatus" data-status="pass"' "$output";then
   echo "Browser smoke failed for viewport $dimensions"
   grep -A2 -B2 'browserQaStatus' "$output" || true
   cat /tmp/uke-browser-errors.log | tail -30
   rm -f "$output";exit 1
 fi
 echo "Chromium browser smoke passed for $dimensions"
 rm -f "$output"
done
