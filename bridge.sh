#!/bin/bash
# OpenPad Data Bridge
# Runs in background, writes live OpenClaw status to public/data/status.json every 15s
# Usage: ./bridge.sh

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/public/data/status.json"
mkdir -p "$DIR/public/data"

echo "🔗 OpenPad Bridge started — writing to $OUT"

while true; do
  # Get raw openclaw status
  RAW=$(openclaw status --json 2>/dev/null)
  
  if [ -n "$RAW" ]; then
    # Get disk info
    DISK=$(df -BG / 2>/dev/null | tail -1 | awk '{print "{\"totalGb\":" $2+0 ",\"usedGb\":" $3+0 ",\"freeGb\":" $4+0 ",\"percentUsed\":" $5+0 "}"}')
    
    # Combine into final JSON
    python3 -c "
import json, sys, time

raw = json.loads('''$RAW''')
disk = json.loads('''${DISK:-{}}''')

status = {
    'timestamp': int(time.time() * 1000),
    'os': raw.get('os', {}),
    'gateway': raw.get('gateway', {}),
    'agents': raw.get('agents', {}),
    'sessions': raw.get('sessions', {}),
    'heartbeat': raw.get('heartbeat', {}),
    'memory': raw.get('memory', {}),
    'disk': disk,
    'channels': {
        'whatsapp': {'linked': raw.get('linkChannel', {}).get('linked', False)},
        'discord': {'configured': True}
    }
}

with open('$OUT', 'w') as f:
    json.dump(status, f, indent=2)
" 2>/dev/null && echo "$(date +%H:%M:%S) ✅ Updated" || echo "$(date +%H:%M:%S) ❌ Parse error"
  else
    echo "$(date +%H:%M:%S) ❌ openclaw status failed"
  fi
  
  sleep 15
done
