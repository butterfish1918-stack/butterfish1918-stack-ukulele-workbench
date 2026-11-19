# Connected Song Repository — Ukulele Workbench v1.6.0 Preview

## What is working

Songbook has two **separate** collections:

- **Repository Library** displays downloadable, read-only arrangements with fully notated scores and optional tabs. It includes two original beginner studies in the app's offline starter library. **Sync Library** downloads a published `library/catalog.json`, then checks every referenced song JSON before updating a *single* locally cached snapshot. A failed or malformed download preserves the previous cached catalog.
- **My Songbook** stores personal copies, annotations, edited scores, practice material and your own compositions. **Copy to My Songbook** creates a new independent song ID and deep-copies the score; later catalog revisions **never overwrite these personal copies**. JSON backup includes copied songs, including provenance. Cached repository material can simply be re-synced, so it is not included in the backup.

Both collections are stored locally using the browser's current `localStorage` prototype. Large repositories can eventually require IndexedDB. The complete catalog is deliberately limited to **50 songs and 2.5 million JSON characters** per sync to reduce quota risk. This is a personal-workflow design, not an authenticated multiuser system.

## How to use

1. Launch the app (standalone HTML or served app). Open **Songbook → Repository Library**. You can immediately preview and copy two bundled *original* practice arrangements.
2. For live sync, host the app from a normal HTTPS or `http://127.0.0.1` origin (not a downloaded `file://` demo).
3. Keep the default catalog address `./library/catalog.json` if your songs are served alongside the app, or enter a valid HTTPS catalog address for a compatible separate static source. Click **Sync Library**.
4. Preview an arrangement in standard notation; optionally change the notation/tab preference elsewhere in the app; click **Copy to My Songbook**. Edit the copied version as you like.
5. Export a JSON backup from My Songbook regularly. Changing your website origin does not migrate browser-local data automatically.

## A repo ChatGPT can add songs to

A suitable dedicated repository contains:

```text
ukulele-workbench/
  index.html
  ... app source / assets
  library/
    catalog.json
    songs/
      first-melody-study.json
      primary-chord-changes.json
      requested-song-id.json
```

The root catalog has this structure:

```json
{
  "format": "ukulele-workbench-catalog",
  "schemaVersion": 1,
  "name": "My Ukulele Library",
  "entries": [
    {
      "id": "requested-song-id",
      "revision": 1,
      "title": "Song title",
      "artist": "Composer / arranger",
      "difficulty": "beginner",
      "tags": ["notation", "fingerpicking"],
      "file": "songs/requested-song-id.json"
    }
  ]
}
```

Each arrangement JSON must have `format: "ukulele-workbench-arrangement"`, `schemaVersion:1`, `id`, `revision`, `title`, `artist`, `difficulty`, `tags`, `key`, `bpm`, `tuning`, `description`, `body`, `notes`, and a **valid Ukulele Workbench `score` object**. `score.tuning`, `score.key`, and `score.tempo` must match the arrangement metadata. Only one rhythmic voice and supported chords/durations are currently permitted. See `library/songs/*.json` for complete tested examples. Use original/public-domain/appropriately authorized material; do not silently inject protected lyrics or copyrighted scores.

**Future ChatGPT workflow:** When asked to add an arrangement, obtain the user's requested tune, tuning, difficulty and musical details; prepare the canonical score and playable fingerings; run `npm run qa:library` and relevant music tests; create or update the individual song file in the *dedicated repository*, and update the catalog entry **last** so a live catalog never points to a missing song. On the next Sync, the new song appears for copying into My Songbook. Future revisions should increase `revision` while retaining `id`. Do not rewrite existing user copies or force their import.

The GitHub connector available during development did **not** expose a create-repository action, and the connected account currently has no dedicated Ukulele Workbench repository. **Nothing has been published to GitHub yet**. Once the dedicated repository is created and the GitHub app has write access, its file write actions can add or revise song JSON and update the catalog without rebuilding the application.

## Important privacy and static hosting limitations

- Public GitHub Pages/static hosting allows convenient HTTPS catalog fetching; it does not enforce private access. A *private* GitHub repository's raw files generally cannot be fetched anonymously from the browser. **Never put a GitHub personal access token or password into the client app, the catalog URL or the repository JSON.** For genuinely private syncing, use an authenticated hosting solution/proxy or perform a manual local export/import workflow.
- A remote catalog is treated as **data only**, never JavaScript or HTML. HTTPS URLs, strict relative song paths, schema validation, file-size limits and per-song score validation are enforced. Remote descriptions/lyrics are displayed as escaped text.
- Cross-origin HTTP requests require server permission (CORS). If using a separate static host, verify that browser fetches from the app origin are allowed. Same-origin static files are simplest and most reliable.
- The bundled standalone HTML preview has seed songs, but its default `file://` origin cannot make real HTTPS-relative catalog requests. Use `npm start` or real hosting to test Sync Library end-to-end.

## Before accepting future songs

Run `npm run qa:library`, `npm test`, and `npm run qa:http` after updating the library, then use the Songbook UI to sync and import. Confirm **existing annotations are unchanged** after a catalog revision or failed download.
