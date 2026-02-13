#!/usr/bin/env python3
"""OpenPad Data Bridge — polls openclaw status and writes JSON for the frontend."""

import json, subprocess, time, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "data", "status.json")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

print(f"🔗 OpenPad Bridge started — writing to {OUT}")

while True:
    try:
        raw = subprocess.run(
            ["openclaw", "status", "--json"],
            capture_output=True, text=True, timeout=30
        )
        if raw.returncode == 0 and raw.stdout.strip():
            data = json.loads(raw.stdout)

            # Get disk info
            disk_raw = subprocess.run(
                ["df", "-BG", "/"], capture_output=True, text=True, timeout=5
            )
            disk = {}
            if disk_raw.returncode == 0:
                lines = disk_raw.stdout.strip().split("\n")
                if len(lines) >= 2:
                    parts = lines[1].split()
                    disk = {
                        "totalGb": int(parts[1].rstrip("G")),
                        "usedGb": int(parts[2].rstrip("G")),
                        "freeGb": int(parts[3].rstrip("G")),
                        "percentUsed": int(parts[4].rstrip("%")),
                    }

            status = {
                "timestamp": int(time.time() * 1000),
                "os": data.get("os", {}),
                "gateway": data.get("gateway", {}),
                "agents": data.get("agents", {}),
                "sessions": data.get("sessions", {}),
                "heartbeat": data.get("heartbeat", {}),
                "memory": data.get("memory", {}),
                "disk": disk,
                "channels": {
                    "whatsapp": {"linked": data.get("linkChannel", {}).get("linked", False)},
                    "discord": {"configured": True},
                },
            }

            with open(OUT, "w") as f:
                json.dump(status, f, indent=2)

            ts = time.strftime("%H:%M:%S")
            sess_count = status["sessions"].get("count", "?")
            print(f"{ts} ✅ Updated ({sess_count} sessions)")
        else:
            print(f"{time.strftime('%H:%M:%S')} ❌ openclaw status failed")
    except Exception as e:
        print(f"{time.strftime('%H:%M:%S')} ❌ Error: {e}")

    time.sleep(15)
