// client/src/components/ui/NpcStatsForm.tsx
import type { NpcType, RaceType } from '../../types';

interface NpcStatsFormProps {
  formData: NpcType;
  setFormData: (data: NpcType) => void;
  races: RaceType[];
  loading: boolean;
  uploadingAvatar: boolean;
  avatarPreview: string | null;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarDelete: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  deleting: boolean;
  onClose?: () => void; // добавим опционально для кнопки отмены
}

const statFields = ['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as const;

export const NpcStatsForm = ({
  formData,
  setFormData,
  races,
  loading,
  uploadingAvatar,
  avatarPreview,
  onAvatarChange,
  onAvatarDelete,
  onSubmit,
  onDelete,
  deleting,
  onClose,
}: NpcStatsFormProps) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const numericFields = ['health', 'max_health', 'armor', 'strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma', 'aggression'];
    if (numericFields.includes(name)) {
      setFormData({ ...formData, [name]: value === '' ? 0 : parseInt(value, 10) || 0 });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 md:space-y-6">
      {/* Блок персонажа */}
      <div className="card p-4 md:p-5">
        <h3 className="text-md font-semibold text-text-primary mb-4 flex items-center gap-2">👾 NPC</h3>
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Аватарка */}
          <div className="flex flex-col items-center gap-3 flex-shrink-0">
            <div className="w-24 h-24 rounded-full bg-bg-secondary flex items-center justify-center overflow-hidden border-2 border-border-color shadow-md">
              {avatarPreview ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-4xl text-text-secondary">👤</span>}
            </div>
            <div className="flex flex-col gap-2 w-full">
              <label className="cursor-pointer text-xs btn-secondary px-3 py-1.5 text-center rounded-lg transition hover:shadow-md">
                Загрузить
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={loading || uploadingAvatar} />
              </label>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={onAvatarDelete}
                  disabled={loading || uploadingAvatar}
                  className="text-xs px-3 py-1.5 rounded-lg border border-accent-red/30 text-accent-red hover:bg-accent-red/10 transition disabled:opacity-50"
                >
                  Удалить
                </button>
              )}
            </div>
            {uploadingAvatar && <span className="text-xs text-text-secondary">Загрузка...</span>}
          </div>

          {/* Поля ввода */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Имя *</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-input" required disabled={loading} />
            </div>
            <div>
              <label className="form-label">Пол</label>
              <select name="gender" value={formData.gender} onChange={handleInputChange} className="form-select" disabled={loading}>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
            <div>
              <label className="form-label">Раса</label>
              <select
                value={formData.race_id || ''}
                onChange={(e) => setFormData({ ...formData, race_id: e.target.value ? Number(e.target.value) : null })}
                className="form-select"
              >
                <option value="">Нет</option>
                {races.map(race => (
                  <option key={race.id} value={race.id}>{race.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Агрессия</label>
              <select name="aggression" value={formData.aggression} onChange={handleInputChange} className="form-select" disabled={loading}>
                <option value={0}>😌 Мирный</option>
                <option value={1}>😐 Нейтральный</option>
                <option value={2}>😠 Агрессивный</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Здоровье и броня */}
      <div className="card p-4 md:p-5">
        <h3 className="text-md font-semibold text-text-primary mb-4">🛡️ Защита и здоровье</h3>
        {/* Прогресс бар здоровья */}
        <div className="mb-5 p-4 bg-bg-tertiary rounded-xl border border-border-color">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-text-secondary flex items-center gap-1">❤️ Здоровье</span>
            <span className="font-semibold text-text-primary">{formData.health} / {formData.max_health}</span>
          </div>
          <div className="h-4 bg-bg-secondary rounded-full overflow-hidden border border-border-color shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-300 shadow-sm" 
              style={{ width: `${Math.min((formData.health / formData.max_health) * 100, 100)}%` }} 
            />
          </div>
        </div>
        
        {/* Поля ввода здоровья и брони */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Текущее здоровье</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500">❤️</span>
              <input type="number" name="health" value={formData.health} onChange={handleInputChange} min="0" max={formData.max_health} className="form-input pl-10" disabled={loading} />
            </div>
          </div>
          <div>
            <label className="form-label">Макс. здоровье</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400">❤️</span>
              <input type="number" name="max_health" value={formData.max_health} onChange={handleInputChange} min="1" className="form-input pl-10" disabled={loading} />
            </div>
          </div>
          <div>
            <label className="form-label">Класс брони (AC)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">🛡️</span>
              <input type="number" name="armor" value={formData.armor} onChange={handleInputChange} min="0" className="form-input pl-10" disabled={loading} />
            </div>
          </div>
        </div>
      </div>

      {/* Характеристики */}
      <div className="card p-4 md:p-5">
        <h3 className="text-md font-semibold text-text-primary mb-4">⚔️ Характеристики</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {statFields.map(stat => {
            const labels: Record<string, string> = { 
              strength: '💪 Сила (STR)', 
              agility: '🏃 Ловкость (DEX)', 
              intelligence: '📚 Интеллект (INT)', 
              physique: '💪 Телосложение (CON)', 
              wisdom: '🦉 Мудрость (WIS)', 
              charisma: '✨ Харизма (CHA)' 
            };
            return (
              <div key={stat}>
                <label className="form-label">{labels[stat]}</label>
                <input type="number" name={stat} value={formData[stat]} onChange={handleInputChange} className="form-input" disabled={loading} />
              </div>
            );
          })}
        </div>
      </div>

      {/* История */}
      <div className="card p-4 md:p-5">
        <h3 className="text-md font-semibold text-text-primary mb-3">📜 История</h3>
        <textarea name="history" rows={4} value={formData.history || ''} onChange={handleInputChange} className="form-textarea resize-none" disabled={loading} />
      </div>

      {/* Кнопки */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t border-border-color">
        <button type="button" onClick={onDelete} className="w-full sm:w-auto px-4 py-2 btn-danger" disabled={loading || deleting}>{deleting ? 'Удаление...' : '🗑️ Удалить NPC'}</button>
        <div className="flex gap-3 w-full sm:w-auto">
          <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-4 py-2 btn-secondary" disabled={loading}>Отмена</button>
          <button type="submit" className="flex-1 sm:flex-none px-4 py-2 btn-primary" disabled={loading}>{loading ? 'Сохранение...' : '💾 Сохранить'}</button>
        </div>
      </div>
    </form>
  );
};