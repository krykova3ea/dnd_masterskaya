import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Entity } from '../types';
import { api } from '../api/client';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { AttributeEditor } from '../components/AttributeEditor';
import { RelationEditor } from '../components/RelationEditor';
import { Button } from '../components/Button';
import { formatDate } from '../utils/format';

export function EntityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [ancestors, setAncestors] = useState<Entity[]>([]);
  const [children, setChildren] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [imageZoom, setImageZoom] = useState(false);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);
    setLoading(true);
    setLoadError('');

    Promise.all([
      api.getEntityById(numId),
      api.getAncestors(numId),
      api.getEntities({ parent_id: String(numId) }),
    ])
      .then(([entityData, ancestorsData, childrenData]) => {
        setEntity(entityData);
        setAncestors(ancestorsData);
        setChildren(childrenData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки сущности:', err);
        setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки сущности');
        setLoading(false);
      });
  }, [id]);

  const handleDeleteConfirm = async (recursive: boolean) => {
    if (!entity) return;
    try {
      await api.deleteEntity(entity.id, recursive);
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  if (loading) return <p>Загрузка...</p>;
  if (loadError) return (
    <div className="entity-detail__error">
      <p className="entity-detail__error-text">Ошибка: {loadError}</p>
      <Button onClick={() => navigate('/')}>На главную</Button>
    </div>
  );
  if (!entity) return <p>Сущность не найдена</p>;

  const typeClass = entity.type.replace(/\s+/g, '-');

  return (
    <div className="entity-detail">
      <Breadcrumbs ancestors={ancestors} />

      <div className="entity-detail__header">
        {entity.image_url && (
          <img
            src={entity.image_url}
            alt={entity.name}
            className="entity-detail__image"
            onClick={() => setImageZoom(true)}
          />
        )}
        <div className="entity-detail__header-text">
          <h2 className="entity-detail__title">{entity.name}</h2>
          <div className="entity-detail__meta">
          <span className={`type-badge type-badge--${typeClass}`}>{entity.type}</span>
          <span className={`importance-badge importance-badge--${entity.importance.replace(/\s+/g, '-')}`}>
            {entity.importance}
          </span>
          <span className="entity-detail__date">
            Создано: {formatDate(entity.created_at)}
          </span>
        </div>
        </div>
      </div>

      <div className="entity-detail__actions">
        <Button variant="primary" onClick={() => navigate(`/edit/${entity.id}`)}>
          Редактировать
        </Button>
        <Button variant="danger" onClick={() => { setDeleteTarget(true); setDeleteError(''); }}>
          Удалить
        </Button>
        <Button onClick={() => navigate('/')}>Назад</Button>
      </div>

      {entity.description && (
        <div className="entity-detail__section">
          <h3 className="entity-detail__section-title">Описание</h3>
          <div className="entity-detail__description">{entity.description}</div>
        </div>
      )}

      <div className="entity-detail__section">
        <h3 className="entity-detail__section-title">Атрибуты</h3>
        <AttributeEditor entityId={entity.id} initialAttributes={entity.attributes || []} />
      </div>

      <div className="entity-detail__section">
        <h3 className="entity-detail__section-title">Связи</h3>
        <RelationEditor entityId={entity.id} />
      </div>

      {children.length > 0 && (
        <div className="entity-detail__section">
          <h3 className="entity-detail__section-title">
            Дочерние сущности ({children.length})
          </h3>
          <div className="entity-detail__children">
            {children.map((child) => {
              const childTypeClass = child.type.replace(/\s+/g, '-');
              return (
                <div key={child.id} className="entity-detail__child">
                  <span className={`type-badge type-badge--${childTypeClass}`}>
                    {child.type}
                  </span>
                  <Link to={`/entity/${child.id}`}>{child.name}</Link>
                  {child.children_count && parseInt(String(child.children_count), 10) > 0 && (
                    <span className="entity-node__count">({child.children_count})</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {imageZoom && entity.image_url && (
        <div className="modal-overlay" onClick={() => setImageZoom(false)}>
          <div className="image-zoom" onClick={(e) => e.stopPropagation()}>
            <button
              className="image-zoom__close"
              onClick={() => setImageZoom(false)}
              aria-label="Закрыть"
            >
              {'\u2715'}
            </button>
            <img src={entity.image_url} alt={entity.name} className="image-zoom__img" />
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Удаление сущности</h3>
            <p>Удалить «{entity.name}»?</p>
            {deleteError ? (
              <div className="modal__error">{deleteError}</div>
            ) : (
              <p className="modal__hint">
                {children.length > 0
                  ? `У этой сущности есть дочерние элементы (${children.length}). Удалить рекурсивно вместе со всеми потомками?`
                  : 'Это действие нельзя отменить.'}
              </p>
            )}
            <div className="modal__actions">
              {deleteError && children.length > 0 ? (
                <Button variant="danger" onClick={() => handleDeleteConfirm(true)}>
                  Удалить рекурсивно
                </Button>
              ) : (
                <Button variant="danger" onClick={() => handleDeleteConfirm(false)}>
                  Удалить
                </Button>
              )}
              <Button onClick={() => setDeleteTarget(false)}>Отмена</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
