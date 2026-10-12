import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EntityTree } from '../components/EntityTree';
import { Entity } from '../types';

function makeEntity(id: number, name: string, parentId: number | null = null): Entity {
  return {
    id,
    name,
    type: 'Мир',
    parent_id: parentId,
    description: null,
    importance: 'Средняя',
    image_url: null,
    created_at: '2026-01-01T00:00:00Z',
    children_count: parentId === null ? 1 : 0,
  };
}

describe('EntityTree', () => {
  it('показывает сообщение при пустом списке', () => {
    render(
      <MemoryRouter>
        <EntityTree entities={[]} onEdit={() => {}} onDelete={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Сущности не найдены/)).toBeInTheDocument();
  });

  it('рендерит корневые сущности', () => {
    const entities = [makeEntity(1, 'Фаэрун'), makeEntity(2, 'Другой мир')];
    render(
      <MemoryRouter>
        <EntityTree entities={entities} onEdit={() => {}} onDelete={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Фаэрун')).toBeInTheDocument();
    expect(screen.getByText('Другой мир')).toBeInTheDocument();
  });

  it('рендерит дочерние сущности под родителем', () => {
    const entities = [
      makeEntity(1, 'Фаэрун'),
      makeEntity(2, 'Побережье Мечей', 1),
    ];
    render(
      <MemoryRouter>
        <EntityTree entities={entities} onEdit={() => {}} onDelete={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('Фаэрун')).toBeInTheDocument();
    expect(screen.getByText('Побережье Мечей')).toBeInTheDocument();
  });
});
