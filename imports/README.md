# Upload a prepared photo ZIP here

The photo pack for the V5 gallery can be uploaded **as one ZIP**:

1. Open this `imports/` directory in GitHub.
2. Click **Add file → Upload files**.
3. Upload the prepared `Gallary_精选照片_21张_待发布.zip` file without extracting it.
4. Commit to `main`.

The automated workflow will unpack only files under `assets/photos/`, apply their curated
metadata from `data/curated-v5.json`, regenerate `data/photos.json` + `data/photos.js`,
and remove the ZIP in its follow-up commit. Do **not** upload personally sensitive photos or
original files with private EXIF GPS. The curated ZIP contains re-encoded EXIF-stripped photos.

If GitHub Actions shows a permissions error, configure **Settings → Actions → General →
Workflow permissions → Read and write permissions** or use a collaborator with write access.
