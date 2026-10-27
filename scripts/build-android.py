#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Build the bundled Android wrapper using a JDK, Android SDK and external key."""
from pathlib import Path
import os
import shutil
import subprocess
import tempfile
import zipfile

root = Path(__file__).resolve().parent.parent
sdk = Path(os.environ['LISIERE_ANDROID_SDK'])
# Standard SDK paths; overrides support an unpacked official SDK as well.
tools = Path(os.environ.get('LISIERE_BUILD_TOOLS', sdk / 'build-tools' / '35.0.0'))
platform = Path(os.environ.get('LISIERE_PLATFORM_JAR', sdk / 'platforms' / 'android-35' / 'android.jar'))
java_bin = Path(os.environ['JAVA_HOME']) / 'bin'
key = Path(os.environ['LISIERE_KEYSTORE']).resolve()
if key == root or root in key.parents:
    raise SystemExit('Keep the signing key outside the repository.')
if 'LISIERE_KEYSTORE_PASSWORD' not in os.environ:
    raise SystemExit('Set LISIERE_KEYSTORE_PASSWORD in the environment.')
os.environ.setdefault('LISIERE_KEY_PASSWORD', os.environ['LISIERE_KEYSTORE_PASSWORD'])
def executable(directory, name):
    file = directory / (name + ('.exe' if os.name == 'nt' else ''))
    if not file.is_file(): raise SystemExit('Missing tool: ' + str(file))
    return str(file)
java, javac = (executable(java_bin, name) for name in ('java', 'javac'))
aapt, align = (executable(tools, name) for name in ('aapt2', 'zipalign'))
def run(*args): subprocess.run([str(arg) for arg in args], check=True)
wrapper = root / 'android-wrapper'
(wrapper / 'build').mkdir(exist_ok=True)
build = Path(tempfile.mkdtemp(prefix='run-', dir=wrapper / 'build'))
for name in ('assets', 'classes', 'dex', 'generated'): (build / name).mkdir()
for source, name in ((root / 'web/index.html', 'index.html'), (root / 'LICENSE', 'LICENSE'), (root / 'THIRD_PARTY_LICENSES.txt', 'THIRD_PARTY_LICENSES.txt')):
    shutil.copyfile(source, build / 'assets' / name)
run(aapt, 'compile', '--dir', wrapper / 'res', '-o', build / 'resources.zip')
run(aapt, 'link', '-o', build / 'resources.apk', '-I', platform, '--manifest', wrapper / 'AndroidManifest.xml', '--java', build / 'generated', '--version-code', '7', '--version-name', '1.5.0', '--min-sdk-version', '24', '--target-sdk-version', '35', '-A', build / 'assets', build / 'resources.zip')
run(javac, '-encoding', 'UTF-8', '-source', '8', '-target', '8', '-classpath', platform, '-d', build / 'classes', *sorted((wrapper / 'src').rglob('*.java')), *sorted((build / 'generated').rglob('*.java')))
with zipfile.ZipFile(build / 'classes.jar', 'w', zipfile.ZIP_DEFLATED) as output:
    for file in sorted((build / 'classes').rglob('*.class')): output.write(file, file.relative_to(build / 'classes').as_posix())
run(java, '-cp', tools / 'lib/d8.jar', 'com.android.tools.r8.D8', '--release', '--min-api', '24', '--lib', platform, '--output', build / 'dex', build / 'classes.jar')
shutil.copyfile(build / 'resources.apk', build / 'unsigned.apk')
with zipfile.ZipFile(build / 'unsigned.apk', 'a', zipfile.ZIP_DEFLATED) as output:
    for file in sorted((build / 'dex').glob('*.dex')): output.write(file, file.name)
run(align, '-f', '-p', '4', build / 'unsigned.apk', build / 'aligned.apk')
(root / 'release').mkdir(exist_ok=True)
apk = root / 'release/Lisiere-Compact-1.5.0.apk'
run(java, '-jar', tools / 'lib/apksigner.jar', 'sign', '--ks', key, '--ks-key-alias', os.environ.get('LISIERE_KEY_ALIAS', 'lisiere-compact'), '--ks-pass', 'env:LISIERE_KEYSTORE_PASSWORD', '--key-pass', 'env:LISIERE_KEY_PASSWORD', '--v1-signing-enabled', 'false', '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true', '--v4-signing-enabled', 'false', '--out', apk, build / 'aligned.apk')
run(java, '-jar', tools / 'lib/apksigner.jar', 'verify', '--verbose', '--print-certs', apk)
run(align, '-c', '-p', '4', apk)
run(aapt, 'dump', 'badging', apk)
print('APK:', apk)
