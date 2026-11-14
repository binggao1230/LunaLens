"""Build the map assets used by prototype/index.html.

Sources (public NASA data):
  DEM   https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/LDEM_75S_240M.IMG  (+ .LBL)
  Image https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg  (SVS CGI Moon Kit)

Usage:
  python3 -I prototype/make_prototype_assets.py <LDEM_75S_240M.IMG> <out_dir>

Label values used (LDEM_75S_240M.LBL): 3812 x 3812, LSB 16-bit signed, height_m = DN * 0.5,
polar stereographic centred on 90S / 0E, 240 m/pixel, projection offsets 1905.5.
The script block-averages 5x5 to a 762 x 762 grid at 1200 m/pixel and writes int16 metres.
It also prints a projection sanity check at Shackleton crater.
"""
import math
import sys

import numpy as np

N, SCALE_M, DN_TO_M, BLOCK, R_M = 3812, 240.0, 0.5, 5, 1737400.0
OFFSET = 1905.5


def rowcol(lat, lon, flip=False):
    r = 2 * R_M * math.tan(math.radians(90 + lat) / 2)
    x = r * math.sin(math.radians(lon)) * (-1 if flip else 1)
    y = r * math.cos(math.radians(lon))
    return int(round(OFFSET - y / SCALE_M)), int(round(OFFSET + x / SCALE_M))


def main(img_path, out_dir):
    dem = np.fromfile(img_path, dtype="<i2").reshape(N, N).astype(np.float32) * DN_TO_M
    for flip in (False, True):
        r, c = rowcol(-89.67, 129.8, flip)
        print(f"Shackleton centre, east-right={not flip}: {dem[r, c]:.0f} m "
              f"(patch min {dem[r-20:r+20, c-20:c+20].min():.0f} m)")
    n = (N // BLOCK) * BLOCK
    small = dem[:n, :n].reshape(n // BLOCK, BLOCK, n // BLOCK, BLOCK).mean(axis=(1, 3))
    small.round().astype("<i2").tofile(f"{out_dir}/sp_dem_1200m.bin")
    print("wrote", small.shape, "min/max m", small.min(), small.max())


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
