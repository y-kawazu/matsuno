# MATSUNO renewal workspace

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
