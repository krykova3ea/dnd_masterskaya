import { useState } from 'react';
import { EntityFilters, ENTITY_TYPES, IMPORTANCE_LEVELS } from '../types';
import { Select } from './Input';
import { Button } from './Button';

interface FilterPanelProps {
  onApply: (filters: EntityFilters) => void;
  onReset: () => void;
}

export function FilterPanel({ onApply, onReset }: FilterPanelProps) {
  const [type, setType] = useState('');
  const [importance, setImportance] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleApply = () => {
    onApply({
      type: type || undefined,
      importance: importance || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    });
  };

  const handleReset = () => {
    setType('');
    setImportance('');
    setDateFrom('');
    setDateTo('');
    onReset();
  };

  const isDateRangeInvalid = dateFrom && dateTo && dateFrom > dateTo;

  return (
    <div className="filter-panel">
      <h3 className="filter-panel__title">Фильтры</h3>
      <div className="filter-panel__grid">
        <Select
          label="Тип"
          options={ENTITY_TYPES}
          placeholder="Все типы"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <Select
          label="Важность"
          options={IMPORTANCE_LEVELS}
          placeholder="Любая"
          value={importance}
          onChange={(e) => setImportance(e.target.value)}
        />
        <div className="field">
          <label className="field__label">Дата создания (от)</label>
          <input
            className="input"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label">Дата создания (до)</label>
          <input
            className="input"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>
      {isDateRangeInvalid && (
        <p className="filter-panel__error">
          Дата «от» не может быть позже даты «до»
        </p>
      )}
      <div className="filter-panel__actions">
        <Button
          variant="primary"
          onClick={handleApply}
          disabled={isDateRangeInvalid as boolean}
        >
          Применить фильтр
        </Button>
        <Button onClick={handleReset}>Сбросить</Button>
      </div>
    </div>
  );
}
