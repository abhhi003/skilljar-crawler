package com.example.skilljar;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Frame;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.WaitUntilState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Exports the text of a Skilljar course you are enrolled in to Markdown files.
 *
 * Auth is never automated: "login" mode opens a visible browser and you sign in
 * yourself; only the resulting session cookies are reused by "links"/"crawl".
 * Videos are not downloaded - only lesson text on the page.
 */
public class Main {

    private static final Logger log = LoggerFactory.getLogger(Main.class);

    public static void main(String[] args) throws Exception {
        Config cfg;
        try {
            cfg = Config.parse(args);
        } catch (IllegalArgumentException e) {
            System.err.println(e.getMessage());
            System.exit(2);
            return;
        }

        try (Playwright pw = Playwright.create()) {
            // login must be headed so the user can complete SSO/MFA by hand
            boolean headless = cfg.headless() && !cfg.mode().equals("login");
            BrowserType.LaunchOptions launch = new BrowserType.LaunchOptions().setHeadless(headless);
            if (!cfg.channel().equals("chromium")) {
                launch.setChannel(cfg.channel());
            }
            Browser browser = pw.chromium().launch(launch);

            switch (cfg.mode()) {
                case "login" -> login(browser, cfg);
                case "links" -> withSession(browser, cfg, page -> printLinks(page, cfg));
                case "frames" -> withSession(browser, cfg, page -> printFrames(page, cfg));
                case "probe" -> withSession(browser, cfg, page -> probe(page, cfg));
                case "crawl" -> withSession(browser, cfg, page -> crawl(page, cfg));
                default -> {
                    System.err.println("Unknown mode: " + cfg.mode() + "\n" + Config.usage());
                    System.exit(2);
                }
            }
        }
    }

