import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Entity } from '../types';
import { formatDate } from '../utils/format';

interface EntityNodeProps {
  entity: Entity;
  children: Entity[];
  childrenMap: Map<number, Entity[]>;
  onEdit: (entity: Entity) => void;
  onDelete: (entity: Entity) => void;
  depth: number;
}

export function EntityNode({
  entity,
  children,
  childrenMap,
  onEdit,
  onDelete,
  depth,
}: EntityNodeProps) {
  const [expanded, setExpanded] = useState(true);

  const typeClass = entity.type.replace(/\s+/g, '-');
  const hasChildren = children.length > 0;

  return (
    <div className="entity-node" style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div className="entity-node__row">
        {hasChildren ? (
          <button
            className="entity-node__toggle"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Свернуть' : 'Развернуть'}
          >
            {expanded ? '\u25BE' : '\u25B8'}
          </button>
        ) : (
          <span className="entity-node__toggle entity-node__toggle--leaf" />
        )}

        <span className={`type-badge type-badge--${typeClass}`}>
          {entity.type}
        </span>

        <span
          className="entity-node__name"
          onClick={() => hasChildren && setExpanded(!expanded)}
          style={{ cursor: hasChildren ? 'pointer' : 'default' }}
        >
          <Link to={`/entity/${entity.id}`} onClick={(e) => e.stopPropagation()}>
            {entity.name}
          </Link>
        </span>

        {entity.children_count && parseInt(String(entity.children_count), 10) > 0 && (
          <span className="entity-node__count">
            ({entity.children_count})
          </span>
        )}

        <span className={`importance-badge importance-badge--${entity.importance.replace(/\s+/g, '-')}`}>
          {entity.importance}
        </span>

        <span className="entity-node__date">
          {formatDate(entity.created_at)}
        </span>

        <div className="entity-node__actions">
          <button className="btn btn--small" onClick={() => onEdit(entity)}>
            Изменить
          </button>
          <button
            className="btn btn--small btn--danger"
            onClick={() => onDelete(entity)}
          >
            Удалить
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="entity-node__children">
          {children.map((child) => (
            <EntityNode
              key={child.id}
              entity={child}
              children={childrenMap.get(child.id) || []}
              childrenMap={childrenMap}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
