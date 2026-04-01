let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration,
    );
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio errors
  }
}

export function playCountdownBeep() {
  playTone(880, 0.1, "square", 0.15);
}

export function playBetPlaced() {
  playTone(660, 0.12, "sine", 0.2);
  setTimeout(() => playTone(880, 0.1, "sine", 0.15), 100);
}

export function playWinChime() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, "sine", 0.25), i * 100);
  });
}

export function playLoseSound() {
  playTone(220, 0.3, "sawtooth", 0.2);
  setTimeout(() => playTone(180, 0.4, "sawtooth", 0.15), 200);
}
