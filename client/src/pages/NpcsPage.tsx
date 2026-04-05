// client/src/pages/NpcsPage.tsx
import { useState, useEffect } from "react";
import { CreateNpcModal } from "../components/ui/CreateNpcModal";
import { EditNpcModal } from "../components/ui/EditNpcModal";
import { NpcCard } from "../components/ui/NpcCard";
import { useNpcStore } from "../stores/npcStore";
import type { NpcType } from "../types";

export const NpcsPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNpc, setSelectedNpc] = useState<NpcType | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { npcs, initializeSocket, fetchNpcs, socket } = useNpcStore();

  useEffect(() => {
    initializeSocket();
    fetchNpcs();
    return () => {
      if (socket) {
        socket.off("npc:updated");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNpcClick = async (npc: NpcType) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}/details`);
      if (!response.ok) throw new Error("Ошибка загрузки");
      const data = await response.json();
      setSelectedNpc(data.npc);
    } catch (error) {
      console.error(error);
      setSelectedNpc(npc);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteNpc = async (npc: NpcType) => {
    if (!confirm(`Удалить NPC "${npc.name}"?`)) return;
    try {
      const response = await fetch(`http://localhost:5000/api/npcs/${npc.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Ошибка удаления');
      // Обновляем список через стор
      fetchNpcs(); // или npcStore.removeNpc(npc.id)
    } catch (error) {
      console.error(error);
      alert('Не удалось удалить NPC');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">NPC</h1>
          <p className="text-gray-600 mt-1">Всего NPC: {npcs.length}</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          + Создать NPC
        </button>
      </div>

      {npcs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          Нет созданных NPC
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {npcs.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              onClick={() => handleNpcClick(npc)}
              onDelete={() => handleDeleteNpc(npc)}
            />
          ))}
        </div>
      )}

      {isCreateModalOpen && <CreateNpcModal onClose={() => setIsCreateModalOpen(false)} />}
      {selectedNpc && (
        <EditNpcModal
          npc={selectedNpc}
          onClose={() => setSelectedNpc(null)}
          onNpcUpdated={() => {
            setSelectedNpc(null);
            fetchNpcs();
          }}
        />
      )}
      {loadingDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-700">Загрузка данных NPC...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};