// utils/pose.ts
export type Landmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};
export type Pose = Landmark[]; // length 33 expected

export const calculateAngle = (
  a: Landmark,
  b: Landmark,
  c: Landmark
): number => {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

// simple smoothing check: returns true if landmarks moved too much from previous frame
export const isLandmarkUnstable = (
  prev?: Pose,
  current?: Pose,
  movementThreshold = 0.06 // tune if needed
): boolean => {
  if (!prev || !current || prev.length !== current.length) return false;
  for (let i = 0; i < current.length; i++) {
    const dx = current[i].x - prev[i].x;
    const dy = current[i].y - prev[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > movementThreshold) return true;
  }
  return false;
};

// MediaPipe pose landmark indices (subset names used below)
export const LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
} as const;
