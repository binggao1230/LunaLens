"""Serve this folder locally:  python3 tools/serve.py [port]

A threaded static server with a deep listen queue. Plain `python3 -m http.server` drops
connections when a browser opens many at once, which leaves the page half-loaded.
"""
import functools
import http.server
import pathlib
import sys

SITE = pathlib.Path(__file__).resolve().parent.parent


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".webp": "image/webp", ".woff2": "font/woff2"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8768
    # 0.0.0.0, not 127.0.0.1: the team opens the site from other machines on the LAN and over Tailscale.
    with Server(("0.0.0.0", port), functools.partial(Handler, directory=str(SITE))) as server:
        print(f"LunaLens at http://0.0.0.0:{port}/  (LAN: this machine's IP)  (Ctrl+C to stop)")
        server.serve_forever()
