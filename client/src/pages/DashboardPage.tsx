import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Stats, IMPORTANCE_LEVELS } from '../types';
import { api } from '../api/client';
import { formatDate, TYPE_COLORS, IMPORTANCE_COLORS } from '../utils/format';

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getStats()
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки статистики:', err);
        setLoadError(err instanceof Error ? err.message : 'Ошибка загрузки статистики');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Загрузка...</p>;
  }

  if (loadError || !stats) {
    return (
      <div className="dashboard">
        <p className="dashboard__error">Ошибка: {loadError || 'Не удалось загрузить данные'}</p>
        <Link className="btn btn--primary" to="/">На главную</Link>
      </div>
    );
  }

  const maxTypeCount = Math.max(...stats.by_type.map((t) => t.count), 1);
  const maxImportanceCount = Math.max(...stats.by_importance.map((t) => t.count), 1);

  return (
    <div className="dashboard">
      <h2 className="entity-editor-page__title">Статистика мира</h2>

      <div className="dashboard__cards">
        <div className="dashboard__card">
          <div className="dashboard__card-value">{stats.total_entities}</div>
          <div className="dashboard__card-label">Сущностей</div>
        </div>
        <div className="dashboard__card">
          <div className="dashboard__card-value">{stats.total_attributes}</div>
          <div className="dashboard__card-label">Атрибутов</div>
        </div>
        <div className="dashboard__card">
          <div className="dashboard__card-value">{stats.by_type.length}</div>
          <div className="dashboard__card-label">Типов</div>
        </div>
      </div>

      <div className="dashboard__section">
        <h3 className="dashboard__section-title">Распределение по типам</h3>
        {stats.by_type.map((item) => {
          const color = TYPE_COLORS[item.type] || '#999';
          const pct = (item.count / maxTypeCount) * 100;
          return (
            <div key={item.type} className="dashboard__bar-row">
              <span className="dashboard__bar-label">{item.type}</span>
              <div className="dashboard__bar-track">
                <div
                  className="dashboard__bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                >
                  {item.count}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard__section">
        <h3 className="dashboard__section-title">Распределение по важности</h3>
        {IMPORTANCE_LEVELS.map((level) => {
          const item = stats.by_importance.find((i) => i.importance === level);
          const count = item?.count || 0;
          const color = IMPORTANCE_COLORS[level] || '#999';
          const pct = (count / maxImportanceCount) * 100;
          return (
            <div key={level} className="dashboard__bar-row">
              <span className="dashboard__bar-label">{level}</span>
              <div className="dashboard__bar-track">
                <div
                  className="dashboard__bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                >
                  {count}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dashboard__section">
        <h3 className="dashboard__section-title">Недавно созданные</h3>
        <div className="dashboard__recent">
          {stats.recent.map((entity) => {
            const typeClass = entity.type.replace(/\s+/g, '-');
            return (
              <div key={entity.id} className="dashboard__recent-row">
                <span className={`type-badge type-badge--${typeClass}`}>
                  {entity.type}
                </span>
                <span className="dashboard__recent-name">
                  <Link to={`/entity/${entity.id}`}>{entity.name}</Link>
                </span>
                <span className="dashboard__recent-date">
                  {formatDate(entity.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
