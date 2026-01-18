import { describe, it, expect } from 'vitest';
import {
    parseTimeToSeconds,
    formatSecondsToTime,
    isValidTimeFormat,
    formatTimeCap,
} from './timeFormat';

describe('parseTimeToSeconds', () => {
    describe('valid MM:SS format', () => {
        it('should parse standard times correctly', () => {
            expect(parseTimeToSeconds('12:34')).toBe(754);
            expect(parseTimeToSeconds('5:00')).toBe(300);
            expect(parseTimeToSeconds('0:30')).toBe(30);
            expect(parseTimeToSeconds('10:00')).toBe(600);
        });

        it('should parse times with leading zeros', () => {
            expect(parseTimeToSeconds('05:05')).toBe(305);
            expect(parseTimeToSeconds('00:45')).toBe(45);
        });

        it('should parse times over an hour', () => {
            expect(parseTimeToSeconds('90:00')).toBe(5400);
            expect(parseTimeToSeconds('120:30')).toBe(7230);
        });

        it('should handle whitespace', () => {
            expect(parseTimeToSeconds('  12:34  ')).toBe(754);
            expect(parseTimeToSeconds(' 5:00 ')).toBe(300);
        });
    });

    describe('invalid formats', () => {
        it('should return 0 for empty or null input', () => {
            expect(parseTimeToSeconds('')).toBe(0);
            expect(parseTimeToSeconds(null as unknown as string)).toBe(0);
            expect(parseTimeToSeconds(undefined as unknown as string)).toBe(0);
        });

        it('should return 0 for invalid seconds (>= 60)', () => {
            expect(parseTimeToSeconds('5:60')).toBe(0);
            expect(parseTimeToSeconds('5:99')).toBe(0);
        });

        it('should return 0 for negative values', () => {
            expect(parseTimeToSeconds('-5:30')).toBe(0);
            expect(parseTimeToSeconds('5:-30')).toBe(0);
        });

        it('should return 0 for malformed strings', () => {
            expect(parseTimeToSeconds('12:34:56')).toBe(0);
            expect(parseTimeToSeconds('abc:def')).toBe(0);
            expect(parseTimeToSeconds(':')).toBe(0);
        });
    });

    describe('raw seconds fallback', () => {
        it('should parse raw seconds when no colon present', () => {
            expect(parseTimeToSeconds('300')).toBe(300);
            expect(parseTimeToSeconds('754')).toBe(754);
            expect(parseTimeToSeconds('0')).toBe(0);
        });

        it('should return 0 for non-numeric strings without colon', () => {
            expect(parseTimeToSeconds('abc')).toBe(0);
        });
    });
});

describe('formatSecondsToTime', () => {
    describe('valid conversions', () => {
        it('should format standard times correctly', () => {
            expect(formatSecondsToTime(754)).toBe('12:34');
            expect(formatSecondsToTime(300)).toBe('5:00');
            expect(formatSecondsToTime(30)).toBe('0:30');
            expect(formatSecondsToTime(600)).toBe('10:00');
        });

        it('should pad seconds with leading zero', () => {
            expect(formatSecondsToTime(305)).toBe('5:05');
            expect(formatSecondsToTime(61)).toBe('1:01');
            expect(formatSecondsToTime(9)).toBe('0:09');
        });

        it('should handle times over an hour', () => {
            expect(formatSecondsToTime(5400)).toBe('90:00');
            expect(formatSecondsToTime(7230)).toBe('120:30');
        });
    });

    describe('edge cases', () => {
        it('should return empty string for 0', () => {
            expect(formatSecondsToTime(0)).toBe('');
        });

        it('should return empty string for undefined/null', () => {
            expect(formatSecondsToTime(undefined)).toBe('');
            expect(formatSecondsToTime(null as unknown as number)).toBe('');
        });

        it('should return empty string for NaN', () => {
            expect(formatSecondsToTime(NaN)).toBe('');
        });
    });
});

describe('isValidTimeFormat', () => {
    describe('valid formats', () => {
        it('should accept valid MM:SS formats', () => {
            expect(isValidTimeFormat('12:34')).toBe(true);
            expect(isValidTimeFormat('5:00')).toBe(true);
            expect(isValidTimeFormat('0:30')).toBe(true);
            expect(isValidTimeFormat('99:59')).toBe(true);
            expect(isValidTimeFormat('120:00')).toBe(true);
        });

        it('should handle empty input', () => {
            // Empty string is rejected at first check
            expect(isValidTimeFormat('')).toBe(false);
            // Whitespace gets trimmed to empty, which is valid (no score)
            expect(isValidTimeFormat('   ')).toBe(true);
        });
    });

    describe('invalid formats', () => {
        it('should reject seconds >= 60', () => {
            expect(isValidTimeFormat('5:60')).toBe(false);
            expect(isValidTimeFormat('5:99')).toBe(false);
        });

        it('should reject missing parts', () => {
            expect(isValidTimeFormat('5:')).toBe(false);
            expect(isValidTimeFormat(':30')).toBe(false);
            expect(isValidTimeFormat(':')).toBe(false);
        });

        it('should reject wrong format', () => {
            expect(isValidTimeFormat('5:1')).toBe(false); // Seconds must be 2 digits
            expect(isValidTimeFormat('abc')).toBe(false);
            expect(isValidTimeFormat('12:34:56')).toBe(false);
        });

        it('should reject null/undefined', () => {
            expect(isValidTimeFormat(null as unknown as string)).toBe(false);
            expect(isValidTimeFormat(undefined as unknown as string)).toBe(false);
        });
    });
});

describe('formatTimeCap', () => {
    it('should format time caps correctly', () => {
        expect(formatTimeCap(900)).toBe('15:00');
        expect(formatTimeCap(600)).toBe('10:00');
        expect(formatTimeCap(720)).toBe('12:00');
        expect(formatTimeCap(540)).toBe('9:00');
    });

    it('should handle time caps with seconds', () => {
        expect(formatTimeCap(915)).toBe('15:15');
        expect(formatTimeCap(661)).toBe('11:01');
    });

    it('should pad seconds with leading zero', () => {
        expect(formatTimeCap(605)).toBe('10:05');
        expect(formatTimeCap(61)).toBe('1:01');
    });
});

describe('roundtrip conversions', () => {
    it('should convert time to seconds and back correctly', () => {
        const times = ['5:00', '12:34', '0:30', '90:15'];

        times.forEach(time => {
            const seconds = parseTimeToSeconds(time);
            const formatted = formatSecondsToTime(seconds);
            expect(formatted).toBe(time);
        });
    });

    it('should handle edge cases in roundtrip', () => {
        // Single digit minutes
        expect(formatSecondsToTime(parseTimeToSeconds('1:00'))).toBe('1:00');
        // Maximum valid seconds
        expect(formatSecondsToTime(parseTimeToSeconds('10:59'))).toBe('10:59');
    });
});
