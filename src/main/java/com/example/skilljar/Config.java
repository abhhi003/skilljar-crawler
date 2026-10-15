package com.example.skilljar;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

/**
 * CLI options. Selectors are overridable because Skilljar themes differ per
 * tenant and we have not verified the real DOM; the "links" mode helps tune them.
 */
public record Config(
        String mode,            // login | links | crawl
        String courseUrl,
        Path outDir,
        Path stateFile,
        String linkSelector,
        String contentSelector,
        long delayMs,
        boolean headless,
        double timeoutMs,
        String channel) {

    // Guess only: Skilljar curriculum links usually point at /page/ or /lesson/ paths.
    static final String DEFAULT_LINK_SELECTOR = "a[href*='/page/'], a[href*='/lesson/']";
    static final String DEFAULT_CONTENT_SELECTOR = "main, #lesson-main, .lesson-content";

    public static Config parse(String[] args) {
        if (args.length == 0) {
            throw new IllegalArgumentException(usage());
        }
        Map<String, String> o = new HashMap<>();
        for (int i = 1; i < args.length; i += 2) {
            if (i + 1 >= args.length) {
                throw new IllegalArgumentException("Missing value for " + args[i] + "\n" + usage());
            }
            o.put(args[i].replaceFirst("^--", ""), args[i + 1]);
        }
        String url = o.get("url");
        if (url == null) {
            throw new IllegalArgumentException("--url is required\n" + usage());
        }
        return new Config(
                args[0],
                url,
                Path.of(o.getOrDefault("out", "out")),
                Path.of(o.getOrDefault("state", "skilljar-state.json")),
                o.getOrDefault("link-selector", DEFAULT_LINK_SELECTOR),
                o.getOrDefault("content-selector", DEFAULT_CONTENT_SELECTOR),
                Long.parseLong(o.getOrDefault("delay-ms", "1500")),
                Boolean.parseBoolean(o.getOrDefault("headless", "false")),
                Double.parseDouble(o.getOrDefault("timeout-ms", "120000")),
                // Installed Edge/Chrome refuse to start under Playwright here ("DevTools remote debugging is
                // disallowed by the system admin"); the bundled Chromium launches fine, so it is the default.
                o.getOrDefault("channel", "chromium"));
    }

    static String usage() {
        return """
                Usage: <login|links|crawl> --url <course-url> [options]
                  --out <dir>               output dir (default: out)
                  --state <file>            saved session (default: skilljar-state.json)
                  --link-selector <css>     lesson links on the course page
                  --content-selector <css>  main content container on a lesson page
                  --delay-ms <n>            pause between lessons (default: 1500)
                  --headless <true|false>   crawl headless (default: false)
                  --timeout-ms <n>          per-navigation timeout (default: 120000)
                  --channel <name>          msedge | chrome | chromium (bundled) (default: chromium)""";
    }
}
