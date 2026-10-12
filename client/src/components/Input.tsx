import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      <input className="input" {...props} />
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, ...props }: TextareaProps) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      <textarea className="textarea" {...props} />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: string[];
  placeholder?: string;
}

export function Select({ label, options, placeholder, ...props }: SelectProps) {
  return (
    <div className="field">
      {label && <label className="field__label">{label}</label>}
      <select className="select" {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
