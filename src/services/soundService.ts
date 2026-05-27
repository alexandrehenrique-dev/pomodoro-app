/**
 * soundService — handles audio playback with proper browser autoplay policy.
 *
 * Browsers block audio until there has been a user gesture. This service:
 *  - Creates the Audio object lazily on the first call.
 *  - Exposes `unlockAudio()` — must be called from a real user interaction.
 *  - Exposes `isAudioUnlocked()` — so callers can show/hide the unlock indicator.
 *  - Exposes `playChime()` — returns true on success; attempts vibrate on failure.
 */

// MP3 file served from the public folder (Vite copies it as-is to dist/).
// BASE_URL keeps the path valid when the app is served under a reverse-proxy
// subpath such as /pomodoro/.
const CHIME_SRC = `${import.meta.env.BASE_URL}chime.mp3`;

let _audio: HTMLAudioElement | null = null;
let _unlocked = false;

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio(CHIME_SRC);
    _audio.preload = "auto";
    _audio.volume = 1;
  }
  return _audio;
}

export function isAudioUnlocked(): boolean {
  return _unlocked;
}

/**
 * Call this on any user interaction (e.g. clicking "Iniciar" or "Testar som").
 * It loads and immediately pauses the audio to satisfy the browser autoplay
 * policy, so subsequent `playChime()` calls work without a user gesture.
 */
export async function unlockAudio(): Promise<void> {
  if (_unlocked) return;
  try {
    const audio = getAudio();
    audio.volume = 0.001;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
    _unlocked = true;
  } catch {
    // Unlock failed — that's okay, we'll try again on the next interaction.
  }
}

/**
 * Play the chime. Returns `true` on success, `false` on failure.
 * On failure, attempts `navigator.vibrate()` as a tactile fallback (mobile).
 * The caller should show a visual alert when `false` is returned.
 */
export async function playChime(): Promise<boolean> {
  try {
    const audio = getAudio();
    audio.currentTime = 0;
    audio.volume = 1;
    await audio.play();
    return true;
  } catch {
    tryVibrate([200, 100, 200]);
    return false;
  }
}

function tryVibrate(pattern: number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

/** Convenience: play the chime and ignore the result (fire-and-forget). */
export function playChimeSilently(): void {
  playChime().catch(() => {});
}
