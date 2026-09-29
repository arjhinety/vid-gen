"""Graddy-chan's rig edits, applied through PSD2Live's MCP to the auto-rigged model.

Each step is idempotent enough to re-run on a freshly imported PSD (`asset psd`), and every
edit is recorded here, so the rig is reproducible from build/cast/rig/graddy.psd:

  1. Blink = the open eye squeezing shut. The drawn closed eyes are happy arcs, which read
     as a smile, and PSD2Live cross-faded them against the half-closed eye (a double image
     on every blink in-between). They become an expression toggle on ParamEyeSmile instead.
  2. Each iris is masked by its own eye white (no iris sliver below a closed lid).
  3. Mouth = drawn chibi shapes swapped whole (anime lip flap): the `mouthshape-*` layers are
     exclusive variants on ParamMouthShape (value = shape index, order as in psd_prep.MOUTH_SHAPES),
     classed as face detail so they follow the head without PSD2Live's realistic lip warp.

    python py/cast/rig_graddy.py [--psd build/cast/rig/graddy.psd] [--views out-dir] [--export out-dir]

Run against a freshly started PSD2Live app (empty workspace): it imports the PSD, then edits.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from psd2live_mcp import Client  # noqa: E402

FACE = {"mode": "canvas_rect", "left": 380, "top": 330, "width": 560, "height": 330}
MOUTH_VIEW = {"mode": "canvas_rect", "left": 540, "top": 530, "width": 260, "height": 170}
MOUTHS = ("closed", "small", "ah", "oh", "laugh")  # ParamMouthShape value = index


def state_of(res: dict) -> str | None:
    for t in res["text"]:
        try:
            s = json.loads(t).get("state")
            if s:
                return s
        except (ValueError, AttributeError):
            pass
    return None


class Session:
    def __init__(self, psd: Path):
        self.c = Client()
        proj = json.loads(self.c.call("inspect", {"scope": "project"})["text"][0])
        if not proj.get("loaded"):
            # PSD2Live imports only into an empty workspace (restart the app to get one)
            r = self.c.call("asset", {"request": {"mode": "psd", "path": str(psd.resolve())}})
            if r["is_error"]:
                raise RuntimeError(r["text"])
            proj = json.loads(self.c.call("inspect", {"scope": "project"})["text"][0])
        self.state = proj["state"]

    def call(self, tool: str, args: dict, check: bool = True) -> dict:
        if "request" in args:
            args["request"].setdefault("state", self.state)
        else:
            args.setdefault("state", self.state)
        r = self.c.call(tool, args)
        if r["is_error"] and check:
            raise RuntimeError(f"{tool}: {r['text']}")
        self.state = state_of(r) or self.state
        return r

    def layer_ids(self) -> dict[str, str]:
        """Source layer name -> layer id ("<psd layer name>#<psd index>")."""
        out: dict[str, str] = {}
        offset: int | None = 0
        while offset is not None:
            r = self.c.call("inspect", {"scope": "layers", "offset": offset, "limit": 64})
            if r["is_error"]:
                raise RuntimeError(f"inspect layers: {r['text']}")
            page = json.loads(r["text"][0])
            out.update({it["name"]: it["id"] for it in page.get("items", []) if "name" in it and "id" in it})
            offset = page.get("next")
        return out

    def params(self) -> list[str]:
        r = self.c.call("inspect", {"scope": "parameters"})
        return [p.get("id") for p in json.loads(r["text"][0]).get("items", [])]

    def view(self, poses: list[dict], out: Path, viewport: dict = FACE):
        r = self.c.call("view", {"request": {"mode": "poses", "viewport": viewport, "poses": poses, "target_long_edge": 1600}})
        if r["images"]:
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(r["images"][0])
        return r


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--psd", default="build/cast/rig/graddy.psd")
    p.add_argument("--views")
    p.add_argument("--export")
    a = p.parse_args(argv)
    s = Session(Path(a.psd))

    # 1. drawn closed eyes -> expression toggle
    if "ParamEyeSmile" not in s.params():
        s.call("parameter", {"request": {"mode": "create", "parameter_id": "ParamEyeSmile", "name": "Eye Smile", "min": 0, "max": 1, "default": 0}})
    ids = s.layer_ids()
    for name in ("eye close-l", "eye close-r"):
        s.call("layer", {"layer_id": ids[name], "type": "toggle", "parameter": "ParamEyeSmile"})
        print("toggle:", ids[name])

    # 2. each iris is clipped by its own eye white, so no sliver of iris shows past a closed lid
    s.call("structure", {"edits": [
        {"action": "static", "kind": "mesh", "id": "ArtMeshIridesL", "masked_by": ["ArtMeshEyewhiteL"]},
        {"action": "static", "kind": "mesh", "id": "ArtMeshIridesR", "masked_by": ["ArtMeshEyewhiteR"]},
    ]})

    # 3. drawn mouth shapes -> one exclusive switch
    if "ParamMouthShape" not in s.params():
        s.call("parameter", {"request": {"mode": "create", "parameter_id": "ParamMouthShape", "name": "Mouth Shape", "min": 0, "max": len(MOUTHS) - 1, "default": 0}})
    for i, shape in enumerate(MOUTHS):
        if lid := ids.get(f"mouthshape-{shape}"):
            s.call("layer", {"layer_id": lid, "type": "switch", "role": "face_detail", "parameter": "ParamMouthShape", "switch_id": i})
            print("switch:", lid, i)

    if a.views:
        d = Path(a.views)
        blink = [{"ParamEyeLOpen": v, "ParamEyeROpen": v} for v in (1, 0.7, 0.45, 0.2, 0)]
        s.view(blink, d / "blink.png")
        s.view([{"ParamEyeSmile": 0}, {"ParamEyeSmile": 1}, {"ParamEyeSmile": 1, "ParamMouthShape": MOUTHS.index("laugh")}], d / "smile.png")
        s.view([{"ParamMouthShape": i} for i in range(len(MOUTHS))], d / "mouths.png", MOUTH_VIEW)
        s.view([{"ParamMouthShape": MOUTHS.index("ah"), "ParamAngleX": x, "ParamAngleY": y} for x, y in ((-30, 0), (30, 0), (0, 20), (0, -20))], d / "mouth-turn.png", FACE)
    if a.export:
        r = s.call("export", {"output_directory": str(Path(a.export).resolve())})
        print("\n".join(r["text"])[:1500])
    print("state", s.state)
    return 0


if __name__ == "__main__":
    sys.exit(main())
