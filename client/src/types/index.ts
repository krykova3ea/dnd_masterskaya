export type EntityType =
  | 'Мир'
  | 'Локация'
  | 'Персонаж'
  | 'Предмет'
  | 'Квест'
  | 'Организация'
  | 'Заклинание'
  | string;

export type Importance =
  | 'Низкая'
  | 'Средняя'
  | 'Высокая'
  | 'Ключевая для сюжета';

export interface Attribute {
  id: number;
  entity_id: number;
  attr_key: string;
  attr_value: string;
}

export interface Entity {
  id: number;
  name: string;
  type: EntityType;
  parent_id: number | null;
  description: string | null;
  importance: Importance;
  image_url: string | null;
  created_at: string;
  attributes?: Attribute[];
  children_count?: number;
}

export interface EntityFilters {
  type?: string;
  importance?: string;
  date_from?: string;
  date_to?: string;
  parent_id?: string;
  search?: string;
}

export const ENTITY_TYPES: string[] = [
  'Мир',
  'Локация',
  'Персонаж',
  'Предмет',
  'Квест',
  'Организация',
  'Заклинание',
];

export const IMPORTANCE_LEVELS: string[] = [
  'Низкая',
  'Средняя',
  'Высокая',
  'Ключевая для сюжета',
];

export const RELATION_TYPES: string[] = [
  'член',
  'владеет',
  'союзник',
  'враг',
  'находится в',
  'работает в',
  'создатель',
  'учитель',
];

export interface Relation {
  id: number;
  source_id: number;
  target_id: number;
  relation_type: string;
  description: string | null;
  created_at: string;
  source_name?: string;
  source_type?: string;
  target_name?: string;
  target_type?: string;
  direction?: 'outgoing' | 'incoming';
}

export interface Stats {
  total_entities: number;
  total_attributes: number;
  by_type: { type: string; count: number }[];
  by_importance: { importance: string; count: number }[];
  recent: Entity[];
}
