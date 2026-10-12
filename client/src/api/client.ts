import { Entity, Attribute, EntityFilters, Relation, Stats } from '../types';

const BASE_URL = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) message = data.error;
    } catch {
      // ответ не в формате JSON
    }
    throw new Error(message);
  }

  const data = await res.json();
  return data as T;
}

export const api = {
  // Сущности
  getEntities: (filters?: EntityFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    const query = params.toString();
    return request<Entity[]>(`${BASE_URL}/entities${query ? '?' + query : ''}`);
  },

  getEntityById: (id: number) =>
    request<Entity>(`${BASE_URL}/entities/${id}`),

  createEntity: (data: Partial<Entity>) =>
    request<Entity>(`${BASE_URL}/entities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEntity: (id: number, data: Partial<Entity>) =>
    request<Entity>(`${BASE_URL}/entities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEntity: (id: number, recursive = false) =>
    request<{ message?: string; error?: string; children_count?: number }>(
      `${BASE_URL}/entities/${id}${recursive ? '?recursive=true' : ''}`,
      { method: 'DELETE' }
    ),

  // Атрибуты
  addAttribute: (entityId: number, attr_key: string, attr_value: string) =>
    request<Attribute>(`${BASE_URL}/entities/${entityId}/attributes`, {
      method: 'POST',
      body: JSON.stringify({ attr_key, attr_value }),
    }),

  updateAttribute: (entityId: number, attrId: number, attr_key: string, attr_value: string) =>
    request<Attribute>(`${BASE_URL}/entities/${entityId}/attributes/${attrId}`, {
      method: 'PUT',
      body: JSON.stringify({ attr_key, attr_value }),
    }),

  deleteAttribute: (entityId: number, attrId: number) =>
    request<{ message: string }>(`${BASE_URL}/entities/${entityId}/attributes/${attrId}`, {
      method: 'DELETE',
    }),

  // Экспорт / импорт
  exportData: () =>
    request<{ entities: Entity[]; attributes: Attribute[]; relations: Relation[]; exported_at: string }>(
      `${BASE_URL}/export`
    ),

  importData: (data: { entities: unknown[]; attributes: unknown[]; relations?: unknown[] }) =>
    request<{ message: string; entities_count: number; attributes_count: number; relations_count: number }>(
      `${BASE_URL}/import`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  // Статистика
  getStats: () =>
    request<Stats>(`${BASE_URL}/stats`),

  // Предки сущности (хлебные крошки)
  getAncestors: (id: number) =>
    request<Entity[]>(`${BASE_URL}/entities/${id}/ancestors`),

  // Связи
  getRelations: (entityId: number) =>
    request<Relation[]>(`${BASE_URL}/entities/${entityId}/relations`),

  addRelation: (sourceId: number, targetId: number, relationType: string, description?: string) =>
    request<Relation>(`${BASE_URL}/entities/${sourceId}/relations`, {
      method: 'POST',
      body: JSON.stringify({ target_id: targetId, relation_type: relationType, description }),
    }),

  deleteRelation: (relationId: number) =>
    request<{ message: string }>(`${BASE_URL}/relations/${relationId}`, {
      method: 'DELETE',
    }),

  // Изображения
  uploadImage: async (entityId: number, file: File): Promise<{ image_url: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${BASE_URL}/entities/${entityId}/image`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        if (data.error) message = data.error;
      } catch {
        // ответ не в формате JSON
      }
      throw new Error(message);
    }
    const data = await res.json();
    return data as { image_url: string };
  },

  deleteImage: (entityId: number) =>
    request<{ message: string }>(`${BASE_URL}/entities/${entityId}/image`, {
      method: 'DELETE',
    }),
};
