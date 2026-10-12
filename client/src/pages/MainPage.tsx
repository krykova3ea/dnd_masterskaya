import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Entity, EntityFilters } from '../types';
import { api } from '../api/client';
import { EntityTree } from '../components/EntityTree';
import { EntityList } from '../components/EntityList';
import { FilterPanel } from '../components/FilterPanel';
import { SearchBar } from '../components/SearchBar';
import { Button } from '../components/Button';

export function MainPage() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState<EntityFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Entity | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');

  // Refs для предотвращения stale closure в handleSearch
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const loadEntities = useCallback(async (activeFilters?: EntityFilters, search?: string) => {
    setLoading(true);
    setLoadError('');
    try {
      const mergedFilters = { ...activeFilters };
      if (search) mergedFilters.search = search;
      const data = await api.getEntities(mergedFilters);
      setEntities(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const handleApplyFilters = (newFilters: EntityFilters) => {
    setFilters(newFilters);
    loadEntities(newFilters, searchQueryRef.current);
  };

  const handleResetFilters = () => {
    setFilters({});
    loadEntities({}, searchQueryRef.current);
  };

  // M2 fix: используем ref для filters, чтобы callback не пересоздавался
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    loadEntities(filtersRef.current, query);
  }, [loadEntities]);

  const handleEdit = (entity: Entity) => {
    navigate(`/edit/${entity.id}`);
  };

  const handleDeleteClick = (entity: Entity) => {
    setDeleteTarget(entity);
    setDeleteError('');
  };

  const handleDeleteConfirm = async (recursive: boolean) => {
    if (!deleteTarget) return;
    try {
      await api.deleteEntity(deleteTarget.id, recursive);
      setDeleteTarget(null);
      loadEntities(filtersRef.current, searchQueryRef.current);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const hasActiveFilters = !!(filters.type || filters.importance || filters.date_from || filters.date_to || searchQuery);

  // M4 fix: проверяем наличие детей сразу, без ожидания ошибки от сервера
  const deleteHasChildren = !!(deleteTarget?.children_count && parseInt(String(deleteTarget.children_count), 10) > 0);

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dnd-workshop-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Ошибка экспорта');
    }
  };

  // B2 fix: подтверждение перед импортом
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportError('');
    }
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      await api.importData(data);
      setImportFile(null);
      loadEntities(filtersRef.current, searchQueryRef.current);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Неверный формат файла');
    }
  };

  return (
    <div className="main-page">
      <div className="main-page__top">
        <Button variant="primary" onClick={() => navigate('/new')}>
          + Новая сущность
        </Button>
        <Button onClick={handleExport}>
          Экспорт JSON
        </Button>
        <label className="btn">
          Импорт JSON
          <input
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportFileSelect}
          />
        </label>
        <span className="main-page__count">
          Всего: {entities.length}
        </span>
      </div>

      <SearchBar onSearch={handleSearch} />

      <FilterPanel onApply={handleApplyFilters} onReset={handleResetFilters} />

      {loadError && (
        <div className="entity-form__error" style={{ marginBottom: '16px' }}>
          {loadError}
        </div>
      )}

      {loading ? (
        <p className="main-page__loading">Загрузка...</p>
      ) : hasActiveFilters ? (
        <EntityList
          entities={entities}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      ) : (
        <EntityTree
          entities={entities}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Удаление сущности</h3>
            <p>
              Удалить «{deleteTarget.name}»?
            </p>
            {deleteError ? (
              <div className="modal__error">
                {deleteError}
              </div>
            ) : (
              <p className="modal__hint">
                {deleteHasChildren
                  ? `У этой сущности есть дочерние элементы. Удалить рекурсивно вместе со всеми потомками?`
                  : 'Это действие нельзя отменить.'}
              </p>
            )}
            <div className="modal__actions">
              <Button variant="danger" onClick={() => handleDeleteConfirm(deleteHasChildren)}>
                {deleteHasChildren ? 'Удалить рекурсивно' : 'Удалить'}
              </Button>
              <Button onClick={() => setDeleteTarget(null)}>Отмена</Button>
            </div>
          </div>
        </div>
      )}

      {importFile && (
        <div className="modal-overlay" onClick={() => setImportFile(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Импорт данных</h3>
            {importError ? (
              <div className="modal__error">{importError}</div>
            ) : (
              <>
                <p>
                  Импортировать данные из файла «{importFile.name}»?
                </p>
                <p className="modal__hint">
                  Внимание: все текущие данные будут заменены. Рекомендуется сначала сделать экспорт.
                </p>
              </>
            )}
            <div className="modal__actions">
              {!importError && (
                <Button variant="danger" onClick={handleImportConfirm}>
                  Импортировать
                </Button>
              )}
              <Button onClick={() => setImportFile(null)}>
                {importError ? 'Закрыть' : 'Отмена'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
