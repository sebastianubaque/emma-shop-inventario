import { useCallback } from 'react';

type BeepType = 'success' | 'error' | 'info';

/**
 * Hook to play beep sounds using Web Audio API
 */
export function useBeep() {
  const playBeep = useCallback((type: BeepType = 'success') => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const configs: Record<BeepType, { freq: number; duration: number; type: OscillatorType }> = {
        success: { freq: 880, duration: 0.1, type: 'sine' },
        error: { freq: 220, duration: 0.3, type: 'square' },
        info: { freq: 660, duration: 0.08, type: 'sine' },
      };

      const config = configs[type];
      oscillator.frequency.setValueAtTime(config.freq, ctx.currentTime);
      oscillator.type = config.type;

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);

      // Vibration feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(type === 'error' ? [100, 50, 100] : 50);
      }
    } catch {
      // Silent fail if audio not supported
    }
  }, []);

  return { playBeep };
}
