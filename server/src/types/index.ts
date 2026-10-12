// Общие типы для сущностей и атрибутов

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

export interface CreateEntityDTO {
  name: string;
  type: string;
  parent_id: number | null;
  description?: string;
  importance?: string;
}

export interface UpdateEntityDTO {
  name?: string;
  type?: string;
  parent_id?: number | null;
  description?: string;
  importance?: string;
}

export interface EntityFilters {
  type?: string;
  importance?: string;
  date_from?: string;
  date_to?: string;
  parent_id?: string;
  search?: string;
  page?: string;
  limit?: string;
}
