# skilljar-crawler

Exports the text of a Skilljar course you are enrolled in to Markdown, for personal offline notes.
Videos are not downloaded. Check the Skilljar/Anthropic terms before using this, and do not redistribute the output.

Requires JDK 21. Maven is provided by the included wrapper (`mvnw.cmd` on Windows, `./mvnw` elsewhere), which downloads Maven 3.9.9 on first use.

## Usage

Run from this directory in PowerShell (the whole `-Dexec.args=...` argument must be quoted, otherwise PowerShell splits it at the dot). Replace `<course-url>` with the course page URL on anthropic-partners.skilljar.com.

1. Log in once. A browser opens; sign in yourself, open the course page, press Enter in the terminal.

   ```
   .\mvnw.cmd -q compile exec:java "-Dexec.args=login --url <course-url>"
   ```

2. Inspect the links so the selector can be tuned (the defaults are guesses).

   ```
   .\mvnw.cmd -q exec:java "-Dexec.args=links --url <course-url>"
   ```

3. Crawl all lessons into `out/`.

   ```
   .\mvnw.cmd -q exec:java "-Dexec.args=crawl --url <course-url> --link-selector 'a.lesson-link' --content-selector '#lesson-main'"
   ```

First run downloads Playwright's browsers (a few hundred MB).

## Options

| Option | Default |
|---|---|
| `--out` | `out` |
| `--state` | `skilljar-state.json` (session cookies, keep private, do not commit) |
| `--link-selector` | `a[href*='/page/'], a[href*='/lesson/']` |
| `--content-selector` | `main, #lesson-main, .lesson-content` |
| `--delay-ms` | `1500` |
| `--headless` | `false` |


