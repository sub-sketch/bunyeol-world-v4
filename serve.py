# -*- coding: utf-8 -*-
"""로컬 확인용 미니 서버. 폴더 빌드(dist_game/)는 외부 파일을 읽으므로
   index.html 을 더블클릭하면 브라우저가 막을 수 있다. 이걸로 열어서 본다.

   python serve.py          -> http://localhost:8000 에서 dist_game/ 을 연다
"""
import http.server, socketserver, os, sys, webbrowser
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist_game")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
if not os.path.isdir(ROOT):
    print("dist_game/ 이 없습니다. 먼저:  python build.py --folder"); sys.exit(1)
os.chdir(ROOT)
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
with socketserver.TCPServer(("", PORT), H) as httpd:
    url = "http://localhost:%d/" % PORT
    print("서버 시작: %s   (Ctrl+C 로 종료)" % url)
    try: webbrowser.open(url)
    except Exception: pass
    httpd.serve_forever()
