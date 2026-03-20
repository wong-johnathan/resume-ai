import { TextareaHTMLAttributes, forwardRef } from 'react';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(({ label, error, className = '', ...props }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea
      ref={ref}
      {...props}
      className={`block w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${error ? 'border-red-400' : 'border-gray-300'} ${className}`}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';
