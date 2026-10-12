import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Relation, Entity, RELATION_TYPES } from '../types';
import { api } from '../api/client';
import { Button } from './Button';

interface RelationEditorProps {
  entityId: number;
}

export function RelationEditor({ entityId }: RelationEditorProps) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [targetId, setTargetId] = useState('');
  const [relationType, setRelationType] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [rels, entities] = await Promise.all([
        api.getRelations(entityId),
        api.getEntities(),
      ]);
      setRelations(rels);
      setAllEntities(entities.filter((e) => e.id !== entityId));
    } catch (err) {
      console.error('Ошибка загрузки связей:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [entityId]);

  const handleAdd = async () => {
    if (!targetId || !relationType) {
      setError('Выберите сущность и тип связи');
      return;
    }
    try {
      setError('');
      await api.addRelation(entityId, parseInt(targetId, 10), relationType, description.trim() || undefined);
      setTargetId('');
      setRelationType('');
      setDescription('');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления связи');
    }
  };

  const handleDelete = async (relationId: number) => {
    try {
      await api.deleteRelation(relationId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления связи');
    }
  };

  if (loading) return null;

  return (
    <div className="relation-editor">
      <h4 className="relation-editor__title">Связи</h4>

      {relations.length > 0 && (
        <div className="relation-editor__list">
          {relations.map((rel) => {
            const isOutgoing = rel.direction === 'outgoing';
            const linkedId = isOutgoing ? rel.target_id : rel.source_id;
            const linkedName = isOutgoing ? rel.target_name : rel.source_name;
            const linkedType = isOutgoing ? rel.target_type : rel.source_type;
            const typeClass = (linkedType || '').replace(/\s+/g, '-');

            return (
              <div key={rel.id} className="relation-editor__row">
                {isOutgoing ? (
                  <>
                    <span className="relation-editor__direction">{'\u2192'}</span>
                    <span className={`type-badge type-badge--${typeClass}`}>{linkedType}</span>
                    <span className="relation-editor__type">{rel.relation_type}</span>
                    <span className="relation-editor__target">
                      <Link to={`/entity/${linkedId}`}>{linkedName}</Link>
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`type-badge type-badge--${typeClass}`}>{linkedType}</span>
                    <span className="relation-editor__target">
                      <Link to={`/entity/${linkedId}`}>{linkedName}</Link>
                    </span>
                    <span className="relation-editor__type">{rel.relation_type}</span>
                    <span className="relation-editor__direction">{'\u2192'}</span>
                  </>
                )}
                {rel.description && (
                  <span className="relation-editor__description">{rel.description}</span>
                )}
                <button
                  className="btn btn--small btn--danger"
                  onClick={() => handleDelete(rel.id)}
                >
                  Удал.
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="relation-editor__add">
        <select
          className="select"
          value={relationType}
          onChange={(e) => setRelationType(e.target.value)}
        >
          <option value="">Тип связи...</option>
          {RELATION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="select"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">Выберите сущность...</option>
          {allEntities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.type})
            </option>
          ))}
        </select>
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание (необязательно)"
        />
        <Button variant="primary" onClick={handleAdd}>
          + Добавить
        </Button>
      </div>

      {error && <p className="relation-editor__error">{error}</p>}
    </div>
  );
}
