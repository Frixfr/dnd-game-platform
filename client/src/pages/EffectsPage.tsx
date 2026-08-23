// client/src/pages/EffectsPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { CreateEffectModal } from '../components/ui/CreateEffectModal';
import { EditEffectModal } from '../components/ui/EditEffectModal';
import { Pagination } from '../components/ui/Pagination';
import { useEffectStore } from '../stores/effectStore';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useErrorHandler } from '../hooks/useErrorHandler';
import type { EffectType } from '../types';

type EffectFilter = 'all' | 'buff' | 'debuff' | 'instant';
type SortKey = 'name' | 'attribute' | 'modifier' | 'duration';
type SortDir = 'asc' | 'desc';

const attributeLabels: Record<string, string> = {
  health: 'Здоровье',
  max_health: 'Макс. здоровье',
  armor: 'Броня',
  strength: 'Сила',
  agility: 'Ловкость',
  intelligence: 'Интеллект',
  physique: 'Телосложение',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
};

// Числовой ранг длительности только для сортировки (дни весомее ходов)
const durationRank = (effect: EffectType): number => {
  if (effect.is_instant) return Number.POSITIVE_INFINITY;
  if (effect.is_permanent) return Number.POSITIVE_INFINITY - 1;
  return (effect.duration_turns ?? 0) + (effect.duration_days ?? 0) * 10;
};

const formatDuration = (effect: EffectType): string => {
  if (effect.is_instant) return '⚡ Мгновенный';
  if (effect.is_permanent) return '∞ Постоянный';

  const turns = effect.duration_turns ?? 0;
  const days = effect.duration_days ?? 0;

  if (turns > 0 || days > 0) {
    const parts: string[] = [];
    if (turns > 0) parts.push(`${turns} ход${turns === 1 ? '' : turns < 5 ? 'а' : 'ов'}`);
    if (days > 0) parts.push(`${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`);
    return parts.join(' / ');
  }

  return 'Без длительности';
};

