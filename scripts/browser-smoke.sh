#!/usr/bin/env bash
# Browser smoke on CI's preinstalled Chromium/Chrome; no npm dependencies.
set -euo pipefail
CHROME="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME" ]]; then
 echo "Chrome/Chromium unavailable on runner; browser verification required."
 exit 1
fi
PORT=4182 node scripts/dev-server.mjs >/tmp/uke-browser-server.log 2>&1 &
server=$!
work="$(mktemp -d)"
cleanup() { kill "$server" 2>/dev/null || true; rm -rf "$work"; }
trap cleanup EXIT
for _ in $(seq 1 30);do
 if curl -fsS http://127.0.0.1:4182/tests/browser-smoke.html >/dev/null 2>&1;then break;fi
 sleep .2
done
curl -fsS http://127.0.0.1:4182/tests/browser-smoke.html >/dev/null
for dimensions in 390,844 1280,900;do
 passed=0
 for attempt in 1 2 3;do
  output="$work/output-$attempt"
  errors="$work/errors-$attempt"
  profile="$(mktemp -d "$work/profile.XXXXXX")"
  if timeout 50 "$CHROME" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
   --disable-extensions --disable-background-networking --no-first-run \
   --virtual-time-budget=20000 --window-size="$dimensions" \
   --user-data-dir="$profile" --dump-dom \
   http://127.0.0.1:4182/tests/browser-smoke.html >"$output" 2>"$errors";then
   if grep -q 'id="browserQaStatus" data-status="pass"' "$output";then
    echo "Chromium browser smoke passed for $dimensions (attempt $attempt)"
    passed=1
    break
   fi
   if grep -q 'id="browserQaStatus" data-status="fail"' "$output";then
    echo "Browser assertion failed for $dimensions"
    grep -A2 -B2 'browserQaStatus' "$output" || true
    exit 1
   fi
  fi
  echo "Browser did not finish for $dimensions (attempt $attempt); retry with fresh profile"
 done
 if [[ "$passed" -ne 1 ]];then
  grep -A2 -B2 'browserQaStatus' "$output" || true
  tail -30 "$errors"
  exit 1
 fi
done
