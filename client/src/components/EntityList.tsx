import { Link } from 'react-router-dom';
import { Entity } from '../types';
import { formatDate } from '../utils/format';

interface EntityListProps {
  entities: Entity[];
  onEdit: (entity: Entity) => void;
  onDelete: (entity: Entity) => void;
}

export function EntityList({ entities, onEdit, onDelete }: EntityListProps) {
  if (entities.length === 0) {
    return (
      <div className="entity-tree__empty">
        <p>Сущности не найдены. Измените параметры фильтрации.</p>
      </div>
    );
  }

  return (
    <div className="entity-list">
      <div className="entity-list__header">
        <span className="entity-list__col entity-list__col--type">Тип</span>
        <span className="entity-list__col entity-list__col--name">Название</span>
        <span className="entity-list__col entity-list__col--importance">Важность</span>
        <span className="entity-list__col entity-list__col--date">Дата создания</span>
        <span className="entity-list__col entity-list__col--actions"></span>
      </div>
      {entities.map((entity) => {
        const typeClass = entity.type.replace(/\s+/g, '-');
        return (
          <div key={entity.id} className="entity-list__row">
            <span className="entity-list__col entity-list__col--type">
              <span className={`type-badge type-badge--${typeClass}`}>
                {entity.type}
              </span>
            </span>
            <span className="entity-list__col entity-list__col--name">
              <Link to={`/entity/${entity.id}`}>{entity.name}</Link>
            </span>
            <span className="entity-list__col entity-list__col--importance">
              <span className={`importance-badge importance-badge--${entity.importance.replace(/\s+/g, '-')}`}>
                {entity.importance}
              </span>
            </span>
            <span className="entity-list__col entity-list__col--date">
              {formatDate(entity.created_at)}
            </span>
            <span className="entity-list__col entity-list__col--actions">
              <button className="btn btn--small" onClick={() => onEdit(entity)}>
                Изменить
              </button>
              <button
                className="btn btn--small btn--danger"
                onClick={() => onDelete(entity)}
              >
                Удалить
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
