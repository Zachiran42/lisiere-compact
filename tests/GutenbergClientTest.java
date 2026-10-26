// SPDX-License-Identifier: MIT
package app.lisiere.reader;
public final class GutenbergClientTest {
    public static void main(String[] args) throws Exception {
        String[] invalid = {
            "http://www.gutenberg.org/ebooks/1.opds", "https://evil.test/ebooks/1.opds",
            "https://www.gutenberg.org.evil.test/ebooks/1.opds", "https://u:p@www.gutenberg.org/ebooks/1.opds",
            "https://www.gutenberg.org:444/ebooks/1.opds", "https://www.gutenberg.org/%65books/1.opds",
            "https://www.gutenberg.org/ebooks/1.epub.images?secret=1", "https://www.gutenberg.org/ebooks/1.opds#x",
            "https://www.gutenberg.org/cache/epub/1/../x.epub"
        };
        for (String url : invalid) {
            try { GutenbergClient.validate(url); throw new AssertionError("Accepted: " + url); }
            catch (java.io.IOException expected) {}
        }
        GutenbergClient.validate("https://www.gutenberg.org/ebooks/search.opds/?query=l.fr");
        GutenbergClient.validate("https://www.gutenberg.org/ebooks/17989.epub3.images");
        GutenbergClient.validate("https://www.gutenberg.org/cache/epub/17989/pg17989-images-3.epub");
        System.out.println("PASS: native transport URL restrictions");
        if (args.length > 0 && args[0].equals("--live")) {
            GutenbergClient.Result feed = GutenbergClient.fetch("https://www.gutenberg.org/ebooks/4650.opds");
            String xml = new String(feed.bytes, java.nio.charset.StandardCharsets.UTF_8);
            if (!xml.contains("Candide") || !feed.mime.equals("application/atom+xml")) throw new AssertionError("Invalid live feed");
            GutenbergClient.Result epub = GutenbergClient.fetch("https://www.gutenberg.org/ebooks/4650.epub3.images");
            if (epub.bytes[0] != 'P' || epub.bytes[1] != 'K' || !epub.mime.equals("application/epub+zip")) throw new AssertionError("Invalid live EPUB");
            System.out.println("PASS: native HTTPS OPDS + redirected EPUB (" + epub.bytes.length + " bytes)");
        }
    }
}
