# MATSUNO renewal workspace

## Blog publishing

The public blog is managed in the KawazuNext Google Sheet and read through
the endpoint in `blog.html` and `blog-post.html`. Only published articles are
exported to `assets/data/blog.json` by `scripts/sync_blog.py`.

Pages render that same-origin data first and attempt a live anonymous refresh.
The `Sync public blog from Google Drive` workflow runs every 15 minutes (subject
to GitHub scheduling delays) or can be started manually. It updates `gh-pages`
and requests a Pages build when article data changes. Source publishing also
refreshes article data before deploying. Google Sheet edits remain the source
of truth; no private spreadsheet credentials are stored in this repository.

Temporary timeouts and server errors are retried up to five times with
increasing request timeouts (45 to 120 seconds) and delays (5 to 60 seconds).
If all attempts fail, publishing stops without overwriting existing articles.
Permission/configuration errors still fail visibly rather than being hidden.

This folder is prepared for rebuilding the public site at:

https://matsuno.tv/

## Current status

The source site could not be reached from this workspace on 2026-06-12.

- DNS resolved: `matsuno.tv` -> `163.43.197.176`
- HTTP port 80: connection failed
- HTTPS port 443: connection failed
- `https://www.matsuno.tv/`: connection failed

Because the source site was unreachable, the original text and images have not
yet been copied into this folder. The local structure is ready for a faithful
snapshot once the site becomes reachable or the source assets are provided.

## Folder layout

- `site/` - local static pages for checking in a browser.
- `assets/original/` - untouched downloaded files from the current site.
- `assets/images/` - images prepared for the renewed site.
- `assets/css/` - stylesheets for the local site.
- `assets/js/` - scripts for the local site.
- `tools/` - helper scripts for collecting source-site material.
- `notes/` - investigation notes and source checks.

## Next step

Run `tools/mirror-matsuno.ps1` after `https://matsuno.tv/` becomes reachable,
or place exported source files/images into `assets/original/`.
