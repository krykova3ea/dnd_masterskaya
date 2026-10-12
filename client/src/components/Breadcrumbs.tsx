import { Link } from 'react-router-dom';
import { Entity } from '../types';

interface BreadcrumbsProps {
  ancestors: Entity[];
}

export function Breadcrumbs({ ancestors }: BreadcrumbsProps) {
  if (ancestors.length === 0) return null;

  return (
    <nav className="breadcrumbs">
      {ancestors.map((ancestor, idx) => {
        const isLast = idx === ancestors.length - 1;
        return (
          <span key={ancestor.id} className="breadcrumbs__group">
            {idx > 0 && <span className="breadcrumbs__sep">{'\u203A'}</span>}
            {isLast ? (
              <span className="breadcrumbs__current">{ancestor.name}</span>
            ) : (
              <Link className="breadcrumbs__item" to={`/entity/${ancestor.id}`}>
                {ancestor.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
