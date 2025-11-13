import { type FC } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: { label: string; value: string }[];
}

const Select: FC<SelectProps> = ({ label, options, ...props }) => (
    <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
            {label}
        </label>
        <select
            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all appearance-none"
            {...props}
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

export default Select;
