import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: 'var(--color-accent)', marginBottom: '12px' }}>
        404 — Страница не найдена
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px' }}>
        Запрошенная страница не существует.
      </p>
      <Link className="btn btn--primary" to="/">На главную</Link>
    </div>
  );
}
