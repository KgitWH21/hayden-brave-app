# Hayden Brave eReader

Place the book file at the project root as `Hayden_Brave.epub`.

The app is a static EPUB reader built from `index.html`, `style.css`, and `app.js`, with local assets in `assets/`.

To run locally, serve the folder over a small HTTP server instead of opening `index.html` directly when possible. For example:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080`.

Some browsers restrict EPUB asset loading when the app is opened with `file://`, so local HTTP serving is the most reliable way to test reading, TOC loading, and progress updates.
