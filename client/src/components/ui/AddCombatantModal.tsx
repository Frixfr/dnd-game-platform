// client/src/components/ui/AddCombatantModal.tsx
import React, { useState } from 'react';
import Modal from './Modal';
import type { PlayerType, NpcType } from '../../types';
import { Shield, Heart, Users, Swords, Search } from 'lucide-react';

interface AddCombatantModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlayers: PlayerType[];
  availableNpcs: NpcType[];
  onAddPlayer: (playerId: number) => void;
  onAddNpc: (npcId: number) => void;
}

type TabType = 'players' | 'npcs';

const AddCombatantModal: React.FC<AddCombatantModalProps> = ({
  isOpen,
  onClose,
  availablePlayers,
  availableNpcs,
  onAddPlayer,
  onAddNpc,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('players');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredPlayers = availablePlayers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredNpcs = availableNpcs.filter(n =>
    n.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = (type: TabType, entityId: number) => {
    if (type === 'players') {
      onAddPlayer(entityId);
    } else {
      onAddNpc(entityId);
    }
    onClose();
  };

  return (
    <Modal title="➕ Добавить участника" onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex flex-col gap-4">
        {/* Поиск */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F2E9E4]/60" />
          <input
            type="text"
            placeholder="Поиск по имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[#F2E9E4]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0026] bg-[#0A1F44] text-[#F2E9E4]"
          />
        </div>

        {/* Вкладки */}
        <div className="flex border-b border-[#F2E9E4]/20">
          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
              activeTab === 'players'
                ? 'text-[#FF0026] border-b-2 border-[#FF0026]'
                : 'text-[#F2E9E4]/60 hover:text-[#F2E9E4]'
            }`}
          >
            <Users size={18} />
            Игроки ({availablePlayers.length})
          </button>
          <button
            onClick={() => setActiveTab('npcs')}
            className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
              activeTab === 'npcs'
                ? 'text-[#FF0026] border-b-2 border-[#FF0026]'
                : 'text-[#F2E9E4]/60 hover:text-[#F2E9E4]'
            }`}
          >
            <Swords size={18} />
            NPC ({availableNpcs.length})
          </button>
        </div>

        {/* Список сущностей */}
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {activeTab === 'players' && (
            filteredPlayers.length === 0 ? (
              <div className="text-center py-8 text-[#F2E9E4]/60">
                {search ? 'Ничего не найдено' : 'Нет доступных игроков'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => handleAdd('players', player.id)}
                    className="flex items-center gap-4 p-3 border border-[#F2E9E4]/20 rounded-lg hover:bg-[#0A1F44]/80 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-900 to-blue-800 flex items-center justify-center text-[#F2E9E4] font-bold text-lg overflow-hidden flex-shrink-0">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        player.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#F2E9E4] truncate">{player.name}</div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-[#F2E9E4]/60">
                        <span className="flex items-center gap-1">
                          <Heart size={14} className="text-red-500" />
                          {player.health}/{player.max_health}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield size={14} className="text-blue-400" />
                          {player.armor}
                        </span>
                      </div>
                    </div>
                    <button className="text-[#FF0026] hover:text-[#FF0026]/80 text-sm font-medium">
                      Добавить →
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'npcs' && (
            filteredNpcs.length === 0 ? (
              <div className="text-center py-8 text-[#F2E9E4]/60">
                {search ? 'Ничего не найдено' : 'Нет доступных NPC'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredNpcs.map((npc) => (
                  <div
                    key={npc.id}
                    onClick={() => handleAdd('npcs', npc.id)}
                    className="flex items-center gap-4 p-3 border border-[#F2E9E4]/20 rounded-lg hover:bg-[#0A1F44]/80 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-900 to-red-800 flex items-center justify-center text-[#F2E9E4] font-bold text-lg overflow-hidden flex-shrink-0">
                      {npc.avatar_url ? (
                        <img src={npc.avatar_url} alt={npc.name} className="w-full h-full object-cover" />
                      ) : (
                        npc.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#F2E9E4] truncate">{npc.name}</div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-[#F2E9E4]/60">
                        <span className="flex items-center gap-1">
                          <Heart size={14} className="text-red-500" />
                          {npc.health}/{npc.max_health}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield size={14} className="text-blue-400" />
                          {npc.armor}
                        </span>
                      </div>
                    </div>
                    <button className="text-[#FF0026] hover:text-[#FF0026]/80 text-sm font-medium">
                      Добавить →
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Кнопка закрытия внизу */}
        <div className="flex justify-end pt-3 border-t border-[#F2E9E4]/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#F2E9E4] hover:bg-[#0A1F44]/80 rounded-lg transition border border-[#F2E9E4]/30"
          >
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddCombatantModal;