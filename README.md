# Hayden Brave App

This static app now has two separate modes:

- `reader.html` for the EPUB reader
- `listen.html` for the audiobook player

The root `index.html` is a simple mode selector that links to both.

## File placement

- Place the EPUB at the project root as `Hayden_Brave.epub`
- Place audiobook files in `/audio`
- Place cover and logo assets in `/assets`
- Use `assets/hayden-brave-cover.jpg` for the reader cover
- Use `assets/hayden-brave-audio-cover.jpg` for the audiobook cover
- Use `assets/HAC_studios_logo_2026.png` for branding

## Audiobook manifest

The audiobook page is driven by `manifest.json` at the project root. Use this shape:

```json
[
  { "id": 1, "title": "Chapter 1", "file": "chapter-01.mp3" },
  { "id": 2, "title": "Chapter 2", "file": "chapter-02.mp3" }
]
```

Each `file` is resolved relative to `/audio`.

## Local run

Serve the folder over local HTTP instead of opening pages directly by `file://` when possible:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

Some browsers restrict EPUB and media asset loading when opened directly from `file://`, so local HTTP serving is the most reliable way to test both modes.

## Resume behavior

The audiobook page uses `localStorage` only for audio convenience:

- `audioPos:<filename>` stores the saved playback position for each chapter file
- `haydenBraveLastAudioFile` stores the last selected audiobook chapter

When the user returns to `listen.html`, the app reopens the last selected chapter and restores its saved position when possible.
