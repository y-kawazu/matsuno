"""Snapshot the folder-scoped, public-only Drive download feed atomically."""
from datetime import datetime, timezone
import json
import re
from sync_blog import ROOT, read_feed


def validate(payload):
    if not isinstance(payload, dict) or payload.get('error') or not isinstance(payload.get('files'), list):
        raise ValueError('Download feed returned an error; preserving published data')
    files = []
    seen = set()
    for item in payload['files']:
        if not isinstance(item, dict):
            raise ValueError('Invalid download file')
        file_id = item.get('id', '')
        name = item.get('name', '')
        if not isinstance(file_id, str) or not re.fullmatch(r'[A-Za-z0-9_-]+', file_id) or file_id in seen:
            raise ValueError('Missing, invalid or duplicate download ID')
        if not isinstance(name, str) or not name.strip():
            raise ValueError('Missing download name')
        if item.get('mimeType') == 'application/vnd.google-apps.folder':
            raise ValueError('Unexpected nested folder')
        seen.add(file_id)
        files.append({key: item.get(key, '') for key in ('id', 'name', 'mimeType', 'size', 'updatedAt', 'resourceKey')})
    return files


def sync():
    page = (ROOT / 'download.html').read_text(encoding='utf-8')
    endpoint = re.search(r'data-apps-script-url="(https://script\.google\.com/macros/s/[^"/]+/exec)"', page)
    if not endpoint:
        raise ValueError('No download endpoint configured')
    files = validate(read_feed(endpoint.group(1)))
    target = ROOT / 'assets/data/downloads.json'
    if target.exists() and json.loads(target.read_text(encoding='utf-8')).get('files') == files:
        print(f'No changes: {len(files)} public download files')
        return
    result = {'updatedAt': datetime.now(timezone.utc).isoformat(), 'files': files}
    target.parent.mkdir(parents=True, exist_ok=True)
    staging = target.with_suffix('.tmp')
    staging.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    staging.replace(target)
    print(f'Updated {len(files)} public download files')


if __name__ == '__main__':
    sync()
