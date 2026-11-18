#!/usr/bin/env python3
"""Tiny static server for Coffee Watch: gzip for text/model files, long cache for assets."""
import gzip, io, mimetypes, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

mimetypes.add_type('model/gltf-binary', '.glb'); mimetypes.add_type('model/gltf+json', '.gltf')
mimetypes.add_type('application/octet-stream', '.hdr'); mimetypes.add_type('text/javascript', '.js')
GZ = {'.html', '.css', '.js', '.gltf', '.glb', '.hdr', '.json', '.svg', '.bin', '.txt'}

class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        p = self.path.split('?')[0]
        long = p.startswith(('/assets/', '/vendor/'))
        self.send_header('Cache-Control', 'public, max-age=604800' if long else 'no-cache')
        super().end_headers()

    def do_GET(self):
        path = self.translate_path(self.path)
        ext = os.path.splitext(path)[1].lower()
        if ext in GZ and os.path.isfile(path) and 'gzip' in self.headers.get('Accept-Encoding', ''):
            data = gzip.compress(open(path, 'rb').read(), 6)
            self.send_response(200)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Vary', 'Accept-Encoding')
            self.end_headers(); self.wfile.write(data); return
        super().do_GET()

    def log_message(self, *a): pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print(f'Coffee Watch → http://localhost:{port}')
    ThreadingHTTPServer(('', port), H).serve_forever()
