import { browser } from '$app/environment';

export class SoundManager {
	private audioContext: AudioContext | null = null;
	private enabled = true;

	constructor() {
		if (browser && 'AudioContext' in window) {
			// Create AudioContext on first user interaction
			this.initAudioContext();
		}
	}

	private initAudioContext() {
		if (!browser) return;

		try {
			this.audioContext = new AudioContext();
		} catch (error) {
			console.warn('AudioContext not supported:', error);
		}
	}

	// Play a notification "ding" sound using Web Audio API
	async playNotificationSound() {
		if (!this.enabled || !browser || !this.audioContext) {
			return;
		}

		try {
			// Resume audio context if suspended (required by some browsers)
			if (this.audioContext.state === 'suspended') {
				await this.audioContext.resume();
			}

			// Create a pleasant notification sound (two-tone ding)
			const now = this.audioContext.currentTime;

			// First tone (higher pitch)
			const oscillator1 = this.audioContext.createOscillator();
			const gainNode1 = this.audioContext.createGain();

			oscillator1.connect(gainNode1);
			gainNode1.connect(this.audioContext.destination);

			oscillator1.frequency.setValueAtTime(800, now); // High C
			oscillator1.type = 'sine';

			gainNode1.gain.setValueAtTime(0, now);
			gainNode1.gain.linearRampToValueAtTime(0.3, now + 0.01);
			gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

			oscillator1.start(now);
			oscillator1.stop(now + 0.3);

			// Second tone (lower pitch) - slightly delayed
			setTimeout(() => {
				const oscillator2 = this.audioContext!.createOscillator();
				const gainNode2 = this.audioContext!.createGain();

				oscillator2.connect(gainNode2);
				gainNode2.connect(this.audioContext!.destination);

				const now2 = this.audioContext!.currentTime;
				oscillator2.frequency.setValueAtTime(600, now2); // G
				oscillator2.type = 'sine';

				gainNode2.gain.setValueAtTime(0, now2);
				gainNode2.gain.linearRampToValueAtTime(0.25, now2 + 0.01);
				gainNode2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.4);

				oscillator2.start(now2);
				oscillator2.stop(now2 + 0.4);
			}, 150);
		} catch (error) {
			console.warn('Failed to play notification sound:', error);
		}
	}

	setEnabled(enabled: boolean) {
		this.enabled = enabled;
	}

	isEnabled(): boolean {
		return this.enabled;
	}
}

// Create singleton instance
export const soundManager = new SoundManager();
