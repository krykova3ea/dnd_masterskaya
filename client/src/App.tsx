import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { MainPage } from './pages/MainPage';
import { EntityEditorPage } from './pages/EntityEditorPage';
import { DashboardPage } from './pages/DashboardPage';
import { EntityDetailPage } from './pages/EntityDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="app">
          <header className="app__header">
            <h1 className="app__title">
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                {'\u2694'} D&D Мастерская
              </Link>
            </h1>
            <nav className="app__nav">
              <Link className="btn" to="/">Главная</Link>
              <Link className="btn" to="/dashboard">Дашборд</Link>
              <Link className="btn btn--primary" to="/new">+ Новая сущность</Link>
              <ThemeToggle />
            </nav>
          </header>
          <main>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/new" element={<EntityEditorPage />} />
              <Route path="/edit/:id" element={<EntityEditorPage />} />
              <Route path="/entity/:id" element={<EntityDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
