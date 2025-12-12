/**
 * Get display time for posts and comments in feed tab
 * - Shows "Edites" if editedAt exists
 * - Shows relative time (5 minutes, 2 hours, 3 days) if less than 90 days old
 * - Shows formatted date if more than 90 days old
 */

export const getDisplayTime = (createdAt: string, editedAt?: string) => {
  // Prioritize editedAt if post edited, otherwise use createdAt
  const targetDateString = editedAt || createdAt;
  const date = new Date(targetDateString);
  const now = new Date();

  // Calculate difference in seconds
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInDays = Math.floor(diffInSeconds / 86400);

  let timeStr = "";

  if (diffInDays > 90) {
    //for posts older than approx 3 months
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    timeStr = date.toLocaleDateString(undefined, options);
  } else if (diffInSeconds < 60) {
    timeStr = `${diffInSeconds} seconds ago`;
  } else if (diffInSeconds < 3600) {
    timeStr = `${Math.floor(diffInSeconds / 60)} minutes ago`;
  } else if (diffInSeconds < 86400) {
    timeStr = `${Math.floor(diffInSeconds / 3600)} hours ago`;
  } else {
    timeStr = `${diffInDays} days ago`;
  }

  return editedAt ? `${timeStr} • Edited` : timeStr;
};
