import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Entity } from '../types';
import { api } from '../api/client';
import { EntityForm } from '../components/EntityForm';

export function EntityEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (id) {
      api.getEntityById(parseInt(id, 10))
        .then((data) => {
          setEntity(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Ошибка загрузки сущности:', err);
          setLoading(false);
        });
    }
  }, [id]);

  if (isEdit && loading) {
    return <p>Загрузка...</p>;
  }

  return (
    <div className="entity-editor-page">
      <h2 className="entity-editor-page__title">
        {isEdit ? 'Редактирование сущности' : 'Новая сущность'}
      </h2>
      <EntityForm entity={isEdit ? entity : null} />
    </div>
  );
}
