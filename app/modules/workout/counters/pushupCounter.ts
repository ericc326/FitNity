// counters/pushupCounter.ts
import BaseCounter, { CounterResult } from "./baseCounter";
import { calculateAngle } from "../utils/pose";
import { Landmark } from "../utils/pose";

export default class PushupCounter extends BaseCounter {
  TOP_ANGLE_THRESHOLD = 160; // elbow angle near straight
  BOTTOM_ANGLE_THRESHOLD = 70; // elbow angle when down

  processPose(pose: Landmark[]): CounterResult {
    if (!pose || pose.length < 33) return { count: this.successCount };

    // Use right elbow (14) or average left/right
    const rightShoulder = pose[12];
    const rightElbow = pose[14];
    const rightWrist = pose[16];

    const elbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

    // Up (straight arms)
    if (elbowAngle > this.TOP_ANGLE_THRESHOLD && !this.up) {
      this.up = true;
      this.down = false;
    }

    // Down (lowered)
    if (this.up && elbowAngle < this.BOTTOM_ANGLE_THRESHOLD && !this.down) {
      this.down = true;
      this.up = false;
      this.successCount += 1;
      return {
        count: this.successCount,
        feedback: "Nice push-up — bottom reached",
        score: 1,
      };
    }

    // reset
    if (this.down && elbowAngle > this.TOP_ANGLE_THRESHOLD) {
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
