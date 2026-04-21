import { useEffect, useState } from 'react';
import { loadCalibrationHistory, subscribeCalibrationPersistence, type CalibrationHistoryEntry } from '@/utils/persistence';

export function useCalibrationHistory(surfaceId: string) {
  const [history, setHistory] = useState<CalibrationHistoryEntry[]>(() => loadCalibrationHistory(surfaceId));

  useEffect(() => {
    setHistory(loadCalibrationHistory(surfaceId));

    return subscribeCalibrationPersistence(() => {
      setHistory(loadCalibrationHistory(surfaceId));
    });
  }, [surfaceId]);

  return history;
}