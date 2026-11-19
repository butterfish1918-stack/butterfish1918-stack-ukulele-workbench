# GitHub Pages — Personal Beta Deployment

This repository is public. The app is static and needs no server, database, build tool or GitHub token in the browser.

## One-time GitHub Pages setting

1. Open https://github.com/butterfish1918-stack/butterfish1918-stack-ukulele-workbench/settings/pages
2. Under **Build and deployment**, select **GitHub Actions** as the publishing **Source**.
3. Open https://github.com/butterfish1918-stack/butterfish1918-stack-ukulele-workbench/actions/workflows/deploy-pages.yml and run **Run workflow** on `main` if the earlier push ran before Pages was enabled or failed.
4. Wait for the **Deploy Ukulele Workbench to GitHub Pages** workflow to succeed, then use **Visit site** from Settings → Pages.

Expected project URL (verify the live deployment before sharing it as working):

https://butterfish1918-stack.github.io/butterfish1918-stack-ukulele-workbench/

Expected same-origin song catalog:

https://butterfish1918-stack.github.io/butterfish1918-stack-ukulele-workbench/library/catalog.json

## What happens automatically

The workflow in `.github/workflows/deploy-pages.yml` runs on every push to `main` (or manually), validates the music model and song files, and publishes only these runtime assets:

- `index.html`, `styles.css`, `manifest.webmanifest`, `sw.js`
- `src/`, `assets/`, `library/` (including `catalog.json` and `songs/*.json`)
- `.nojekyll`

Tests, design mockups, documentation and source-only tools are excluded from the published site. The app uses relative URLs so its subdirectory path works.

## First-use checks

1. Open the hosted app in your normal browser.
2. In **Songbook → Repository Library**, choose **Sync Library** with the default catalog path.
3. Confirm the two original starter arrangements appear.
4. Choose one, select **Copy to My Songbook**, edit a note/annotation, reload, and confirm that your personal changes remain.
5. Export the full app JSON backup and keep it outside the browser.
6. Check Practice Room device readiness. Test microphone tuning and actual offline reload separately; prior automated tests do not establish physical accuracy or installed-PWA behavior.

## Updating the song catalog from ChatGPT

1. Add a fully validated arrangement at `library/songs/<slug>.json`.
2. Run `npm test` and `npm run qa:library`.
3. Commit the arrangement first.
4. Update `library/catalog.json` **last** and commit. The new catalog deployment should then reference an existing, published file.
5. On the hosted app, select **Sync Library**; imported personal copies stay unchanged.

See `SONG_REPOSITORY.md` for the exact arrangement schema and validation constraints.

## Privacy and data safety

GitHub Pages is publicly accessible. Do not publish personal notes, credentials, sensitive data or copyrighted material without appropriate permission. My Songbook, progress and draft scores remain in each browser's local storage; GitHub does not automatically receive them. Browser-origin changes (including repository renaming) do **not** migrate local data. Export a JSON backup before changing the app URL. The optional VexFlow preview may load a library from an external CDN; the original notation view is the offline fallback.

## Known limitations

The deployed URL and catalog cannot be considered live until GitHub's Pages settings and workflow succeed and the website is checked in a normal browser. Hardware tuner accuracy and genuine installed-PWA offline operation still require device testing.
