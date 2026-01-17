/**
 * Parse a time string in MM:SS format to total seconds
 * @param timeStr - Time string in "MM:SS" format (e.g., "12:34")
 * @returns Total seconds, or 0 if invalid
 */
export const parseTimeToSeconds = (timeStr: string): number => {
    if (!timeStr || typeof timeStr !== 'string') return 0;

    const trimmed = timeStr.trim();

    // Handle MM:SS format
    if (trimmed.includes(':')) {
        const parts = trimmed.split(':');
        if (parts.length !== 2) return 0;

        const minutes = parseInt(parts[0], 10);
        const seconds = parseInt(parts[1], 10);

        if (isNaN(minutes) || isNaN(seconds)) return 0;
        if (seconds < 0 || seconds >= 60) return 0;
        if (minutes < 0) return 0;

        return minutes * 60 + seconds;
    }

    // If no colon, try to parse as raw seconds
    const rawSeconds = parseInt(trimmed, 10);
    return isNaN(rawSeconds) ? 0 : rawSeconds;
};

/**
 * Format total seconds to MM:SS display string
 * @param totalSeconds - Total seconds
 * @returns Formatted string in "MM:SS" format (e.g., "12:34")
 */
export const formatSecondsToTime = (totalSeconds: number | undefined): string => {
    if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds) || totalSeconds === 0) {
        return '';
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Validate a time string in MM:SS format
 * @param timeStr - Time string to validate
 * @returns true if valid MM:SS format
 */
export const isValidTimeFormat = (timeStr: string): boolean => {
    if (!timeStr || typeof timeStr !== 'string') return false;

    const trimmed = timeStr.trim();
    if (!trimmed) return true; // Empty is valid (no score)

    const pattern = /^\d{1,3}:\d{2}$/;
    if (!pattern.test(trimmed)) return false;

    const parts = trimmed.split(':');
    const seconds = parseInt(parts[1], 10);

    return seconds >= 0 && seconds < 60;
};

/**
 * Format a time cap (in seconds) to a display string
 * @param timeCap - Time cap in seconds
 * @returns Formatted string (e.g., "15:00" for 900 seconds)
 */
export const formatTimeCap = (timeCap: number): string => {
    const minutes = Math.floor(timeCap / 60);
    const seconds = timeCap % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};
