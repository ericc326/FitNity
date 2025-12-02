// counters/baseCounter.ts
import { Pose } from "../utils/pose";

export type CounterResult = {
  count: number;
  feedback?: string;
  score?: number;
  calorie?: number;
  confidence?: number;
};

export default abstract class BaseCounter {
  successCount = 0;
  up = false;
  down = false;
  previousPose?: Pose;

  movementThreshold = 0.06; // default; can be tuned per exercise

  abstract processPose(pose: Pose): CounterResult;

  // update previous pose for stability checks
  updatePrevious(p: Pose | undefined) {
    this.previousPose = p;
  }
}
