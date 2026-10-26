import { useCallback } from 'react';
import { soundEngine } from '../utils/defaults.ts';

export function useAudioFeedback(soundEnabled: boolean = true) {
  const playSuccess = useCallback(() => {
    if (!soundEnabled) return;
    try {
      soundEngine.playSuccess?.();
    } catch {}
  }, [soundEnabled]);

  const playClick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      soundEngine.playClick?.();
    } catch {}
  }, [soundEnabled]);

  const playReward = useCallback(() => {
    if (!soundEnabled) return;
    try {
      soundEngine.playFanfare();
    } catch {}
  }, [soundEnabled]);

  const speakCoachPrompt = useCallback(
    (text: string) => {
      if (!soundEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pl-PL';
        utterance.rate = 1.02;
        window.speechSynthesis.speak(utterance);
      } catch {}
    },
    [soundEnabled]
  );

  return {
    playSuccess,
    playClick,
    playReward,
    speakCoachPrompt,
    soundEngine,
  };
}
