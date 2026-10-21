"""Publish only public articles from the configured Google Apps Script feed."""
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]

def sync():
    page = (ROOT / 'blog.html').read_text(encoding='utf-8')
    endpoint = re.search(r'data-blog-endpoint="(https://script\.google\.com/macros/s/[^"/]+/exec)"', page)
    if not endpoint:
        raise ValueError('No public blog endpoint configured')
    for attempt in range(3):
        try:
            request = Request(endpoint.group(1) + '?type=blog', headers={'User-Agent': 'MatsunoBlogPublisher/1.0'})
            with urlopen(request, timeout=30) as response:
                payload = json.load(response)
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    if payload.get('error') or not isinstance(payload.get('posts'), list):
        raise ValueError('Public article feed returned an error; keeping the last published data')
    posts = []
    seen = set()
    for item in payload['posts']:
        if item.get('status') != '公開':
            continue
        post = {key: str(item.get(key, '')) for key in ('id', 'date', 'title', 'content', 'excerpt')}
        if not post['id'] or post['id'] in seen or not post['title']:
            raise ValueError('Missing or duplicate public article ID/title')
        seen.add(post['id'])
        legacy = re.fullmatch(r'legacy-(\d+)', post['id'])
        source_url = item.get('url', '')
        if urlparse(source_url).scheme in ('http', 'https'):
            post['url'] = source_url
        elif legacy:
            post['url'] = 'http://blog.livedoor.jp/kuniichi/archives/' + legacy.group(1) + '.html'
        posts.append(post)
    posts.sort(key=lambda p: p['date'].replace('.', '-').replace('/', '-'), reverse=True)
    target = ROOT / 'assets' / 'data' / 'blog.json'
    if target.exists():
        current = json.loads(target.read_text(encoding='utf-8'))
        if current.get('posts') == posts:
            print(f'No changes: {len(posts)} public articles')
            return
    result = {'updatedAt': datetime.now(timezone.utc).isoformat(), 'posts': posts}
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = target.with_suffix('.tmp')
    staging.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    staging.replace(target)
    print(f'Published article data updated: {len(posts)} articles')

if __name__ == '__main__':
    sync()
