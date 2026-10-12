import { useMemo } from 'react';
import { Entity } from '../types';
import { EntityNode } from './EntityNode';

interface EntityTreeProps {
  entities: Entity[];
  onEdit: (entity: Entity) => void;
  onDelete: (entity: Entity) => void;
}

export function EntityTree({ entities, onEdit, onDelete }: EntityTreeProps) {
  const childrenMap = useMemo(() => {
    const map = new Map<number, Entity[]>();
    for (const e of entities) {
      if (e.parent_id !== null) {
        const arr = map.get(e.parent_id);
        if (arr) {
          arr.push(e);
        } else {
          map.set(e.parent_id, [e]);
        }
      }
    }
    return map;
  }, [entities]);

  const rootEntities = entities.filter((e) => e.parent_id === null);

  if (rootEntities.length === 0) {
    return (
      <div className="entity-tree__empty">
        <p>Сущности не найдены. Создайте первую сущность!</p>
      </div>
    );
  }

  return (
    <div className="entity-tree">
      {rootEntities.map((entity) => (
        <EntityNode
          key={entity.id}
          entity={entity}
          children={childrenMap.get(entity.id) || []}
          childrenMap={childrenMap}
          onEdit={onEdit}
          onDelete={onDelete}
          depth={0}
        />
      ))}
    </div>
  );
}
