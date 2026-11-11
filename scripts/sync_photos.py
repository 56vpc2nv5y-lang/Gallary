#!/usr/bin/env python3
"""Index newly uploaded photographs in the one public data/photos.json manifest.

This script NEVER copies EXIF GPS into the public manifest. Existing editorial
metadata and confirmed landmarks are preserved verbatim.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "photos.json"
FOLDER = ROOT / "assets" / "photos"
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
THUMB_SUFFIX = "-thumb"


def properties(path: Path):
    """Read dimensions and month (when available), without publishing camera GPS."""
    shape, date = "landscape", None
    try:
        from PIL import Image
        with Image.open(path) as im:
            width, height = im.size
            ratio = width / max(height, 1)
            shape = "wide" if ratio > 1.5 else "portrait" if ratio < 0.82 else "square" if 0.9 <= ratio <= 1.1 else "landscape"
            exif = im.getexif()
            raw_date = exif.get(36867) or exif.get(306)
            if isinstance(raw_date, str) and re.match(r"^\d{4}:\d{2}", raw_date):
                date = raw_date[:7].replace(":", "-")
    except Exception as exc:
        print(f"Info: cannot inspect {path.name}: {exc}")
    return shape, date


def sync() -> int:
    doc = json.loads(MANIFEST.read_text(encoding="utf-8"))
    photos = doc["photos"]
    staged_file = ROOT / "data" / "curated-v5.json"
    staged = {}
    if staged_file.exists():
        staged_doc = json.loads(staged_file.read_text(encoding="utf-8"))
        staged = {p["src"]: p for p in staged_doc.get("photos", [])}
    known = {p.get("file") or p.get("src") for p in photos}
    ids = {p["id"] for p in photos}
    added = 0

    for path in sorted(FOLDER.iterdir()):
        if not path.is_file() or path.suffix.lower() not in EXTENSIONS or path.stem.endswith(THUMB_SUFFIX):
            continue
        rel = path.relative_to(ROOT).as_posix()
        if rel in known:
            continue
        slug = re.sub(r"[^\w-]+", "-", path.stem.lower(), flags=re.UNICODE).strip("-") or "photo"
        candidate = slug
        counter = 2
        while candidate in ids:
            candidate = f"{slug}-{counter}"
            counter += 1
        ids.add(candidate)
        shape, date = properties(path)
        possible_thumbs = [path.with_name(path.stem + THUMB_SUFFIX + suffix) for suffix in (".webp", ".jpg", ".jpeg", ".png")]
        thumb = next((p.relative_to(ROOT).as_posix() for p in possible_thumbs if p.exists()), rel)
        title = re.sub(r"^\d+[-_]", "", path.stem).replace("_", " ").replace("-", " ").strip() or path.stem
        record = {
            "id": candidate, "src": rel, "thumb": thumb, "file": rel,
            "title": title, "en": "", "series": "landscapes", "chapter": "landscapes",
            "season": "unknown", "date": date, "country": None, "city": None,
            "place": None, "lat": None, "lng": None, "style": "neutral",
            "geoPrecision": None, "location": "", "note": "",
            "alt": title, "shape": shape,
            "motion": "focus", "motionLabel": "轻轻靠近，留住这一刻"
        }
        if rel in staged:
            editorial = staged[rel].copy()
            # The file scanner owns the actual filename and dimensions.
            # Only verified public landmarks, never camera EXIF GPS, are used.
            editorial.update({"src": rel, "file": rel, "thumb": thumb, "shape": shape})
            record.update(editorial)
            record["id"] = candidate
        photos.append(record)
        known.add(rel)
        added += 1
        print(f"Indexed: {rel} (date={date or 'unconfirmed'}, no GPS published)")
    if added:
        MANIFEST.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # Static JavaScript mirror loads even when file:// disallows fetch(JSON).
    # photos.json remains the only file humans should edit.
    bundle = "/* Generated from data/photos.json; do not edit directly. */\n" + "window.PHOTO_JOURNAL = " + json.dumps(doc, ensure_ascii=False, indent=2) + ";\n"
    (ROOT / "data" / "photos.js").write_text(bundle, encoding="utf-8")
    print(f"Catalog: {len(photos)} photos; {added} new")
    return added


if __name__ == "__main__":
    sync()
