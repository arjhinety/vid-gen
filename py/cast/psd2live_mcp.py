"""Minimal client for PSD2Live's local MCP server (Streamable HTTP, bearer token).

The PSD2Live desktop app must be running (it serves http://127.0.0.1:23871/mcp). The token is
read from the Windows user preferences by the app's own `mcp_proxy.get_token`.

    python py/cast/psd2live_mcp.py tools                      # list tool names
    python py/cast/psd2live_mcp.py call <tool> '<json args>' [--images out-dir]
    python py/cast/psd2live_mcp.py schema <tool>              # print one tool's input schema

As a library: `c = Client(); c.call("inspect", {"scope": "project"})` returns
{"text": [...], "images": [bytes, ...], "is_error": bool}.
"""

from __future__ import annotations

import base64
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "third_party" / "psd2live"))
from mcp_proxy import get_token  # noqa: E402

ENDPOINT = "http://127.0.0.1:23871/mcp"


class Client:
    def __init__(self, endpoint: str = ENDPOINT, timeout: float = 300):
        token = get_token()
        if not token:
            raise RuntimeError("no PSD2Live MCP token (start the PSD2Live app once)")
        self.endpoint = endpoint
        self.timeout = timeout
        self.headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        self.session: str | None = None
        self._id = 0
        init = self._rpc("initialize", {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "vid-gen", "version": "0.1"}})
        self.server = init.get("serverInfo", {})
        self._send({"jsonrpc": "2.0", "method": "notifications/initialized"})

    def _send(self, msg: dict) -> dict | None:
        h = dict(self.headers)
        if self.session:
            h["Mcp-Session-Id"] = self.session
        req = urllib.request.Request(self.endpoint, data=json.dumps(msg).encode(), headers=h, method="POST")
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            self.session = r.headers.get("Mcp-Session-Id") or self.session
            body = r.read().decode("utf-8")
            if not body.strip():
                return None
            if "text/event-stream" in (r.headers.get("Content-Type") or ""):
                last = None
                for line in body.splitlines():
                    if line.startswith("data:"):
                        data = line[5:].strip()
                        if data:
                            last = json.loads(data)
                return last
            return json.loads(body)

    def _rpc(self, method: str, params: dict) -> dict:
        self._id += 1
        res = self._send({"jsonrpc": "2.0", "id": self._id, "method": method, "params": params})
        if res is None:
            raise RuntimeError(f"no response to {method}")
        if "error" in res:
            raise RuntimeError(f"{method}: {res['error']}")
        return res["result"]

    def tools(self) -> list[dict]:
        return self._rpc("tools/list", {})["tools"]

    def call(self, tool: str, args: dict) -> dict:
        res = self._rpc("tools/call", {"name": tool, "arguments": args})
        out = {"text": [], "images": [], "is_error": bool(res.get("isError"))}
        for c in res.get("content", []):
            if c.get("type") == "text":
                out["text"].append(c["text"])
            elif c.get("type") == "image":
                out["images"].append(base64.b64decode(c["data"]))
        if "structuredContent" in res:
            out["structured"] = res["structuredContent"]
        return out


def main(argv: list[str]) -> int:
    c = Client()
    if argv[0] == "tools":
        for t in c.tools():
            print(t["name"], "-", (t.get("description") or "").splitlines()[0][:120])
    elif argv[0] == "schema":
        t = next(t for t in c.tools() if t["name"] == argv[1])
        print(json.dumps(t.get("inputSchema"), indent=1, ensure_ascii=False))
    elif argv[0] == "call":
        r = c.call(argv[1], json.loads(argv[2]) if len(argv) > 2 else {})
        for t in r["text"]:
            print(t)
        if r["images"] and "--images" in argv:
            d = Path(argv[argv.index("--images") + 1])
            d.mkdir(parents=True, exist_ok=True)
            for i, b in enumerate(r["images"]):
                (d / f"{argv[1]}-{i}.png").write_bytes(b)
                print("image:", d / f"{argv[1]}-{i}.png")
        return 1 if r["is_error"] else 0
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
