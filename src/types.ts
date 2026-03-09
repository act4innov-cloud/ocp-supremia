export interface SensorData {
  id: string;
  name: string;
  location: string;
  type: 'H2S' | 'CO' | 'CO2' | 'SMOKE' | 'LPG' | 'TEMP' | 'HUM' | 'UNKNOWN' | 'GENERIC' | 'VOC';
  value: number;
  unit: string;
  status: 'SAFE' | 'WARNING' | 'DANGER';
  lastUpdate: number;
  history: { time: string; value: number }[];
}

export const SAFETY_LIMITS = {
  H2S: { warning: 10, danger: 100 },
  CO: { warning: 25, danger: 300 },
  CO2: { warning: 1000, danger: 5000 },
  SMOKE: { warning: 200, danger: 1000 },
  LPG: { warning: 1000, danger: 5000 },
  TEMP: { warning: 40, danger: 60 },
  HUM: { warning: 80, danger: 95 },
  VOC: { warning: 500, danger: 1000 }
};

export const getStatus = (type: string, value: number): 'SAFE' | 'WARNING' | 'DANGER' => {
  const limits = SAFETY_LIMITS[type as keyof typeof SAFETY_LIMITS];
  if (!limits) return 'SAFE';
  if (value >= limits.danger) return 'DANGER';
  if (value >= limits.warning) return 'WARNING';
  return 'SAFE';
};
