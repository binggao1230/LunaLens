"""Build the texture assets under site/assets/ from public NASA imagery.

Sources (all NASA, public domain; SVS credits are shown on the page's Data view):
  Moon colour  https://svs.gsfc.nasa.gov/4720  lroc_color_poles_4k.tif  (LROC WAC, 4096×2048)
  Moon relief  https://svs.gsfc.nasa.gov/4720  ldem_4.tif               (4 px/deg, for the normal map)

Downloads land in site/data/ (gitignored, 12-63 MB) and the products in site/assets/ (committed, a few MB).
Run from the repository root:

    python3 site/tools/make_textures.py moon

Needs ImageMagick (`magick`); Pillow is not installed on this machine.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "site" / "data"
ASSETS = ROOT / "site" / "assets"

SVS = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720"

TEXTURES = {
    "moon": [
        (f"{SVS}/lroc_color_poles_4k.tif", "lroc_color_poles_4k.tif", "moon_color_4k.webp", 4096, 2048, 92),
        (f"{SVS}/ldem_4.tif", "ldem_4.tif", None, None, None, None),
    ],
    # Filled in when the Earth and Sun steps run.
    "earth": [],
    "sun": [],
}


def fetch(url: str, dest: Path) -> Path:
    if dest.is_file() and dest.stat().st_size > 0:
        print(f"  cached  {dest.name} ({dest.stat().st_size / 1048576:.1f} MB)")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  fetch   {url}")
    with urllib.request.urlopen(url, timeout=300) as response, dest.open("wb") as handle:
        shutil.copyfileobj(response, handle, length=1 << 20)
    print(f"  saved   {dest.name} ({dest.stat().st_size / 1048576:.1f} MB)")
    return dest


def convert(source: Path, target: Path, width: int, height: int, quality: int) -> None:
    if not shutil.which("magick"):
        raise SystemExit("ImageMagick is required: brew install imagemagick")
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["magick", str(source), "-resize", f"{width}x{height}!", "-colorspace", "sRGB",
         "-quality", str(quality), "-define", "webp:method=6", str(target)],
        check=True,
    )
    print(f"  product {target.relative_to(ROOT)} ({target.stat().st_size / 1048576:.2f} MB)")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("what", choices=["moon", "earth", "sun", "all"], nargs="?", default="all")
    args = parser.parse_args()
    steps = ["moon", "earth", "sun"] if args.what == "all" else [args.what]
    for step in steps:
        entries = TEXTURES[step]
        if not entries:
            print(f"{step}: nothing defined yet")
            continue
        print(f"{step}:")
        for url, raw_name, out_name, width, height, quality in entries:
            source = fetch(url, DATA / raw_name)
            if out_name:
                convert(source, ASSETS / out_name, width, height, quality)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
