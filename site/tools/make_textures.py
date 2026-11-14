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
GIBS = (
    "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap"
    "&LAYERS=BlueMarble_ShadedRelief_Bathymetry&STYLES=&CRS=EPSG:4326&BBOX=-90,-180,90,180"
    "&WIDTH=4096&HEIGHT=2048&FORMAT=image/jpeg"
)

TEXTURES = {
    "moon": [
        (f"{SVS}/lroc_color_poles_4k.tif", "lroc_color_poles_4k.tif", "moon_color_4k.webp", 4096, 2048, 92),
        (f"{SVS}/ldem_4.tif", "ldem_4.tif", None, None, None, None),
    ],
    # NASA GIBS WMS: one 4096x2048 equirectangular frame of the Blue Marble shaded-relief layer. The disk is
    # a third of the screen when the scene faces Earth, so 4k is the point where it stops looking soft.
    "earth": [(GIBS, "earth_gibs_4k.jpg", "earth_day_4k.webp", 4096, 2048, 90)],
    # SDO/AIA 304 A full disk, used as the Sun's apparent disk (it is 0.5 deg wide from the Moon). Fetched at
    # 2048 px and cut down, so the granulation survives the crop and the tint.
    "sun": [("https://sdo.gsfc.nasa.gov/assets/img/latest/latest_2048_0304.jpg", "sdo_304_2k.jpg", "sun_disk_1k.webp", 1024, 1024, 92)],
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


def convert_sun(source: Path, target: Path) -> None:
    """SDO/AIA 304 A frame -> a warm disk with a transparent surround.

    The published frame puts the disk inside a black field with a timestamp printed under it. Crop above the
    caption, use luminance as the texture and as the alpha mask so the sprite blends into the sky instead of
    showing a black square, and unsharp-mask the result: the crop and the resize together take the
    granulation out otherwise. 304 A is false colour, so it is desaturated and tinted towards white.
    """
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["magick", str(source), "-crop", "1800x1700+124+172", "+repage", "-resize", "1024x1024!",
         "-colorspace", "Gray", "-normalize",
         "-unsharp", "0x1+0.9+0.02",
         "(", "+clone", "-alpha", "off", "-level", "2%,28%", ")",
         "-compose", "CopyOpacity", "-composite",
         "-fill", "#ffd79b", "-colorize", "55", "-modulate", "110,120,100",
         "-quality", "94", "-define", "webp:method=6", str(target)],
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
                if step == "sun":
                    convert_sun(source, ASSETS / out_name)
                else:
                    convert(source, ASSETS / out_name, width, height, quality)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
