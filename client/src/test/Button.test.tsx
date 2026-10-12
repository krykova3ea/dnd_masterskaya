import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/Button';

describe('Button', () => {
  it('рендерит текст', () => {
    render(<Button>Тест</Button>);
    expect(screen.getByText('Тест')).toBeInTheDocument();
  });

  it('применяет класс btn по умолчанию', () => {
    render(<Button>Кнопка</Button>);
    expect(screen.getByText('Кнопка')).toHaveClass('btn');
  });

  it('применяет вариант primary', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('btn--primary');
  });

  it('применяет вариант danger', () => {
    render(<Button variant="danger">Danger</Button>);
    expect(screen.getByText('Danger')).toHaveClass('btn--danger');
  });

  it('применяет вариант small', () => {
    render(<Button variant="small">Small</Button>);
    expect(screen.getByText('Small')).toHaveClass('btn--small');
  });

  it('вызывает onClick при нажатии', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('не вызывает onClick когда disabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Disabled</Button>);
    fireEvent.click(screen.getByText('Disabled'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
