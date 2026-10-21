"""Publish only public articles from the configured Google Apps Script feed."""
from datetime import datetime, timezone
from http.client import IncompleteRead, RemoteDisconnected
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
REQUEST_TIMEOUTS = (45, 60, 90, 120, 120)
RETRY_DELAYS = (5, 15, 30, 60)
RETRYABLE_HTTP_CODES = {408, 429, 500, 502, 503, 504}

def read_feed(url):
    """Retry temporary network/server failures, but expose permanent errors."""
    for attempt, timeout in enumerate(REQUEST_TIMEOUTS):
        try:
            request = Request(url, headers={'User-Agent': 'MatsunoBlogPublisher/1.0'})
            with urlopen(request, timeout=timeout) as response:
                return json.load(response)
        except (HTTPError, URLError, TimeoutError, ConnectionError,
                IncompleteRead, RemoteDisconnected, json.JSONDecodeError) as error:
            if isinstance(error, HTTPError) and error.code not in RETRYABLE_HTTP_CODES:
                raise
            if attempt == len(REQUEST_TIMEOUTS) - 1:
                print('Article feed is still unavailable after 5 attempts; '
                      'no published data has been changed.', flush=True)
                raise
            delay = RETRY_DELAYS[attempt]
            print(f'Temporary article feed failure ({type(error).__name__}); '
                  f'retrying {attempt + 2}/{len(REQUEST_TIMEOUTS)} in {delay}s '
                  f'with a {REQUEST_TIMEOUTS[attempt + 1]}s timeout.', flush=True)
            time.sleep(delay)

def sync():
    page = (ROOT / 'blog.html').read_text(encoding='utf-8')
    endpoint = re.search(r'data-blog-endpoint="(https://script\.google\.com/macros/s/[^"/]+/exec)"', page)
    if not endpoint:
        raise ValueError('No public blog endpoint configured')
    payload = read_feed(endpoint.group(1) + '?type=blog')
    if not isinstance(payload, dict) or payload.get('error') or not isinstance(payload.get('posts'), list):
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
