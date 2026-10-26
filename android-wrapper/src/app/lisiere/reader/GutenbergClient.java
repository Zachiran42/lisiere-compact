/* SPDX-License-Identifier: MIT */
package app.lisiere.reader;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;

/** Bounded, cookie-free GET transport for the official OPDS catalogue and EPUBs. */
public final class GutenbergClient {
    public static final class Result {
        public final byte[] bytes;
        public final String mime;
        Result(byte[] bytes, String mime) { this.bytes = bytes; this.mime = mime; }
    }
    public static URI validate(String value) throws IOException {
        try {
            URI uri = new URI(value);
            String host = uri.getHost(), path = uri.getRawPath();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getUserInfo() != null
                || (uri.getPort() != -1 && uri.getPort() != 443) || uri.getFragment() != null
                || !("www.gutenberg.org".equalsIgnoreCase(host) || "gutenberg.org".equalsIgnoreCase(host))
                || path == null || !(path.matches("/ebooks/search\\.opds/?")
                    || path.matches("/ebooks/[0-9]+\\.opds")
                    || path.matches("/ebooks/[0-9]+\\.epub3?\\.(images|noimages)")
                    || path.matches("/cache/epub/[0-9]+/[A-Za-z0-9._-]+\\.epub"))
                || (!path.contains("search.opds") && uri.getRawQuery() != null)) {
                throw new IOException("Lien Gutenberg non autorisé.");
            }
            if (value.length() > 4096) throw new IOException("Lien trop long.");
            return uri;
        } catch (URISyntaxException error) { throw new IOException("Lien Gutenberg invalide.", error); }
    }
    public static Result fetch(String value) throws IOException {
        URI uri = validate(value);
        long deadline = System.nanoTime() + 45_000_000_000L;
        for (int redirect = 0; redirect <= 5; redirect++) {
            if (System.nanoTime() > deadline) throw new IOException("Délai de téléchargement dépassé.");
            HttpURLConnection connection = (HttpURLConnection) new URL(uri.toString()).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(10000); connection.setReadTimeout(15000);
            connection.setRequestProperty("User-Agent", "Lisiere-Compact/1.4.0 (OPDS reader; https://github.com/Zachiran42/lisiere-compact)");
            connection.setRequestProperty("Accept", "application/atom+xml, application/epub+zip");
            connection.setRequestProperty("Accept-Encoding", "identity");
            try {
                int code = connection.getResponseCode();
                if (code >= 300 && code < 400) {
                    String location = connection.getHeaderField("Location");
                    if (location == null) throw new IOException("Redirection Gutenberg invalide.");
                    uri = validate(uri.resolve(location).toString()); continue;
                }
                if (code != 200) throw new IOException(code == 429 ? "Trop de demandes. Réessayez dans un instant." : "Gutenberg indisponible (" + code + ").");
                boolean epub = uri.getPath().endsWith(".epub") || uri.getPath().matches(".*\\.epub3?\\.(images|noimages)");
                int limit = (epub ? 40 : 2) * 1024 * 1024;
                long length = connection.getContentLengthLong();
                if (length > limit) throw new IOException("Téléchargement trop volumineux.");
                ByteArrayOutputStream output = new ByteArrayOutputStream(length > 0 ? (int) length : 8192);
                try (InputStream stream = connection.getInputStream()) {
                    byte[] buffer = new byte[16384]; int count;
                    while ((count = stream.read(buffer)) != -1) {
                        if (System.nanoTime() > deadline) throw new IOException("Délai de téléchargement dépassé.");
                        if (output.size() + count > limit) throw new IOException("Téléchargement trop volumineux.");
                        output.write(buffer, 0, count);
                    }
                }
                return new Result(output.toByteArray(), epub ? "application/epub+zip" : "application/atom+xml");
            } finally { connection.disconnect(); }
        }
        throw new IOException("Trop de redirections Gutenberg.");
    }
    private GutenbergClient() {}
}
