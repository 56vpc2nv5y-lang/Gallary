#!/usr/bin/env python3
"""Unpack trusted curator photo ZIPs uploaded by the repository owner.

Only files under assets/photos/ ending in .webp, .jpg, .jpeg, .png,
or .avif are extracted. Other ZIP members (e.g. README) are ignored.
"""
from __future__ import annotations

import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
IMPORTS = ROOT / "imports"
PHOTOS = ROOT / "assets" / "photos"
SUFFIXES = {".webp", ".jpg", ".jpeg", ".png", ".avif"}
MAX_TOTAL_BYTES = 80 * 1024 * 1024
MAX_PER_FILE_BYTES = 10 * 1024 * 1024


def extract_one(archive: Path):
    count = 0
    total = 0
    with zipfile.ZipFile(archive) as src:
        for member in src.infolist():
            if member.is_dir():
                continue
            name = PurePosixPath(member.filename)
            # No traversal, no symlinks, and no unusual folder targets.
            if ".." in name.parts or name.is_absolute():
                raise ValueError("Unsafe filename inside ZIP")
            if len(name.parts) != 3 or name.parts[:2] != ("assets", "photos"):
                continue
            if name.suffix.lower() not in SUFFIXES:
                continue
            if member.file_size > MAX_PER_FILE_BYTES:
                raise ValueError("Photo exceeds permitted per-file limit")
            total += member.file_size
            if total > MAX_TOTAL_BYTES:
                raise ValueError("Photo ZIP exceeds permitted total size")
            if (member.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError("Symlink is not permitted")
            dst = PHOTOS / name.name
            if dst.exists():
                raise ValueError(f"Photo already exists: {name.name}")
            with src.open(member) as f, dst.open("wb") as target:
                while True:
                    chunk = f.read(1024 * 1024)
                    if not chunk:
                        break
                    target.write(chunk)
            count += 1
    print(f"Extracted {count} photo assets from {archive.name}")


if __name__ == "__main__":
    for zip_path in sorted(IMPORTS.glob("*.zip")):
        extract_one(zip_path)
