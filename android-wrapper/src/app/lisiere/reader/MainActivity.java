package app.lisiere.reader;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

/** Minimal offline host: the entire React application is a bundled HTML asset. */
public final class MainActivity extends Activity {
    private static final String LOCAL_ORIGIN = "https://appassets.androidplatform.net";
    private static final String START_URL = LOCAL_ORIGIN + "/index.html";
    private static final int OPEN_EPUB = 41;
    private WebView webView;
    private ValueCallback<Uri[]> pendingFiles;
    private boolean exitDialogVisible;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(Color.rgb(248, 247, 242));
        setContentView(container);
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= 26) flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
        container.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(248, 247, 242));
        container.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Only the document-picker URI is granted by Android.
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                // Inline book images, srcdoc reading frames and user-granted
                // document-provider streams are local resources, not network.
                if ("data".equals(scheme) || "blob".equals(scheme) || "about".equals(scheme) || "content".equals(scheme)) {
                    return null;
                }
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost())
                        && ("/index.html".equals(uri.getPath()) || "/".equals(uri.getPath()))) {
                    try {
                        return new WebResourceResponse("text/html", "UTF-8", 200, "OK",
                            Collections.singletonMap("Cache-Control", "no-cache"), getAssets().open("index.html"));
                    } catch (IOException error) {
                        return denied();
                    }
                }
                // No external resource is ever fetched; the APK has no INTERNET permission.
                return denied();
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return !START_URL.equals(request.getUrl().toString());
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                // Some providers identify EPUB as application/zip or application/octet-stream.
                // The app validates the .epub extension and actual archive after selection.
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try {
                    startActivityForResult(intent, OPEN_EPUB);
                } catch (ActivityNotFoundException error) {
                    pendingFiles.onReceiveValue(null);
                    pendingFiles = null;
                    Toast.makeText(MainActivity.this, "Aucun sélecteur de fichiers disponible.", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        webView.loadUrl(START_URL);
        container.requestApplyInsets();
    }

    private static WebResourceResponse denied() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != OPEN_EPUB || pendingFiles == null) return;
        Uri uri = resultCode == RESULT_OK && data != null ? data.getData() : null;
        if (uri == null && resultCode == RESULT_OK && data != null
                && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
            uri = data.getClipData().getItemAt(0).getUri();
        }
        ValueCallback<Uri[]> callback = pendingFiles;
        pendingFiles = null;
        callback.onReceiveValue(uri == null ? null : new Uri[]{uri});
    }

    @Override public void onBackPressed() {
        if (webView == null || exitDialogVisible) return;
        webView.evaluateJavascript("window.dispatchEvent(new Event('lisiere-native-back', { cancelable: true }))", result -> {
            if ("false".equals(result) || isFinishing() || exitDialogVisible) return;
            exitDialogVisible = true;
            AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("Fermer Lisière ?")
                .setMessage("Votre bibliothèque et votre progression restent sur cet appareil.")
                .setNegativeButton("Continuer à lire", (box, choice) -> {})
                .setPositiveButton("Fermer", (box, choice) -> finish())
                .create();
            dialog.setOnDismissListener(box -> exitDialogVisible = false);
            dialog.show();
        });
    }

    @Override protected void onPause() {
        super.onPause();
        if (webView != null) webView.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override protected void onDestroy() {
        if (pendingFiles != null) pendingFiles.onReceiveValue(null);
        pendingFiles = null;
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}
