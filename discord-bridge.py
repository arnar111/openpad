#!/usr/bin/env python3
"""Discord Bridge for OpenPad — polls messages + serves send API."""

import json, time, threading, os, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from datetime import datetime, timezone

BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
GUILD_ID = "1471287901282111529"
CHANNELS = {
    "adalras": {
        "id": "1471287901986885654",
        "name": "aðalrás",
        "icon": "💬",
        "desc": "Fyrirtækjaspjall",
    },
    "devchannel": {
        "id": "1472223401979412532",
        "name": "devchannel",
        "icon": "⚙️",
        "desc": "Kóði og tækni",
    },
}
WEBHOOKS = {
    "adalras": os.environ.get("DISCORD_WEBHOOK_ADALRAS", ""),
    "devchannel": os.environ.get("DISCORD_WEBHOOK_DEVCHANNEL", ""),
}

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", "data")
POLL_INTERVAL = 10  # seconds

# Agent mapping: Discord bot/user IDs → OpenPad agent IDs
AGENT_MAP = {
    "Blær": "blaer",
    "Frost": "frost",
    "Regn": "regn",
    "Ylur": "ylur",
    "Stormur": "stormur",
}

def discord_api(endpoint, method="GET", body=None):
    url = f"https://discord.com/api/v10{endpoint}"
    req = Request(url, method=method)
    req.add_header("Authorization", f"Bot {BOT_TOKEN}")
    req.add_header("User-Agent", "OpenPad-Bridge/1.0")
    if body:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(body).encode()
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        print(f"Discord API error: {e.code} {e.read().decode()[:200]}")
        return None

def fetch_messages(channel_id, limit=50):
    return discord_api(f"/channels/{channel_id}/messages?limit={limit}") or []

def transform_messages(raw_messages):
    """Convert Discord messages to OpenPad format."""
    messages = []
    for msg in reversed(raw_messages):  # oldest first
        author = msg.get("author", {})
        username = author.get("username", "unknown")
        display_name = author.get("global_name") or username
        
        # Map to agent ID
        agent_id = AGENT_MAP.get(display_name, None)
        if not agent_id:
            # Check if it's a webhook message (agent name in username)
            for name, aid in AGENT_MAP.items():
                if name.lower() in username.lower() or name.lower() in display_name.lower():
                    agent_id = aid
                    break
        if not agent_id:
            agent_id = "arnar"  # default to Arnar for unknown users

        # Parse timestamp
        ts = msg.get("timestamp", "")
        
        # Reactions
        reactions = []
        for r in msg.get("reactions", []):
            reactions.append({
                "emoji": r.get("emoji", {}).get("name", "👍"),
                "count": r.get("count", 1)
            })

        messages.append({
            "id": msg["id"],
            "agentId": agent_id,
            "authorName": display_name,
            "authorAvatar": f"https://cdn.discordapp.com/avatars/{author.get('id')}/{author.get('avatar')}.png" if author.get("avatar") else None,
            "text": msg.get("content", ""),
            "timestamp": ts,
            "reactions": reactions,
            "attachments": [a.get("url") for a in msg.get("attachments", [])],
        })
    return messages

def poll_loop():
    """Continuously fetch messages and write to JSON."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    last_counts = {}
    while True:
        try:
            all_channels = {}
            for slug, ch in CHANNELS.items():
                raw = fetch_messages(ch["id"], 50)
                if raw is not None:
                    msgs = transform_messages(raw)
                    all_channels[slug] = {
                        "id": ch["id"],
                        "name": ch["name"],
                        "icon": ch["icon"],
                        "desc": ch["desc"],
                        "messages": msgs,
                    }
                    if len(msgs) != last_counts.get(slug, 0):
                        ts = datetime.now().strftime("%H:%M:%S")
                        print(f"{ts} ✅ #{ch['name']}: {len(msgs)} messages")
                        last_counts[slug] = len(msgs)

            global latest_data
            latest_data = {
                "guildId": GUILD_ID,
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "channels": all_channels,
            }
            # Also write to file for local dev
            out = os.path.join(OUTPUT_DIR, "discord-messages.json")
            with open(out, "w", encoding="utf-8") as f:
                json.dump(latest_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Poll error: {e}")
        
        time.sleep(POLL_INTERVAL)


latest_data = {}

class SendHandler(BaseHTTPRequestHandler):
    """HTTP handler for sending messages + serving data."""
    
    def do_GET(self):
        if self.path.startswith("/messages"):
            self._respond(200, latest_data)
        else:
            self._respond(404, {"error": "Not found"})
    
    def do_POST(self):
        if self.path == "/send":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            text = body.get("text", "").strip()
            username = body.get("username", "Arnar 👑")
            channel_slug = body.get("channel", "adalras")
            
            if not text:
                self._respond(400, {"error": "No text"})
                return
            
            # Send via bot API to specific channel
            ch = CHANNELS.get(channel_slug, CHANNELS["adalras"])
            target_channel_id = ch["id"]
            
            payload = json.dumps({
                "content": text,
            }).encode()
            
            webhook_url = WEBHOOKS.get(channel_slug, WEBHOOKS.get("adalras", ""))
            if not webhook_url:
                self._respond(500, {"error": "No webhook for channel"})
                return
            
            req = Request(webhook_url, data=json.dumps({"content": text, "username": username}).encode(), method="POST")
            req.add_header("Content-Type", "application/json")
            try:
                with urlopen(req) as resp:
                    self._respond(200, {"ok": True})
            except HTTPError as e:
                self._respond(500, {"error": str(e)})
        else:
            self._respond(404, {"error": "Not found"})
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
    
    def _respond(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def log_message(self, format, *args):
        pass  # quiet


def main():
    print("🔌 OpenPad Discord Bridge")
    ch_names = ', '.join('#' + c['name'] for c in CHANNELS.values())
    print(f"   Channels: {ch_names}")
    print(f"   Polling every {POLL_INTERVAL}s")
    print(f"   Send API on :5181")
    print()
    
    # Start poll thread
    t = threading.Thread(target=poll_loop, daemon=True)
    t.start()
    
    # Start HTTP server for sending
    server = HTTPServer(("0.0.0.0", 5181), SendHandler)
    print("✅ Bridge running!")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Stopping bridge")
        server.shutdown()


if __name__ == "__main__":
    main()
