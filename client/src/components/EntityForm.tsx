import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Entity, ENTITY_TYPES, IMPORTANCE_LEVELS, Importance } from '../types';
import { api } from '../api/client';
import { Input, Textarea, Select } from './Input';
import { Button } from './Button';
import { AttributeEditor } from './AttributeEditor';
import { RelationEditor } from './RelationEditor';

interface EntityFormProps {
  entity?: Entity | null;
}

// Вычисляет множество всех потомков сущности (для исключения из выбора родителя)
function getDescendantIds(entities: Entity[], rootId: number): Set<number> {
  const result = new Set<number>();
  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const e of entities) {
      if (e.parent_id === currentId && !result.has(e.id)) {
        result.add(e.id);
        queue.push(e.id);
      }
    }
  }
  return result;
}

export function EntityForm({ entity }: EntityFormProps) {
  const navigate = useNavigate();
  const isEdit = !!entity;

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [importance, setImportance] = useState<Importance>('Средняя');
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.getEntities().then(setAllEntities).catch(() => {});
  }, []);

  useEffect(() => {
    if (entity) {
      setName(entity.name);
      setType(entity.type);
      setParentId(entity.parent_id ? String(entity.parent_id) : '');
      setDescription(entity.description || '');
      setImportance(entity.importance);
      setImageUrl(entity.image_url || null);
    }
  }, [entity]);

  // Исключаем саму сущность и всех её потомков из списка возможных родителей
  const parentOptions = useMemo(() => {
    if (!isEdit || !entity) return allEntities;
    const descendantIds = getDescendantIds(allEntities, entity.id);
    return allEntities.filter((e) => e.id !== entity.id && !descendantIds.has(e.id));
  }, [allEntities, entity, isEdit]);

  const isFormValid = name.trim().length > 0 && type.trim().length > 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!entity || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    setError('');
    try {
      const result = await api.uploadImage(entity.id, file);
      setImageUrl(result.image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!entity) return;
    setUploading(true);
    setError('');
    try {
      await api.deleteImage(entity.id);
      setImageUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setError('');
    try {
      const data = {
        name: name.trim(),
        type: type.trim(),
        parent_id: parentId ? parseInt(parentId, 10) : null,
        description: description.trim(),
        importance: importance as Importance,
      };

      if (isEdit && entity) {
        await api.updateEntity(entity.id, data);
        navigate(`/entity/${entity.id}`);
      } else {
        const created = await api.createEntity(data);
        navigate(`/entity/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  return (
    <div className="entity-form">
      {error && <div className="entity-form__error">{error}</div>}

      <div className="entity-form__grid">
        <Input
          label="Название *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, Гэндальф"
        />

        <Select
          label="Тип *"
          options={ENTITY_TYPES}
          placeholder="Выберите тип"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />

        <div className="field">
          <label className="field__label">Родительская сущность</label>
          <select
            className="select"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Нет (корневая сущность)</option>
            {parentOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.type})
              </option>
            ))}
          </select>
        </div>

        <Select
          label="Важность"
          options={IMPORTANCE_LEVELS}
          value={importance}
          onChange={(e) => setImportance(e.target.value as Importance)}
        />
      </div>

      <Textarea
        label="Описание"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание сущности..."
        rows={4}
      />

      {isEdit && (
        <div className="entity-form__image">
          <label className="field__label">Изображение</label>
          {imageUrl ? (
            <div className="entity-form__image-preview">
              <img src={imageUrl} alt={name} className="entity-form__image-img" />
              <Button variant="danger" onClick={handleImageDelete} disabled={uploading}>
                Удалить изображение
              </Button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              disabled={uploading}
              className="input"
            />
          )}
          {uploading && <p className="entity-form__uploading">Загрузка...</p>}
        </div>
      )}

      <div className="entity-form__actions">
        <Button variant="primary" onClick={handleSubmit} disabled={!isFormValid}>
          {isEdit ? 'Сохранить изменения' : 'Создать сущность'}
        </Button>
        <Button onClick={() => navigate('/')}>Отмена</Button>
      </div>

      {isEdit && entity && (
        <>
          <AttributeEditor entityId={entity.id} initialAttributes={entity.attributes || []} />
          <RelationEditor entityId={entity.id} />
        </>
      )}
    </div>
  );
}
