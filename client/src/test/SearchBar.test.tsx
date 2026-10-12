import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('рендерит поле ввода', () => {
    render(<SearchBar onSearch={() => {}} />);
    expect(screen.getByPlaceholderText('Поиск по названию и описанию...')).toBeInTheDocument();
  });

  it('вызывает onSearch с debounce 300мс', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Поиск по названию и описанию...');
    fireEvent.change(input, { target: { value: 'тест' } });

    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).toHaveBeenCalledWith('тест');
  });

  it('показывает кнопку очистки при вводе текста', () => {
    render(<SearchBar onSearch={() => {}} />);
    const input = screen.getByPlaceholderText('Поиск по названию и описанию...');

    expect(screen.queryByLabelText('Очистить')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'поиск' } });
    expect(screen.getByLabelText('Очистить')).toBeInTheDocument();
  });

  it('очищает поле при нажатии на кнопку очистки', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Поиск по названию и описанию...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'поиск' } });
    expect(input.value).toBe('поиск');

    fireEvent.click(screen.getByLabelText('Очистить'));
    expect(input.value).toBe('');
  });
});
