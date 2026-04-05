const MANIFEST_PATH = "manifest.json";
const AUDIO_DIR = "audio/";
const LAST_AUDIO_KEY = "haydenBraveLastAudioFile";

const state = {
    chapters: [],
    currentIndex: -1,
    pendingResumeTime: null,
};

const elements = {
    audio: document.getElementById("chapter-audio"),
    chapterList: document.getElementById("audio-chapter-list"),
    currentChapterTitle: document.getElementById("current-chapter-title"),
    status: document.getElementById("audio-status"),
    chapterCount: document.getElementById("chapter-count"),
    prevButton: document.getElementById("prev-track-btn"),
    nextButton: document.getElementById("next-track-btn"),
};

function setStatus(message, isError = false) {
    if (!elements.status) {
        return;
    }

    elements.status.textContent = message;
    elements.status.classList.toggle("error", isError);
}

function getPositionKey(fileName) {
    return `audioPos:${fileName}`;
}

function loadSavedPosition(fileName) {
    const savedValue = window.localStorage.getItem(getPositionKey(fileName));
    const parsedValue = Number(savedValue);
    return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : 0;
}

function saveCurrentPosition() {
    const chapter = state.chapters[state.currentIndex];
    if (!chapter || !elements.audio) {
        return;
    }

    try {
        window.localStorage.setItem(
            getPositionKey(chapter.file),
            String(Math.floor(elements.audio.currentTime))
        );
    } catch (error) {
        console.warn("Could not persist audio position:", error);
    }
}

function persistLastSelectedChapter(fileName) {
    try {
        window.localStorage.setItem(LAST_AUDIO_KEY, fileName);
    } catch (error) {
        console.warn("Could not persist last selected audio file:", error);
    }
}

function formatChapterCount(count) {
    return `${count} ${count === 1 ? "track" : "tracks"}`;
}

function renderChapterList() {
    if (!elements.chapterList) {
        return;
    }

    elements.chapterList.innerHTML = "";

    state.chapters.forEach((chapter, index) => {
        const listItem = document.createElement("li");
        const button = document.createElement("button");
        const metaWrap = document.createElement("span");
        const indexLabel = document.createElement("span");
        const titleLabel = document.createElement("span");
        const stateLabel = document.createElement("span");

        button.type = "button";
        button.className = "chapter-button";
        if (index === state.currentIndex) {
            button.classList.add("active");
        }

        metaWrap.className = "chapter-meta";
        indexLabel.className = "chapter-index";
        titleLabel.className = "chapter-title";
        stateLabel.className = "chapter-state";

        indexLabel.textContent = `Chapter ${String(index + 1).padStart(2, "0")}`;
        titleLabel.textContent = chapter.title;
        stateLabel.textContent = index === state.currentIndex ? "Selected" : "Load";

        metaWrap.appendChild(indexLabel);
        metaWrap.appendChild(titleLabel);
        button.appendChild(metaWrap);
        button.appendChild(stateLabel);

        button.addEventListener("click", () => {
            selectChapter(index);
        });

        listItem.appendChild(button);
        elements.chapterList.appendChild(listItem);
    });

    if (elements.chapterCount) {
        elements.chapterCount.textContent = formatChapterCount(state.chapters.length);
    }

    updateNavigationState();
}

function updateNavigationState() {
    const hasChapters = state.chapters.length > 0;
    const isFirst = state.currentIndex <= 0;
    const isLast = state.currentIndex >= state.chapters.length - 1;

    if (elements.prevButton) {
        elements.prevButton.disabled = !hasChapters || isFirst;
    }

    if (elements.nextButton) {
        elements.nextButton.disabled = !hasChapters || isLast;
    }
}

async function checkAudioAvailability(fileName) {
    try {
        const response = await fetch(`${AUDIO_DIR}${fileName}`, { method: "HEAD" });
        return response.ok;
    } catch (error) {
        console.warn("Audio availability check failed:", error);
        return null;
    }
}

