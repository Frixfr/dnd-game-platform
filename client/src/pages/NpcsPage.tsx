// client/src/pages/NpcsPage.tsx
import { useState, useEffect } from "react";
import { CreateNpcModal } from "../components/ui/CreateNpcModal";
import { EditNpcModal } from "../components/ui/EditNpcModal";
import { NpcCard } from "../components/ui/NpcCard";
import { Pagination } from "../components/ui/Pagination";
import { useNpcStore } from "../stores/npcStore";
import type { NpcType } from "../types";
import ConfirmModal from '../components/ui/ConfirmModal';

export const NpcsPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNpc, setSelectedNpc] = useState<NpcType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [npcToDelete, setNpcToDelete] = useState<NpcType | null>(null);

  const {
    npcs,
    npcsTotal,
    currentPage,
    limit,
    fetchNpcs,
    initializeSocket,
    socket,
  } = useNpcStore();

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchNpcs(currentPage, limit);
      setLoading(false);
    };
    load();
  }, [currentPage, limit, fetchNpcs]);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.off("npc:created");
        socket.off("npc:updated");
        socket.off("npc:deleted");
      }
    };
  }, [socket]);

  const handleNpcClick = async (npc: NpcType) => {
    try {
      const response = await fetch(`/api/npcs/${npc.id}/details`);
      if (!response.ok) throw new Error("Ошибка загрузки");
      const data = await response.json();
      setSelectedNpc(data.npc);
    } catch (error) {
      console.error(error);
      setSelectedNpc(npc);
    }
  };

  const handleDeleteNpc = (npc: NpcType) => {
    setNpcToDelete(npc);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!npcToDelete) return;
    try {
      const response = await fetch(`/api/npcs/${npcToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
    } catch (error) {
      console.error(error);
      alert('Не удалось удалить NPC');
    } finally {
      setShowConfirmModal(false);
      setNpcToDelete(null);
    }
  };

  const totalPages = Math.ceil(npcsTotal / limit);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">NPC</h1>
          <p className="text-gray-600 mt-1">Всего NPC: {npcsTotal}</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          + Создать NPC
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Загрузка NPC...</p>
        </div>
      ) : npcs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          Нет созданных NPC
        </div>
      ) : (
        <>
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => fetchNpcs(page, limit)}
          />
        </>
      )}

      {isCreateModalOpen && <CreateNpcModal onClose={() => setIsCreateModalOpen(false)} />}
      {selectedNpc && (
        <EditNpcModal
          npc={selectedNpc}
          onClose={() => setSelectedNpc(null)}
          onNpcUpdated={() => {
            setSelectedNpc(null);
            fetchNpcs(currentPage, limit);
          }}
        />
      )}

      <ConfirmModal
        isOpen={showConfirmModal}
        message={`Удалить NPC "${npcToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowConfirmModal(false);
          setNpcToDelete(null);
        }}
      />
    </div>
  );
};