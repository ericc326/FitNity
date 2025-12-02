import BaseCounter, { CounterResult } from "./baseCounter";
import { calculateAngle } from "../utils/pose";
import { Landmark } from "../utils/pose";

export default class BicepCurlCounter extends BaseCounter {
  TOP_ANGLE_THRESHOLD = 30; // Arm fully curled
  BOTTOM_ANGLE_THRESHOLD = 160; // Arm fully extended

  processPose(pose: Landmark[]): CounterResult {
    if (!pose || pose.length < 33) {
      return { count: this.successCount };
    }

    // Right arm landmarks
    const shoulder = pose[12];
    const elbow = pose[14];
    const wrist = pose[16];

    const elbowAngle = calculateAngle(shoulder, elbow, wrist);

    // Curl up
    if (elbowAngle < this.TOP_ANGLE_THRESHOLD && !this.up) {
      this.up = true;
      this.down = false;
    }

    // Curl down (fully extended)
    if (this.up && elbowAngle > this.BOTTOM_ANGLE_THRESHOLD && !this.down) {
      this.down = true;
      this.up = false;
      this.successCount += 1;

      return {
        count: this.successCount,
        feedback: "Nice bicep curl — full extension",
        score: 1,
      };
    }

    // Reset state if needed
    if (this.down && elbowAngle < this.TOP_ANGLE_THRESHOLD) {
      this.up = false;
    }

    // Always return count
    return { count: this.successCount };
  }

  update(pose: Landmark[]): CounterResult {
    return this.processPose(pose);
  }

  updatePrevious(pose: Landmark[]) {
    this.previousPose = pose;
  }
}
