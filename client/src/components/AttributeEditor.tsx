import { useState } from 'react';
import { Attribute } from '../types';
import { api } from '../api/client';
import { Button } from './Button';

interface AttributeEditorProps {
  entityId: number;
  initialAttributes: Attribute[];
}

export function AttributeEditor({ entityId, initialAttributes }: AttributeEditorProps) {
  const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!newKey.trim() || !newValue.trim()) {
      setError('Заполните и ключ, и значение');
      return;
    }
    try {
      setError('');
      const created = await api.addAttribute(entityId, newKey.trim(), newValue.trim());
      setAttributes([...attributes, created]);
      setNewKey('');
      setNewValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления');
    }
  };

  const handleDelete = async (attrId: number) => {
    try {
      await api.deleteAttribute(entityId, attrId);
      setAttributes(attributes.filter((a) => a.id !== attrId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const startEdit = (attr: Attribute) => {
    setEditingId(attr.id);
    setEditKey(attr.attr_key);
    setEditValue(attr.attr_value);
  };

  const saveEdit = async () => {
    if (!editingId || !editKey.trim() || !editValue.trim()) return;
    try {
      const updated = await api.updateAttribute(entityId, editingId, editKey.trim(), editValue.trim());
      setAttributes(attributes.map((a) => (a.id === editingId ? updated : a)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления');
    }
  };

  return (
    <div className="attribute-editor">
      {attributes.length > 0 && (
        <div className="attribute-editor__list">
          {attributes.map((attr) => (
            <div key={attr.id} className="attribute-editor__row">
              {editingId === attr.id ? (
                <>
                  <input
                    className="input"
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder="Ключ"
                  />
                  <input
                    className="input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Значение"
                  />
                  <Button variant="primary" onClick={saveEdit}>
                    ОК
                  </Button>
                  <Button variant="small" onClick={() => setEditingId(null)}>
                    Отмена
                  </Button>
                </>
              ) : (
                <>
                  <span className="attribute-editor__key">{attr.attr_key}</span>
                  <span className="attribute-editor__sep">:</span>
                  <span className="attribute-editor__value">{attr.attr_value}</span>
                  <button
                    className="btn btn--small"
                    onClick={() => startEdit(attr)}
                  >
                    Изм.
                  </button>
                  <button
                    className="btn btn--small btn--danger"
                    onClick={() => handleDelete(attr.id)}
                  >
                    Удал.
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="attribute-editor__add">
        <input
          className="input"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Ключ (напр. Сила)"
        />
        <input
          className="input"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Значение (напр. 14)"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button variant="primary" onClick={handleAdd}>
          + Добавить
        </Button>
      </div>

      {error && <p className="attribute-editor__error">{error}</p>}
    </div>
  );
}
