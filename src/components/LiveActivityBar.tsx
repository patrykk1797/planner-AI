import React from 'react';
import { RunLog, RunnerProfile } from '../types.ts';
import { SvgChatAiIcon } from './SvgIcons.tsx';

interface LiveActivityBarProps {
  lastRun: RunLog | null;
  profile: RunnerProfile;
  onOpenAddRun: () => void;
  onOpenChat: () => void;
  onOpenRunDetail?: (run: RunLog) => void;
}

export const LiveActivityBar: React.FC<LiveActivityBarProps> = () => {
  // Floating AI Chat button has been moved into the sticky Top Bar (DynamicHeader)
  // to prevent obstructing calendar days and workout cards.
  return null;
};
