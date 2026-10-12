import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Entity } from '../types';

function makeEntity(id: number, name: string): Entity {
  return {
    id,
    name,
    type: 'Мир',
    parent_id: null,
    description: null,
    importance: 'Средняя',
    image_url: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('Breadcrumbs', () => {
  it('не рендерит ничего при пустом массиве', () => {
    const { container } = render(
      <MemoryRouter>
        <Breadcrumbs ancestors={[]} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('рендерит один предка как текущий (без ссылки)', () => {
    const ancestors = [makeEntity(1, 'Фаэрун')];
    render(
      <MemoryRouter>
        <Breadcrumbs ancestors={ancestors} />
      </MemoryRouter>
    );
    expect(screen.getByText('Фаэрун')).toHaveClass('breadcrumbs__current');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('рендерит цепочку: предки-ссылки + последний — текущий', () => {
    const ancestors = [makeEntity(1, 'Фаэрун'), makeEntity(2, 'Побережье Мечей'), makeEntity(3, 'Врата Балдура')];
    render(
      <MemoryRouter>
        <Breadcrumbs ancestors={ancestors} />
      </MemoryRouter>
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent('Фаэрун');
    expect(links[1]).toHaveTextContent('Побережье Мечей');
    expect(screen.getByText('Врата Балдура')).toHaveClass('breadcrumbs__current');
  });

  it('показывает разделители между элементами', () => {
    const ancestors = [makeEntity(1, 'Фаэрун'), makeEntity(2, 'Локация')];
    const { container } = render(
      <MemoryRouter>
        <Breadcrumbs ancestors={ancestors} />
      </MemoryRouter>
    );
    const separators = container.querySelectorAll('.breadcrumbs__sep');
    expect(separators).toHaveLength(1);
  });
});
