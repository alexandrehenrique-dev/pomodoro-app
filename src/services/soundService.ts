/**
 * soundService — handles audio playback with proper browser autoplay policy.
 *
 * Browsers block audio until there has been a user gesture. This service:
 *  - Creates the Audio object lazily on the first user interaction.
 *  - Exposes `unlock()` to be called on any user click (e.g. "Testar som").
 *  - Exposes `play()` for cycle-end notifications.
 *  - Returns a boolean indicating success so the caller can show a visual fallback.
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
  }
  return _audio;
}

/**
 * Call this on any user interaction (e.g. clicking "Testar som" or "Iniciar").
 * It loads and immediately pauses the audio to satisfy the browser autoplay
 * policy, so subsequent `play()` calls work without user gesture.
 */
export async function unlockAudio(): Promise<void> {
  if (_unlocked) return;
  try {
    const audio = getAudio();
    audio.volume = 0.01;
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
 * The caller should show a visual alert when `false`.
 */
export async function playChime(): Promise<boolean> {
  try {
    const audio = getAudio();
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

/**
 * Convenience: play the chime and ignore the result (fire-and-forget).
 */
export function playChimeSilently(): void {
  playChime().catch(() => {});
}
