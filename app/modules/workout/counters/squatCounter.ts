// counters/squatCounter.ts
import BaseCounter, { CounterResult } from "./baseCounter";
import { calculateAngle } from "../utils/pose";
import { Landmark } from "../utils/pose";

export default class SquatCounter extends BaseCounter {
  TOP_ANGLE_THRESHOLD = 170; // shoulder-hip-knee
  BOTTOM_ANGLE_THRESHOLD = 100; // hip-knee-ankle

  // expects left side landmarks (you could average left+right)
  processPose(pose: Landmark[]): CounterResult {
    // safety check
    if (!pose || pose.length < 33) return { count: this.successCount };

    const leftShoulder = pose[11];
    const leftHip = pose[23];
    const leftKnee = pose[25];
    const leftAnkle = pose[27];

    const shoulderHipKnee = calculateAngle(leftShoulder, leftHip, leftKnee);
    const hipKneeAnkle = calculateAngle(leftHip, leftKnee, leftAnkle);

    // Mark top
    if (shoulderHipKnee > this.TOP_ANGLE_THRESHOLD && !this.up) {
      this.up = true;
      this.down = false;
    }

    // Mark bottom and count
    if (this.up && hipKneeAnkle < this.BOTTOM_ANGLE_THRESHOLD && !this.down) {
      this.down = true;
      this.up = false;
      this.successCount += 1;
      return {
        count: this.successCount,
        feedback: "Good squat — bottom reached",
        score: 1,
      };
    }

    // reset to top after down
    if (this.down && shoulderHipKnee > this.TOP_ANGLE_THRESHOLD) {
      this.up = false;
    }

    return { count: this.successCount };
  }

  update(pose: Landmark[]) {
    return this.processPose(pose);
  }

  updatePrevious(pose: Landmark[]) {
    // If you need to store previous pose for smoothing, assign it here
    this.previousPose = pose;
  }
}
