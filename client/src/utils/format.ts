export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU');
}

export const TYPE_COLORS: Record<string, string> = {
  'Мир': '#c9a96e',
  'Локация': '#6ab0a0',
  'Персонаж': '#d68b6e',
  'Предмет': '#a8a8a8',
  'Квест': '#e8c668',
  'Организация': '#b88dd6',
  'Заклинание': '#6e9ed6',
};

export const IMPORTANCE_COLORS: Record<string, string> = {
  'Низкая': '#8a8478',
  'Средняя': '#c9a96e',
  'Высокая': '#e8a44c',
  'Ключевая для сюжета': '#e85c5c',
};
