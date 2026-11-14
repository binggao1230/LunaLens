# LunaLens website — 14 November 2026

Complete standalone website snapshot: dark interface, English/French/Chinese, lunar sky, interactive 3D terrain and time views, site comparisons and annual calendar. It is independent of the shared repository's backend/frontend implementation.

## Download and run

1. Download all `lunalens.zip.partXX` files, `restore-lunalens.py` and `lunalens-files.json` into one folder. Download the actual files using GitHub's Raw/Download button, not the HTML preview pages. Alternatively download the repository ZIP and use its `team/chenlin` directory.
2. In that folder run `python3 restore-lunalens.py` (Windows: `py restore-lunalens.py`). It combines the parts, verifies their hash, extracts the full `lunalens/` directory and checks each file.
3. Run `cd lunalens`, then `python3 tools/serve.py 8765` (Windows: `py tools/serve.py 8765`).
4. Open http://127.0.0.1:8765/.

All terrain data, fonts, source files and run instructions are included. No API key or frontend installation is required. See the extracted README.md and CREDITS.md for methodology, limitations and attribution.

The transfer archive is split into small files because large browser uploads failed. This is a source delivery, not a live website deployment. After extraction, publish `lunalens/site/` to a static host; serve `.gz` terrain as binary without an HTTP Content-Encoding: gzip header.