async function selectChapter(index) {
    if (index < 0 || index >= state.chapters.length || !elements.audio) {
        return;
    }

    const chapter = state.chapters[index];
    const nextSource = `${AUDIO_DIR}${chapter.file}`;
    const sameChapterSelected =
        state.currentIndex === index && elements.audio.dataset.file === chapter.file;

    state.currentIndex = index;
    persistLastSelectedChapter(chapter.file);

    if (elements.currentChapterTitle) {
        elements.currentChapterTitle.textContent = chapter.title;
    }

    renderChapterList();

    if (sameChapterSelected) {
        setStatus(`Ready to continue ${chapter.title}.`);
        return;
    }

    state.pendingResumeTime = loadSavedPosition(chapter.file);
    setStatus(`Loading ${chapter.title}...`);

    const availability = await checkAudioAvailability(chapter.file);
    if (availability === false) {
        elements.audio.removeAttribute("src");
        elements.audio.load();
        elements.audio.dataset.file = "";
        setStatus(`Missing audio file: ${chapter.file}`, true);
        return;
    }

    elements.audio.src = nextSource;
    elements.audio.dataset.file = chapter.file;
    elements.audio.load();
}

function restorePendingPosition() {
    if (!elements.audio || state.pendingResumeTime === null) {
        return;
    }

    const resumeTime = state.pendingResumeTime;
    state.pendingResumeTime = null;

    if (resumeTime > 0 && Number.isFinite(elements.audio.duration)) {
        try {
            elements.audio.currentTime = Math.min(resumeTime, Math.max(0, elements.audio.duration - 1));
            setStatus(`Resumed at ${Math.floor(elements.audio.currentTime)} seconds.`);
            return;
        } catch (error) {
            console.warn("Could not restore audio position:", error);
        }
    }

    const chapter = state.chapters[state.currentIndex];
    if (chapter) {
        setStatus(`Loaded ${chapter.title}.`);
    }
}

function moveChapter(direction) {
    const nextIndex = state.currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= state.chapters.length) {
        return;
    }

    selectChapter(nextIndex);
}

function handleAudioError() {
    const chapter = state.chapters[state.currentIndex];
    const fileName = chapter?.file || "unknown file";
    setStatus(`Unable to play ${fileName}. Verify the file exists in /audio.`, true);
}

async function loadManifest() {
    try {
        const response = await fetch(MANIFEST_PATH);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const parsed = await response.json();
        if (!Array.isArray(parsed)) {
            throw new Error("Manifest must be an array.");
        }

        state.chapters = parsed.filter((item) => item && item.title && item.file);
        renderChapterList();

        if (state.chapters.length === 0) {
            setStatus("No audiobook chapters were found in manifest.json.", true);
            if (elements.currentChapterTitle) {
                elements.currentChapterTitle.textContent = "No chapters available";
            }
            return;
        }

        const lastFile = window.localStorage.getItem(LAST_AUDIO_KEY);
        const initialIndex = Math.max(
            0,
            state.chapters.findIndex((chapter) => chapter.file === lastFile)
        );

        await selectChapter(initialIndex);
    } catch (error) {
        console.error("Could not load manifest.json:", error);
        setStatus("Could not load manifest.json. Check the file structure and serve over HTTP.", true);
        if (elements.currentChapterTitle) {
            elements.currentChapterTitle.textContent = "Manifest unavailable";
        }
    }
}

elements.prevButton?.addEventListener("click", () => moveChapter(-1));
elements.nextButton?.addEventListener("click", () => moveChapter(1));

elements.audio?.addEventListener("loadedmetadata", restorePendingPosition);
elements.audio?.addEventListener("timeupdate", saveCurrentPosition);
elements.audio?.addEventListener("pause", saveCurrentPosition);
elements.audio?.addEventListener("error", handleAudioError);
elements.audio?.addEventListener("ended", () => {
    saveCurrentPosition();
    if (state.currentIndex < state.chapters.length - 1) {
        selectChapter(state.currentIndex + 1);
    } else {
        setStatus("Audiobook complete.");
    }
});

loadManifest();
