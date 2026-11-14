# LunaLens website — 14 November 2026

Complete standalone website snapshot: dark interface, English/French/Chinese, lunar sky, interactive 3D terrain and time views, site comparisons and annual calendar. It is independent of the shared repository's backend/frontend implementation.

The archive itself is a GitHub release, not a repository file: 35 MB of zip parts in git made every clone pay for a
one-off transfer. The four text files next to this one (`README.md`, `TODO.md`, this file, the manifest) stay here.

## Download and run

1. Download the release assets `lunalens.zip.part01`–`lunalens.zip.part12`, `restore-lunalens.py` and
   `lunalens-files.json` into one folder: https://github.com/binggao1230/LunaLens/releases/tag/lunalens-snapshot-2026-11-14
   — or from a terminal, `gh release download lunalens-snapshot-2026-11-14 --pattern '*'`. The repository is private,
   so sign in to GitHub or the download returns 404.
2. In that folder run `python3 restore-lunalens.py` (Windows: `py restore-lunalens.py`). It combines the parts, verifies their hash, extracts the full `lunalens/` directory and checks each file.
3. Run `cd lunalens`, then `python3 tools/serve.py 8765` (Windows: `py tools/serve.py 8765`).
4. Open http://127.0.0.1:8765/.

All terrain data, fonts, source files and run instructions are included. No API key or frontend installation is required. See the extracted README.md and CREDITS.md for methodology, limitations and attribution.

The transfer archive is split into small files because large browser uploads failed. This is a source delivery, not a live website deployment. After extraction, publish `lunalens/site/` to a static host; serve `.gz` terrain as binary without an HTTP Content-Encoding: gzip header.