export const EffectsPage = () => {
  const {
    effects,
    effectsTotal,
    currentPage,
    limit,
    fetchEffects,
    initializeSocket,
  } = useEffectStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState<EffectType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [effectToDelete, setEffectToDelete] = useState<EffectType | null>(null);
  const [filter, setFilter] = useState<EffectFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const { showError } = useErrorHandler();

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchEffects(currentPage, limit);
      setLoading(false);
    };
    load();
  }, [currentPage, limit, fetchEffects]);

  const handleEffectClick = (effect: EffectType) => {
    setSelectedEffect(effect);
    setIsEditModalOpen(true);
  };

  const handleDeleteEffect = (effect: EffectType) => {
    setEffectToDelete(effect);
    setShowConfirmModal(true);
  };

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedFilteredEffects = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const matched = effects.filter(effect => (
      effect.name.toLowerCase().includes(term) ||
      (effect.description?.toLowerCase().includes(term)) ||
      effect.tags.some(tag => tag.toLowerCase().includes(term))
    ));

    const filtered = matched.filter(effect => {
      if (filter === 'buff') return effect.modifier > 0 && !effect.is_instant;
      if (filter === 'debuff') return effect.modifier < 0 && !effect.is_instant;
      if (filter === 'instant') return effect.is_instant === true;
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'ru');
          break;
        case 'attribute':
          cmp = (attributeLabels[a.attribute ?? ''] ?? a.attribute ?? '').localeCompare(
            attributeLabels[b.attribute ?? ''] ?? b.attribute ?? '',
            'ru',
          );
          break;
        case 'modifier':
          cmp = a.modifier - b.modifier;
          break;
        case 'duration':
          cmp = durationRank(a) - durationRank(b);
          break;
      }
      return cmp * dir;
    });

    return sorted;
  }, [effects, searchTerm, filter, sortKey, sortDir]);

  const confirmDelete = async () => {
    if (!effectToDelete) return;
    try {
      const response = await fetch(`/api/effects/${effectToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
    } catch (error) {
      console.error(error);
      showError('Не удалось удалить эффект');
    } finally {
      setShowConfirmModal(false);
      setEffectToDelete(null);
    }
  };

  const totalPages = Math.ceil(effectsTotal / limit);

  const filterOptions: { value: EffectFilter; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'buff', label: 'Баффы' },
    { value: 'debuff', label: 'Дебаффы' },
    { value: 'instant', label: '⚡ Мгновенные' },
  ];

  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '');

  const thSortable = (key: SortKey, label: string) => (
    <th
      onClick={() => toggleSort(key)}
      className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs cursor-pointer hover:text-[var(--text-accent)] transition-colors select-none"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-[var(--text-accent)]">{sortIndicator(key)}</span>
      </span>
    </th>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Панель эффектов</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Всего эффектов: <span className="font-semibold">{effectsTotal}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Поиск по названию, описанию или тегу..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 form-input"
          />
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 btn-primary w-full sm:w-auto"
          >
            + Создать эффект
          </button>
        </div>
      </div>

      {/* Фильтр-бар */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === opt.value
                ? 'bg-[#FF0026] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--color-bg-secondary)] border border-[var(--border-color)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-primary)]"></div>
          <p className="mt-2 text-[var(--text-secondary)]">Загрузка эффектов...</p>
        </div>
      ) : sortedFilteredEffects.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)] card">
          {effects.length === 0
            ? "Нет созданных эффектов. Нажмите кнопку выше для создания первого."
            : "Ничего не найдено по вашему запросу."}
        </div>
      ) : (
        <>
          <div className="rounded-[var(--radius-xl)] border border-[var(--border-color)] [background:var(--gradient-card)] shadow-[var(--shadow-md)] overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-secondary)]">
                <tr>
                  {thSortable('name', 'Название')}
                  {thSortable('attribute', 'Атрибут')}
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs">Тип</th>
                  {thSortable('modifier', 'Модиф.')}
                  {thSortable('duration', 'Длительность')}
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wide text-xs hidden md:table-cell">Теги</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredEffects.map((effect) => {
                  const isBuff = effect.modifier > 0 && !effect.is_instant;
                  const isDebuff = effect.modifier < 0 && !effect.is_instant;
                  const isInstant = effect.is_instant === true;
                  const modifierColor = isBuff
                    ? 'text-[#10b981]'
                    : isDebuff
                      ? 'text-[#FF0026]'
                      : isInstant
                        ? 'text-amber-400'
                        : 'text-[var(--text-muted)]';
                  return (
                    <tr
                      key={effect.id}
                      onClick={() => handleEffectClick(effect)}
                      className="border-t border-[var(--border-color)] hover:bg-[var(--color-bg-card-hover)] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                        <div className="flex items-center gap-2">
                          {isInstant && <span className="text-amber-400" title="Мгновенный">⚡</span>}
                          <span>{effect.name}</span>
                          <span className="text-xs text-[var(--text-muted)]">#{effect.id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {effect.attribute ? (
                          <span className="inline-flex items-center gap-1">
                            <span>📊</span>
                            {attributeLabels[effect.attribute] || effect.attribute}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isInstant ? (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-400/20 text-amber-400">Мгновенный</span>
                        ) : isBuff ? (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-[#10b981]/20 text-[#10b981]">Бафф</span>
                        ) : isDebuff ? (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-[#FF0026]/20 text-[#FF0026]">Дебафф</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-[var(--color-bg-tertiary)] text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 font-bold ${modifierColor}`}>
                        {effect.modifier > 0 ? '+' : ''}{effect.modifier}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {formatDuration(effect)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {effect.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {effect.tags.map(tag => (
                              <span key={tag} className="inline-block px-2 py-0.5 text-xs bg-[var(--color-bg-secondary)] text-[var(--text-secondary)] rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEffect(effect);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FF0026] hover:bg-[#FF0026]/10 rounded-full transition-colors text-xl font-bold"
                          title="Удалить"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => fetchEffects(page, limit)}
          />
        </>
      )}

      {isCreateModalOpen && (
        <CreateEffectModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {isEditModalOpen && selectedEffect && (
        <EditEffectModal
          effect={selectedEffect}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEffect(null);
          }}
          onEffectUpdated={() => {
            setIsEditModalOpen(false);
            setSelectedEffect(null);
            fetchEffects(currentPage, limit);
          }}
          mode="edit"
        />
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        message={`Удалить эффект "${effectToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setEffectToDelete(null);
        }}
      />
    </div>
  );
};

export default EffectsPage;