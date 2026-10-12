import { describe, it, expect } from 'vitest';
import { formatDate, TYPE_COLORS, IMPORTANCE_COLORS } from '../utils/format';

describe('formatDate', () => {
  it('форматирует ISO-дату в ru-RU', () => {
    const result = formatDate('2026-01-15T10:30:00Z');
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it('возвращает дату для валидной строки', () => {
    const result = formatDate('2026-07-24T12:00:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('Invalid Date');
  });
});

describe('TYPE_COLORS', () => {
  it('содержит все 7 типов сущностей', () => {
    expect(Object.keys(TYPE_COLORS)).toHaveLength(7);
  });

  it('возвращает hex-цвет для каждого типа', () => {
    const types = ['Мир', 'Локация', 'Персонаж', 'Предмет', 'Квест', 'Организация', 'Заклинание'];
    for (const type of types) {
      expect(TYPE_COLORS[type]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('IMPORTANCE_COLORS', () => {
  it('содержит все 4 уровня важности', () => {
    expect(Object.keys(IMPORTANCE_COLORS)).toHaveLength(4);
  });

  it('возвращает hex-цвет для каждого уровня', () => {
    const levels = ['Низкая', 'Средняя', 'Высокая', 'Ключевая для сюжета'];
    for (const level of levels) {
      expect(IMPORTANCE_COLORS[level]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
