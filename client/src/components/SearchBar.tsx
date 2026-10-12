import { useState, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = 'Поиск по названию и описанию...' }: SearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, onSearch]);

  return (
    <div className="search-bar">
      <span className="search-bar__icon">🔍</span>
      <input
        className="input search-bar__input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          className="search-bar__clear"
          onClick={() => setValue('')}
          aria-label="Очистить"
        >
          ✕
        </button>
      )}
    </div>
  );
}
