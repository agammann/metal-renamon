"""Serve the browser game locally, including byte ranges used by CheerpJ."""
import argparse
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class GameHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.byte_range = None
        requested = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not requested or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        try:
            unit, interval = requested.split("=", 1)
            first, last = interval.split("-", 1)
            if unit != "bytes" or "," in interval or size == 0:
                raise ValueError()
            if first:
                start = int(first)
                end = min(int(last), size - 1) if last else size - 1
            else:
                length = int(last)
                if length <= 0:
                    raise ValueError()
                start, end = max(0, size - length), size - 1
            if start < 0 or start >= size or end < start:
                raise ValueError()
        except ValueError:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        source = open(path, "rb")
        source.seek(start)
        self.byte_range = (start, end)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        return source

    def copyfile(self, source, outputfile):
        if self.byte_range is None:
            return super().copyfile(source, outputfile)
        remaining = self.byte_range[1] - self.byte_range[0] + 1
        while remaining:
            data = source.read(min(65536, remaining))
            if not data:
                break
            outputfile.write(data)
            remaining -= len(data)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    os.chdir(Path(__file__).resolve().parent.parent)
    print(f"Play at http://127.0.0.1:{args.port}/", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), GameHandler).serve_forever()
