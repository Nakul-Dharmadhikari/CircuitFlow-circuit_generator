// Web Audio API Sound Synthesizer for tactile lab instruments
class SoundEngine {
  private ctx: AudioContext | null = null;
  private buzzerOsc: OscillatorNode | null = null;
  private buzzerGain: GainNode | null = null;
  private enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.buzzerOsc) {
      this.stopBuzzer();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Realistic mechanical toggle switch "click-clack"
  public playSwitchClick(state: boolean) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(state ? 900 : 750, t);
    osc.frequency.exponentialRampToValueAtTime(state ? 200 : 150, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Push button tactile tap
  public playButtonTap() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.03);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  // Subtle clock tick
  public playClockTick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.015);

    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.015);
  }

  // Electronic Alarm / Lab Buzzer
  public startBuzzer(freq: number = 880) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || this.buzzerOsc) return;

    const t = this.ctx.currentTime;
    this.buzzerOsc = this.ctx.createOscillator();
    this.buzzerGain = this.ctx.createGain();

    this.buzzerOsc.type = 'sawtooth';
    this.buzzerOsc.frequency.setValueAtTime(freq, t);

    this.buzzerGain.gain.setValueAtTime(0.12, t);

    this.buzzerOsc.connect(this.buzzerGain);
    this.buzzerGain.connect(this.ctx.destination);

    this.buzzerOsc.start(t);
  }

  public stopBuzzer() {
    if (this.buzzerOsc) {
      try {
        this.buzzerOsc.stop();
        this.buzzerOsc.disconnect();
      } catch {
        // ignore already stopped
      }
      this.buzzerOsc = null;
      this.buzzerGain = null;
    }
  }

  // Harmonic success chime
  public playSuccessChime() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const t = now + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}

export const soundFx = new SoundEngine();
