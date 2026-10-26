#!/usr/bin/env bash
set -euo pipefail

LISIERE_WRAPPER_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LISIERE_PROJECT_ROOT="$(dirname -- "$LISIERE_WRAPPER_ROOT")"
LISIERE_SDK_ROOT="${LISIERE_ANDROID_SDK:-${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/tmp/lisiere-android-sdk}}}"
LISIERE_BUILD_TOOLS="$LISIERE_SDK_ROOT/build-tools/${LISIERE_BUILD_TOOLS_VERSION:-35.0.0}"
LISIERE_PLATFORM_JAR="$LISIERE_SDK_ROOT/platforms/android-35/android.jar"
LISIERE_WEB_HTML="${LISIERE_WEB_HTML:-$LISIERE_PROJECT_ROOT/web/index.html}"
LISIERE_APK="$LISIERE_PROJECT_ROOT/release/Lisiere-Compact-1.3.apk"
LISIERE_KEY_ALIAS="${LISIERE_KEY_ALIAS:-lisiere-compact}"
LISIERE_PYTHON="${LISIERE_PYTHON:-python3}"
LISIERE_JAVA="${JAVA_HOME:+$JAVA_HOME/bin/}java"
LISIERE_JAVAC="${JAVA_HOME:+$JAVA_HOME/bin/}javac"

: "${LISIERE_KEYSTORE:?Set LISIERE_KEYSTORE to an existing signing keystore outside this repository.}"
: "${LISIERE_KEYSTORE_PASSWORD:?Set LISIERE_KEYSTORE_PASSWORD without storing it in this repository.}"
export LISIERE_KEYSTORE_PASSWORD
export LISIERE_KEY_PASSWORD="${LISIERE_KEY_PASSWORD:-$LISIERE_KEYSTORE_PASSWORD}"

require_file() {
    if [[ ! -f "$1" ]]; then printf 'Missing file: %s\n' "$1" >&2; exit 1; fi
}
require_file "$LISIERE_WEB_HTML"
require_file "$LISIERE_PLATFORM_JAR"
require_file "$LISIERE_KEYSTORE"
require_file "$LISIERE_BUILD_TOOLS/lib/apksigner.jar"
require_file "$LISIERE_BUILD_TOOLS/lib/d8.jar"
LISIERE_AAPT2="$LISIERE_BUILD_TOOLS/aapt2"
LISIERE_ZIPALIGN="$LISIERE_BUILD_TOOLS/zipalign"
[[ -f "$LISIERE_AAPT2" ]] || LISIERE_AAPT2+='.exe'
[[ -f "$LISIERE_ZIPALIGN" ]] || LISIERE_ZIPALIGN+='.exe'
require_file "$LISIERE_AAPT2"
require_file "$LISIERE_ZIPALIGN"

# A signing key is local input, never a source file or a generated repository asset.
"$LISIERE_PYTHON" - "$LISIERE_PROJECT_ROOT" "$LISIERE_KEYSTORE" <<'PY'
from pathlib import Path
import sys
root, key = (Path(value).resolve() for value in sys.argv[1:])
if key == root or root in key.parents:
    raise SystemExit('The signing keystore must be stored outside the repository.')
PY

mkdir -p "$LISIERE_WRAPPER_ROOT/build" "$LISIERE_PROJECT_ROOT/release"
LISIERE_BUILD="$(mktemp -d "$LISIERE_WRAPPER_ROOT/build/run.XXXXXX")"
mkdir -p "$LISIERE_BUILD/assets" "$LISIERE_BUILD/classes" "$LISIERE_BUILD/dex" "$LISIERE_BUILD/generated"
cp "$LISIERE_WEB_HTML" "$LISIERE_BUILD/assets/index.html"
"$LISIERE_AAPT2" compile --dir "$LISIERE_WRAPPER_ROOT/res" -o "$LISIERE_BUILD/resources.zip"
"$LISIERE_AAPT2" link -o "$LISIERE_BUILD/resources.apk" -I "$LISIERE_PLATFORM_JAR" \
    --manifest "$LISIERE_WRAPPER_ROOT/AndroidManifest.xml" --java "$LISIERE_BUILD/generated" \
    --version-code 4 --version-name 1.3 --min-sdk-version 24 --target-sdk-version 35 \
    -A "$LISIERE_BUILD/assets" "$LISIERE_BUILD/resources.zip"
"$LISIERE_JAVAC" -encoding UTF-8 -source 8 -target 8 \
    -classpath "$LISIERE_PLATFORM_JAR" -d "$LISIERE_BUILD/classes" \
    "$LISIERE_WRAPPER_ROOT/src/app/lisiere/reader/MainActivity.java" \
    "$LISIERE_BUILD/generated/app/lisiere/reader/compact/R.java"
"$LISIERE_PYTHON" - "$LISIERE_BUILD" <<'PY'
from pathlib import Path
import sys
import zipfile
build = Path(sys.argv[1])
with zipfile.ZipFile(build / 'classes.jar', 'w', compression=zipfile.ZIP_DEFLATED) as output:
    for item in sorted((build / 'classes').rglob('*.class')):
        output.write(item, item.relative_to(build / 'classes').as_posix())
PY
"$LISIERE_JAVA" -cp "$LISIERE_BUILD_TOOLS/lib/d8.jar" com.android.tools.r8.D8 \
    --release --min-api 24 --lib "$LISIERE_PLATFORM_JAR" \
    --output "$LISIERE_BUILD/dex" "$LISIERE_BUILD/classes.jar"
"$LISIERE_PYTHON" - "$LISIERE_BUILD" <<'PY'
from pathlib import Path
import shutil
import sys
import zipfile
build = Path(sys.argv[1])
shutil.copyfile(build / 'resources.apk', build / 'unsigned.apk')
with zipfile.ZipFile(build / 'unsigned.apk', 'a', compression=zipfile.ZIP_DEFLATED) as output:
    for dex in sorted((build / 'dex').glob('*.dex')):
        output.write(dex, dex.name)
PY
"$LISIERE_ZIPALIGN" -f -p 4 "$LISIERE_BUILD/unsigned.apk" "$LISIERE_BUILD/aligned.apk"
"$LISIERE_JAVA" -jar "$LISIERE_BUILD_TOOLS/lib/apksigner.jar" sign \
    --ks "$LISIERE_KEYSTORE" --ks-key-alias "$LISIERE_KEY_ALIAS" \
    --ks-pass env:LISIERE_KEYSTORE_PASSWORD --key-pass env:LISIERE_KEY_PASSWORD \
    --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true \
    --v4-signing-enabled false --out "$LISIERE_APK" "$LISIERE_BUILD/aligned.apk"
"$LISIERE_JAVA" -jar "$LISIERE_BUILD_TOOLS/lib/apksigner.jar" verify --verbose "$LISIERE_APK"
"$LISIERE_ZIPALIGN" -c -p 4 "$LISIERE_APK"
"$LISIERE_AAPT2" dump badging "$LISIERE_APK"
printf 'APK created: %s\n' "$LISIERE_APK"
