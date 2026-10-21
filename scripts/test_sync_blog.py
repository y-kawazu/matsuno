"""Exercise actual network failure paths without making external requests."""
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

import sync_blog

class SyncBlogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'blog.html').write_text(
            '<section data-blog-endpoint="https://script.google.com/macros/s/test/exec">',
            encoding='utf-8')
        self.target = self.root / 'assets' / 'data' / 'blog.json'
        self.target.parent.mkdir(parents=True)
        self.original = b'{"posts":[{"id":"retained-article"}]}\n'
        self.target.write_bytes(self.original)
        self.root_patch = patch.object(sync_blog, 'ROOT', self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.sleep_patch = patch.object(sync_blog.time, 'sleep')
        self.sleep = self.sleep_patch.start()
        self.addCleanup(self.sleep_patch.stop)
        self.output = redirect_stdout(io.StringIO())
        self.output.__enter__()
        self.addCleanup(self.output.__exit__, None, None, None)

    def response(self, posts):
        return io.BytesIO(json.dumps({'posts': posts}).encode())

    def test_timeouts_recover_and_publish(self):
        article = {'id': 'new-article', 'status': '公開', 'date': '2026-10-22',
                   'title': 'Recovered', 'content': '<p>Complete body</p>', 'excerpt': 'Body'}
        with patch.object(sync_blog, 'urlopen', side_effect=[
                TimeoutError('slow'), TimeoutError('slow'), self.response([article])]) as fetch:
            sync_blog.sync()
        self.assertEqual([c.kwargs['timeout'] for c in fetch.call_args_list], [45, 60, 90])
        self.assertEqual([c.args[0] for c in self.sleep.call_args_list], [5, 15])
        self.assertEqual(json.loads(self.target.read_text())['posts'][0]['content'], article['content'])

    def test_exhausted_timeouts_keep_exact_previous_file(self):
        with patch.object(sync_blog, 'urlopen', side_effect=TimeoutError('slow')) as fetch:
            with self.assertRaises(TimeoutError):
                sync_blog.sync()
        self.assertEqual(fetch.call_count, 5)
        self.assertEqual([c.args[0] for c in self.sleep.call_args_list], [5, 15, 30, 60])
        self.assertEqual(self.target.read_bytes(), self.original)
        self.assertFalse(self.target.with_suffix('.tmp').exists())

    def test_http_unavailable_retries(self):
        failure = HTTPError('https://example.invalid', 503, 'Unavailable', {}, None)
        with patch.object(sync_blog, 'urlopen', side_effect=[failure, self.response([])]) as fetch:
            sync_blog.sync()
        self.assertEqual(fetch.call_count, 2)
        self.assertEqual(json.loads(self.target.read_text())['posts'], [])

    def test_permission_error_does_not_retry_or_erase(self):
        failure = HTTPError('https://example.invalid', 403, 'Forbidden', {}, None)
        with patch.object(sync_blog, 'urlopen', side_effect=failure) as fetch:
            with self.assertRaises(HTTPError):
                sync_blog.sync()
        self.assertEqual(fetch.call_count, 1)
        self.sleep.assert_not_called()
        self.assertEqual(self.target.read_bytes(), self.original)

    def test_invalid_payload_is_not_published(self):
        with patch.object(sync_blog, 'urlopen', return_value=io.BytesIO(b'{"error":"missing sheet"}')):
            with self.assertRaises(ValueError):
                sync_blog.sync()
        self.assertEqual(self.target.read_bytes(), self.original)

    def test_incomplete_json_can_recover(self):
        with patch.object(sync_blog, 'urlopen', side_effect=[io.BytesIO(b'{"posts":'), self.response([])]) as fetch:
            sync_blog.sync()
        self.assertEqual(fetch.call_count, 2)

if __name__ == '__main__':
    unittest.main()
