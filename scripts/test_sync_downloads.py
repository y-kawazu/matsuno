import unittest
from sync_downloads import validate


class DownloadValidationTests(unittest.TestCase):
    def test_empty_folder_is_valid(self):
        self.assertEqual(validate({'files': []}), [])

    def test_file_is_preserved(self):
        files = validate({'files': [{'id': 'sample_123', 'name': '会社案内.pdf', 'size': 100, 'resourceKey': 'key'}]})
        self.assertEqual(files[0]['name'], '会社案内.pdf')
        self.assertEqual(files[0]['resourceKey'], 'key')

    def test_error_is_not_an_empty_folder(self):
        for value in ({'error': 'access denied'}, {}, {'files': None}):
            with self.assertRaises(ValueError):
                validate(value)

    def test_invalid_or_duplicate_ids(self):
        for files in ([{'id': '../bad', 'name': 'bad'}], [{'id': 'a', 'name': 'a'}, {'id': 'a', 'name': 'b'}]):
            with self.assertRaises(ValueError):
                validate({'files': files})


if __name__ == '__main__':
    unittest.main()
