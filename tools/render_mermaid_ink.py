#!/usr/bin/env python3
"""
Render Mermaid (.mmd) diagrams to SVG using https://mermaid.ink.

Usage:
  python3 tools/render_mermaid_ink.py diagrams

This script is only for generating static images for Markdown rendering.
The source-of-truth remains the .mmd files.
"""

from __future__ import annotations

import base64
import json
import pathlib
import subprocess
import sys
import zlib


def encode_mermaid(code: str) -> str:
    """
    Mermaid Ink supports both:
      - /svg/<base64url>
      - /svg/pako:<base64url(deflate_raw)>

    We always use pako to avoid URL length limits on larger diagrams.
    """
    # Mermaid Ink's `pako:` format is compatible with mermaid.live and is a
    # zlib-compressed JSON payload (not just the Mermaid code).
    payload = {
        "code": code,
        "mermaid": json.dumps({"theme": "default"}, ensure_ascii=False),
        "autoSync": True,
        "updateDiagram": True,
    }
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    compressed = zlib.compress(data, level=9)
    encoded = base64.urlsafe_b64encode(compressed).decode("ascii").rstrip("=")
    return f"pako:{encoded}"


def render_svg(code: str) -> bytes:
    encoded = encode_mermaid(code)
    url = f"https://mermaid.ink/svg/{encoded}"
    result = subprocess.run(
        ["curl", "-fsSL", "--retry", "3", "--retry-all-errors", "--retry-delay", "1", url],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=False,
    )
    return result.stdout


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 tools/render_mermaid_ink.py <diagram_dir>", file=sys.stderr)
        return 2

    diagram_dir = pathlib.Path(sys.argv[1]).resolve()
    if not diagram_dir.exists() or not diagram_dir.is_dir():
        print(f"Not a directory: {diagram_dir}", file=sys.stderr)
        return 2

    mmd_files = sorted(diagram_dir.glob("*.mmd"))
    if not mmd_files:
        print(f"No .mmd files found in {diagram_dir}", file=sys.stderr)
        return 1

    for mmd_path in mmd_files:
        code = mmd_path.read_text(encoding="utf-8")
        svg = render_svg(code)
        out_path = mmd_path.with_suffix(".svg")
        out_path.write_bytes(svg)
        print(f"Wrote {out_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
