import { type FC, type ChangeEvent, useState, useEffect } from 'react';
import { formatSecondsToTime, parseTimeToSeconds, isValidTimeFormat } from '../utils/timeFormat';
import Input from "./Input.tsx";

interface TimeInputProps {
    label?: string;
    value: number | string | undefined;
    onChange: (seconds: number) => void;
    placeholder?: string;
    disabled?: boolean;
}

const TimeInput: FC<TimeInputProps> = ({ label, value, onChange, placeholder = 'MM:SS', disabled = false }) => {
    // Internal string state for the input
    const [displayValue, setDisplayValue] = useState<string>('');

    // Sync internal state with external value
    useEffect(() => {
        if (typeof value === 'number' && value > 0) {
            setDisplayValue(formatSecondsToTime(value));
        } else if (typeof value === 'string' && value) {
            setDisplayValue(value);
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue);

        // Allow empty input
        if (!inputValue.trim()) {
            onChange(0);
            return;
        }

        // Validate and parse on change
        if (isValidTimeFormat(inputValue)) {
            const seconds = parseTimeToSeconds(inputValue);
            onChange(seconds);
        }
    };

    const handleBlur = () => {
        // On blur, format the value if valid and not empty
        if (displayValue && isValidTimeFormat(displayValue)) {
            const seconds = parseTimeToSeconds(displayValue);
            setDisplayValue(formatSecondsToTime(seconds));
        }
    };

    return (
        <Input label={label} type="text" value={displayValue} onChange={handleChange} onBlur={handleBlur} placeholder={placeholder} disabled={disabled} />
    );
};

export default TimeInput;