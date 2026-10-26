#!/usr/bin/env python3
"""Fetch two official Android SDK packages. Run with authorized network access."""
import hashlib
import os
from pathlib import Path
import shutil
import sys
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

BASE = 'https://dl.google.com/android/repository/'
ROOT = Path(os.environ.get('LISIERE_ANDROID_SDK', '/tmp/lisiere-android-sdk'))
PACKAGES = {'build-tools;35.0.0': ROOT / 'build-tools' / '35.0.0', 'platforms;android-35': ROOT / 'platforms' / 'android-35'}

def fetch(url, target):
    with urllib.request.urlopen(url, timeout=60) as response, open(target, 'wb') as output:
        shutil.copyfileobj(response, output)

ROOT.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='lisiere-sdk-', dir='/tmp') as temporary:
    temporary = Path(temporary)
    manifest = temporary / 'repository.xml'
    fetch(BASE + 'repository2-1.xml', manifest)
    tree = ET.parse(manifest)
    for package, destination in PACKAGES.items():
        required = 'aapt2' if package.startswith('build-tools') else 'android.jar'
        if (destination / required).exists():
            print(f'Already available: {package}', flush=True)
            continue
        record = next((node for node in tree.iter() if node.tag.split('}')[-1] == 'remotePackage' and node.get('path') == package), None)
        if record is None:
            raise SystemExit(f'Official package unavailable: {package}')
        archives = record.find('archives')
        archive = next((item for item in archives.findall('archive') if item.findtext('host-os') in (None, 'linux')), None)
        if archive is None:
            raise SystemExit(f'No Linux archive: {package}')
        complete = archive.find('complete')
        relative = complete.findtext('url')
        checksum = complete.find('checksum')
        expected_size = int(complete.findtext('size'))
        archive_file = temporary / (package.replace(';', '-') + '.zip')
        print(f'Downloading {package}: {relative} ({expected_size / 1024 / 1024:.1f} MiB)', flush=True)
        fetch(BASE + relative, archive_file)
        if archive_file.stat().st_size != expected_size:
            raise SystemExit(f'Incomplete archive: {package}')
        algorithm = checksum.get('type', 'sha1')
        digest = hashlib.file_digest(open(archive_file, 'rb'), algorithm).hexdigest()
        if digest.lower() != checksum.text.strip().lower():
            raise SystemExit(f'Archive checksum mismatch: {package}')
        unpacked = temporary / package.replace(';', '-')
        unpacked.mkdir()
        with zipfile.ZipFile(archive_file) as archive_zip:
            for item in archive_zip.infolist():
                target = (unpacked / item.filename).resolve()
                if not target.is_relative_to(unpacked.resolve()):
                    raise SystemExit('Unsafe SDK archive member')
                archive_zip.extract(item, unpacked)
                mode = item.external_attr >> 16
                if mode:
                    target.chmod(mode & 0o777)
        candidates = list(unpacked.rglob(required))
        if len(candidates) != 1:
            raise SystemExit(f'Unexpected SDK layout: {package}')
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(candidates[0].parent), destination)
        if package.startswith('build-tools'):
            for executable in ('aapt2', 'd8', 'zipalign', 'apksigner'):
                tool = destination / executable
                tool.chmod(tool.stat().st_mode | 0o111)
        print(f'Installed {package}', flush=True)
print(f'Android SDK ready: {ROOT}', flush=True)
