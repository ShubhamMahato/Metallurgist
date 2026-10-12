# Metallurgist Pro

Metallurgist Pro is a browser-only metal composition calculator. It imports a local `.txt` or `.doc` report, lets you adjust metal percentages while automatically rebalancing the composition to 100%, and can print or download the updated result.

No login, registration, server, API, or database is required. Report data is handled locally in the browser.

## Run locally

```bash
npm install
npm run dev
```

## Build for GitHub Pages

```bash
npm run build
```

Publish the contents of `dist/` with GitHub Pages. The app uses relative asset URLs and hash-based navigation, so it works when deployed under a repository sub-path (for example `https://username.github.io/repository/`).

The included GitHub Actions workflow deploys automatically after a push to `main`. In the repository settings, choose **Settings → Pages → Source: GitHub Actions** once.

The optional connected-file workflow uses the browser File System Access API. If a browser does not support it, regular report upload and download still work.
