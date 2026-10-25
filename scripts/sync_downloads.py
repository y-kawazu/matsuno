"""Legacy validator retained for old data; public download sync is disabled."""
import re


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
    # Password-protected downloads must never create a public metadata snapshot.
    print('Download snapshots disabled: authentication is required')


if __name__ == '__main__':
    sync()
