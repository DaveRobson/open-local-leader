import { type FC } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const Input: FC<InputProps> = ({ label, ...props }) => (
    <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
            {label}
        </label>
        <input
            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-zinc-600"
            {...props}
        />
    </div>
);

export default Input;
