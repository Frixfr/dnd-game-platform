// client/src/components/ui/PlayerStatsForm.tsx
import type { PlayerType, RaceType } from '../../types';

interface PlayerStatsFormProps {
  formData: PlayerType;
  setFormData: React.Dispatch<React.SetStateAction<PlayerType>>;
  races: RaceType[];
  loading: boolean;
  uploadingAvatar: boolean;
  avatarPreview: string | null;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarDelete: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  deleting: boolean;
}

const statFields = ['strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'] as const;

export const PlayerStatsForm = ({
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
}: PlayerStatsFormProps) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const numericFields = ['health', 'max_health', 'armor', 'strength', 'agility', 'intelligence', 'physique', 'wisdom', 'charisma'];
    if (numericFields.includes(name)) {
      setFormData({ ...formData, [name]: value === '' ? 0 : parseInt(value, 10) || 0 });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">

      <div className="bg-gray-50 rounded-xl p-4 md:p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">🧑‍🎤 Персона</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {avatarPreview ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-3xl text-gray-400">👤</span>}
            </div>
            <div className="flex gap-2">
              <label className="cursor-pointer text-xs bg-white px-2 py-1 rounded border text-gray-600">
                Загрузить
                <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={loading || uploadingAvatar} />
              </label>
              {avatarPreview && (
                <button
                  type="button"
                  onClick={onAvatarDelete}
                  disabled={loading || uploadingAvatar}
                  className="text-xs bg-red-50 px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-100"
                >
                  Удалить
                </button>
              )}
            </div>
            {uploadingAvatar && <span className="text-xs text-gray-500">Загрузка...</span>}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" required disabled={loading} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Пол</label><select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" disabled={loading}><option value="male">Мужской</option><option value="female">Женский</option></select></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Раса</label>
              <select
                value={formData.race_id || ''}
                onChange={(e) => setFormData({ ...formData, race_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 border rounded-xl"
              >
                <option value="">Нет</option>
                {races.map(race => (
                  <option key={race.id} value={race.id}>{race.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль доступа</label>
              <input
                type="password"
                name="access_password"
                value={formData.access_password || ''}
                onChange={handleInputChange}
                placeholder="Оставьте пустым для открытого доступа"
                className="w-full px-3 py-2 border rounded-xl"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Игрок сможет войти, введя этот пароль</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 md:p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3">🛡️ Защита и здоровье</h3>
        <div className="mb-4"><div className="flex justify-between text-sm text-gray-600 mb-1"><span>❤️ Здоровье</span><span className="font-medium">{formData.health} / {formData.max_health}</span></div><div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all duration-300" style={{ width: `${(formData.health / formData.max_health) * 100}%` }} /></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Текущее здоровье</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500">❤️</span><input type="number" name="health" value={formData.health} onChange={handleInputChange} min="0" max={formData.max_health} className="w-full pl-8 pr-3 py-2 border rounded-xl" disabled={loading} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Макс. здоровье</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400">❤️</span><input type="number" name="max_health" value={formData.max_health} onChange={handleInputChange} min="1" className="w-full pl-8 pr-3 py-2 border rounded-xl" disabled={loading} /></div></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Класс брони (AC)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500">🛡️</span><input type="number" name="armor" value={formData.armor} onChange={handleInputChange} min="0" className="w-full pl-8 pr-3 py-2 border rounded-xl" disabled={loading} /></div></div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 md:p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3">⚔️ Характеристики</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {statFields.map(stat => {
            const labels: Record<string, string> = { strength: 'Сила (STR)', agility: 'Ловкость (DEX)', intelligence: 'Интеллект (INT)', physique: 'Телосложение (CON)', wisdom: 'Мудрость (WIS)', charisma: 'Харизма (CHA)' };
            return <div key={stat}><label className="block text-sm font-medium text-gray-700 mb-1">{labels[stat]}</label><input type="number" name={stat} value={formData[stat]} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl" disabled={loading} /></div>;
          })}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 md:p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3">📜 История</h3>
        <textarea name="history" rows={3} value={formData.history || ''} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-xl resize-none" disabled={loading} />
      </div>

      <div className="bg-gray-50 rounded-xl p-4 md:p-5 border border-gray-100">
        <h3 className="text-md font-semibold text-gray-700 mb-3">🏷️ Статусы</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2"><input type="checkbox" name="in_battle" checked={formData.in_battle} onChange={handleInputChange} className="w-4 h-4" disabled={loading} />⚔️ В бою</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_online" checked={formData.is_online} onChange={handleInputChange} className="w-4 h-4" disabled={loading} />🟢 Онлайн</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_card_shown" checked={formData.is_card_shown} onChange={handleInputChange} className="w-4 h-4" disabled={loading} />🃏 Показывать карточку</label>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 pt-4 border-t">
        <button type="button" onClick={onDelete} className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50" disabled={loading || deleting}>{deleting ? 'Удаление...' : '🗑️ Удалить игрока'}</button>
        <div className="flex gap-3 w-full sm:w-auto">
          <button type="button" onClick={() => {}} className="flex-1 sm:flex-none px-4 py-2 border rounded-xl hover:bg-gray-50" disabled={loading}>Отмена</button>
          <button type="submit" className="flex-1 sm:flex-none px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600" disabled={loading}>{loading ? 'Сохранение...' : '💾 Сохранить'}</button>
        </div>
      </div>
    </form>
  );
};