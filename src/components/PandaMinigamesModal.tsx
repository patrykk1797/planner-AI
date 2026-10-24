import React from 'react';
import { RunnerProfile } from '../types.ts';
import { PandaMinigames } from './PandaMinigames.tsx';

interface PandaMinigamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: RunnerProfile;
  onEarnBamboos: (amount: number, reason: string) => void;
  showToast: (msg: string) => void;
}

export const PandaMinigamesModal: React.FC<PandaMinigamesModalProps> = ({
  isOpen,
  onClose,
  onEarnBamboos,
  showToast,
}) => {
  if (!isOpen) return null;

  return (
    <PandaMinigames
      onClose={onClose}
      onReward={(bamboos, _xp, reason) => {
        onEarnBamboos(bamboos, reason);
      }}
      showToast={showToast}
    />
  );
};
