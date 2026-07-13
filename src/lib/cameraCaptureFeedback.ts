/** Short camera shutter — Web Audio synthesis (user-gesture turn), WAV file fallback. */

const SHUTTER_WAV_URL = "/sounds/camera-shutter.wav";

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new Ctor();
  }
  return sharedAudioContext;
}

function playShutterWithWebAudio(): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    void ctx.resume();
    const durationSec = 0.07;
    const sampleCount = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i += 1) {
      const t = i / ctx.sampleRate;
      const envelope = Math.exp(-t * 95);
      channel[i] = (Math.random() * 2 - 1) * envelope * 0.55;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.42;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return true;
  } catch {
    return false;
  }
}

function playShutterWavFallback(): void {
  try {
    const audio = new Audio(SHUTTER_WAV_URL);
    audio.volume = 0.55;
    void audio.play().catch(() => {
      /* ignore — silent if autoplay blocked */
    });
  } catch {
    /* ignore */
  }
}

/** Call synchronously from a user click (e.g. Capture) for best mobile playback. */
export function playCameraShutterSound(): void {
  if (typeof window === "undefined") return;
  const ok = playShutterWithWebAudio();
  if (!ok) {
    playShutterWavFallback();
    return;
  }
  // If Web Audio context is suspended, also try WAV (common on iOS before resume).
  const ctx = sharedAudioContext;
  if (ctx && ctx.state !== "running") {
    playShutterWavFallback();
  }
}