    private static void login(Browser browser, Config cfg) throws IOException {
        BrowserContext ctx = browser.newContext();
        Page page = ctx.newPage();
        page.setDefaultTimeout(cfg.timeoutMs());
        // DOMCONTENTLOADED, not "load": SCORM/video/analytics requests can keep the load event pending for minutes
        try {
            page.navigate(cfg.courseUrl(), new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
        } catch (RuntimeException e) {
            // Previously this aborted the run and closed the browser before the user could sign in;
            // the user can still paste the URL into the open window themselves.
            log.warn("Auto-navigation failed ({}). Paste the course URL into the browser window manually.",
                    e.getMessage().lines().findFirst().orElse(""));
        }
        log.info("Sign in in the browser window, open the course page, then press Enter here.");
        System.in.read();
        ctx.storageState(new BrowserContext.StorageStateOptions().setPath(cfg.stateFile()));
        log.info("Session saved to {}", cfg.stateFile().toAbsolutePath());
    }

    private static void withSession(Browser browser, Config cfg, PageAction action) throws Exception {
        if (!Files.exists(cfg.stateFile())) {
            throw new IllegalStateException("No session file " + cfg.stateFile() + " - run 'login' first");
        }
        BrowserContext ctx = browser.newContext(
                new Browser.NewContextOptions().setStorageStatePath(cfg.stateFile()));
        Page page = ctx.newPage();
        page.setDefaultTimeout(cfg.timeoutMs());
        page.navigate(cfg.courseUrl(), new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
        action.run(page);
    }

    /** Diagnostic: dump every link so the lesson-link selector can be tuned against the real DOM. */
    private static void printLinks(Page page, Config cfg) {
        log.info("Page title: {}", page.title());
        for (Locator a : page.locator("a").all()) {
            String href = a.getAttribute("href");
            if (href != null) {
                System.out.println(a.innerText().trim().replaceAll("\\s+", " ") + " | " + href);
            }
        }
        log.info("Matches for link selector '{}': {}", cfg.linkSelector(), page.locator(cfg.linkSelector()).count());
    }

    /**
     * Diagnostic for SCORM lessons: the course content lives in nested iframes, so list every frame
     * with its URL, text size and a text preview to find where the real lesson content is.
     */
    private static void printFrames(Page page, Config cfg) throws Exception {
        Thread.sleep(20000); // SCORM players boot via JS after DOMContentLoaded
        for (Frame f : page.frames()) {
            String text;
            try {
                text = f.locator("body").innerText();
            } catch (Exception e) {
                text = "<unreadable: " + e.getMessage().lines().findFirst().orElse("") + ">";
            }
            System.out.println("FRAME url=" + f.url() + " textLen=" + text.length());
            String flat = text.replaceAll("\\s+", " ");
            System.out.println("  preview: " + flat.substring(0, Math.min(flat.length(), 400)));
            if (flat.isBlank() && !f.url().equals("about:blank")) {
                // empty text usually means a JS player that has not rendered or content in a nested frame
                String html = f.content().replaceAll("\\s+", " ");
                // the head is mostly analytics boilerplate, so show the tail where the body/app root is
                System.out.println("  html(" + html.length() + ") tail: " + html.substring(Math.max(0, html.length() - 2500)));
            }
        }
    }

    /**
     * Diagnostic for a SCORM content file (pass its URL as --url): shows whether the other screens
     * already exist in the DOM (hidden) or are rendered on demand, and which buttons advance them.
     */
    private static void probe(Page page, Config cfg) {
        Object info = page.evaluate("""
                () => {
                  const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
                  const clone = document.body.cloneNode(true);
                  clone.querySelectorAll('script,style').forEach(n => n.remove());
                  const hidden = [...document.body.querySelectorAll('*')].filter(e => !vis(e) && e.textContent.trim().length > 200 && e.children.length < 30);
                  const screens = [...document.querySelectorAll('section.screen')].map(s =>
                    s.id + ' ' + JSON.stringify(Object.assign({}, s.dataset)) + ' | ' +
                    (s.querySelector('h1,h2,h3')?.textContent.trim() || '?') + ' | len=' + s.textContent.trim().length);
                  return {
                    screens: screens,
                    textContentLen: clone.textContent.replace(/\\s+/g, ' ').length,
                    innerTextLen: document.body.innerText.length,
                    hiddenBlocks: hidden.slice(0, 12).map(e => e.tagName + '#' + e.id + '.' + e.className + ' len=' + e.textContent.trim().length),
                    buttons: [...document.querySelectorAll('button,a,[role=button]')].filter(vis).map(b => b.tagName + '#' + b.id + '.' + b.className + ' :: ' + b.innerText.trim().slice(0, 30)).slice(0, 25)
                  };
                }""");
        System.out.println(info);
    }

    /**
     * Skilljar learning path -> courses -> one SCORM package per course. The course page only holds a
     * wrapper iframe; the real text is in a separate HTML file named by "frameSrc" inside that wrapper,
     * so we read frameSrc and load the content file directly (it renders without the SCORM API).
     */
    private static void crawl(Page page, Config cfg) throws Exception {
        URI base = URI.create(page.url());
        String basePath = URI.create(cfg.courseUrl()).getPath().replaceAll("/$", "");

        // course links are exactly one segment below the path page; LinkedHashMap keeps order and de-dupes
        Map<String, String> courses = new LinkedHashMap<>();
        for (Locator a : page.locator("a[href]").all()) {
            String abs = base.resolve(a.getAttribute("href")).toString();
            // mailto:/javascript: links are opaque URIs with a null path
            String p = abs.startsWith("http") ? URI.create(abs).getPath() : null;
            if (p != null && p.startsWith(basePath + "/") && p.substring(basePath.length() + 1).matches("[^/]+")) {
                courses.putIfAbsent(abs, p.substring(basePath.length() + 1));
            }
        }
        log.info("Found {} courses under {}", courses.size(), basePath);
        if (courses.isEmpty()) {
            log.warn("No course links found. Point --url at the learning-path page and run 'links' to check.");
            return;
        }

        Files.createDirectories(cfg.outDir());
        int n = 1;
        for (Map.Entry<String, String> e : courses.entrySet()) {
            String url = e.getKey();
            String slug = e.getValue();
            try {
                page.navigate(url, new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
                String shell = readScormContent(page, base, cfg);
                if (shell != null) {
                    writeCourse(page, cfg.outDir().resolve(String.format("%02d-%s", n, slug)), slug, url, shell);
                } else {
                    log.warn("[{}/{}] {} has no SCORM frame, saving the page text instead", n, courses.size(), slug);
                    String text = page.locator("body").innerText();
                    Path file = cfg.outDir().resolve(String.format("%02d-%s.md", n, slug));
                    Files.writeString(file, "# " + slug + "\n\nSource: " + url + "\n\n" + text + "\n");
                }
                log.info("[{}/{}] done {}", n, courses.size(), slug);
            } catch (Exception ex) {
                // one bad course (timeout, unexpected layout) should not abort the whole export
                log.error("[{}/{}] failed {}: {}", n, courses.size(), url, ex.getMessage());
            }
            n++;
            Thread.sleep(cfg.delayMs()); // be polite to the server
        }
    }

    /**
     * The module player keeps every screen in the DOM as a hidden section.screen, so innerText misses them
     * but the DOM has them all; convert each to Markdown and group them by the section sizes from the
     * splash table of contents ("Prompting Craft / 3 screens").
     */
    @SuppressWarnings("unchecked")
    private static void writeCourse(Page page, Path dir, String slug, String url, String shell) throws IOException {
        List<Map<String, Object>> screens = (List<Map<String, Object>>) page.evaluate(SCREENS_TO_MARKDOWN_JS);

        // TOC lines look like: "Prompting Craft" newline "3 screens"
        List<Map.Entry<String, Integer>> toc = new ArrayList<>();
        String tocText = shell.contains("TABLE OF CONTENTS") ? shell.substring(shell.indexOf("TABLE OF CONTENTS")) : "";
        Matcher m = Pattern.compile("(?m)^(.+)\\R(\\d+) screens?\\s*$").matcher(tocText);
        while (m.find()) {
            toc.add(Map.entry(m.group(1).trim(), Integer.parseInt(m.group(2))));
        }
        int tocTotal = toc.stream().mapToInt(Map.Entry::getValue).sum();

        Files.createDirectories(dir);
        StringBuilder index = new StringBuilder("# " + slug + "\n\nSource: " + url + "\n\n");
        if (tocTotal != screens.size()) {
            // grouping is a convenience; never drop content because the TOC could not be matched
            log.warn("{}: TOC says {} screens but DOM has {}; writing one file per screen", slug, tocTotal, screens.size());
            toc.clear();
            for (Map<String, Object> s : screens) {
                toc.add(Map.entry(String.valueOf(s.get("title")), 1));
            }
        }
        int i = 0;
        int sectionNo = 1;
        for (Map.Entry<String, Integer> sec : toc) {
            StringBuilder body = new StringBuilder("# " + sec.getKey() + "\n\n");
            for (int k = 0; k < sec.getValue(); k++, i++) {
                Map<String, Object> s = screens.get(i);
                body.append("## ").append(s.get("title")).append("\n\n").append(s.get("md")).append("\n\n");
            }
            String name = String.format("%02d-%s.md", sectionNo++, slug(sec.getKey()));
            Files.writeString(dir.resolve(name), body.toString().replaceAll("\n{3,}", "\n\n").trim() + "\n");
            index.append("- ").append(name).append(" (").append(sec.getValue()).append(" screens)\n");
            log.info("  wrote {}/{}", dir.getFileName(), name);
        }
        Files.writeString(dir.resolve("index.md"), index.toString());
    }

    // Walks each hidden screen's DOM and emits Markdown (headings, lists, code fences, tables, bold/inline code).
    private static final String SCREENS_TO_MARKDOWN_JS = """
            () => {
              const SKIP = new Set(['SCRIPT','STYLE','BUTTON','SVG','NOSCRIPT']);
              const walk = (n) => {
                if (n.nodeType === 3) return n.textContent.replace(/\\s+/g, ' ');
                if (n.nodeType !== 1 || SKIP.has(n.tagName.toUpperCase())) return '';
                const tag = n.tagName.toLowerCase();
                const kids = () => [...n.childNodes].map(walk).join('');
                if (/^h[1-6]$/.test(tag)) return '\\n\\n' + '#'.repeat(Math.min(6, +tag[1] + 2)) + ' ' + kids().trim() + '\\n\\n';
                if (tag === 'pre') return '\\n\\n```\\n' + n.textContent.replace(/\\s+$/, '') + '\\n```\\n\\n';
                if (tag === 'code') return '`' + n.textContent + '`';
                if (tag === 'strong' || tag === 'b') return '**' + kids().trim() + '**';
                if (tag === 'li') return '\\n- ' + kids().trim();
                if (tag === 'br') return '\\n';
                if (tag === 'tr') return '\\n| ' + [...n.children].map(c => walk(c).trim()).join(' | ') + ' |';
                if (tag === 'table') return '\\n' + kids() + '\\n';
                if (['p','div','section','ul','ol','blockquote','figure'].includes(tag)) return '\\n\\n' + kids().trim() + '\\n\\n';
                return kids();
              };
              return [...document.querySelectorAll('section.screen')].map(s => ({
                id: s.id,
                title: (s.querySelector('h1,h2,h3')?.textContent || s.id).trim().replace(/\\s+/g, ' '),
                md: walk(s).replace(/\\n{3,}/g, '\\n\\n').trim()
              }));
            }""";

    /** Returns the text of the SCORM content file for the current course page, or null if there is none. */
    private static String readScormContent(Page page, URI base, Config cfg) throws Exception {
        Pattern frameSrc = Pattern.compile("frameSrc:\\s*\"([^\"]+)\"");
        long deadline = System.currentTimeMillis() + (long) cfg.timeoutMs();
        // the wrapper frame is injected by JS after DOMContentLoaded, so poll for it
        while (System.currentTimeMillis() < deadline) {
            for (Frame f : page.frames()) {
                if (f.url().contains("/view/wp/scorm/")) {
                    Matcher m = frameSrc.matcher(f.content());
                    if (m.find()) {
                        String contentUrl = base.resolve(m.group(1)).toString();
                        log.info("SCORM content file: {}", contentUrl);
                        page.navigate(contentUrl, new Page.NavigateOptions().setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
                        return page.locator("body").innerText();
                    }
                }
            }
            // waitForTimeout, not Thread.sleep: Playwright only delivers new-frame events while a driver call is active
            page.waitForTimeout(500);
        }
        return null;
    }

    private static String slug(String s) {
        String slug = s.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        return slug.isEmpty() ? "lesson" : slug.substring(0, Math.min(slug.length(), 60));
    }

    @FunctionalInterface
    private interface PageAction {
        void run(Page page) throws Exception;
    }
}
