// client/src/pages/NpcsPage.tsx
import { useState, useEffect } from "react";
import { CreateNpcModal } from "../components/ui/CreateNpcModal";
import { EditNpcModal } from "../components/ui/EditNpcModal";
import { NpcCard } from "../components/ui/NpcCard";
import { Pagination } from "../components/ui/Pagination";
import { useNpcStore } from "../stores/npcStore";
import type { NpcType } from "../types";
import ConfirmModal from '../components/ui/ConfirmModal';
import { useErrorHandler } from '../hooks/useErrorHandler';

export const NpcsPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedNpc, setSelectedNpc] = useState<NpcType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [npcToDelete, setNpcToDelete] = useState<NpcType | null>(null);
  const { showError } = useErrorHandler();
  const [duplicateNpc, setDuplicateNpc] = useState<NpcType | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  const {
    npcs,
    npcsTotal,
    currentPage,
    limit,
    fetchNpcs,
    initializeSocket,
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

  const handleDuplicateClick = (npc: NpcType) => {
    setDuplicateNpc(npc);
    setDuplicateName(`Копия ${npc.name}`);
    setIsDuplicateModalOpen(true);
  };

  const confirmDuplicate = async () => {
    if (!duplicateNpc) return;
    if (!duplicateName.trim()) {
      showError("Введите имя для копии");
      return;
    }
    try {
      const response = await fetch(`/api/npcs/${duplicateNpc.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: duplicateName.trim() }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Ошибка дублирования");
      }
      // Обновить список
      await fetchNpcs(currentPage, limit);
      setIsDuplicateModalOpen(false);
      setDuplicateNpc(null);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Не удалось дублировать NPC");
    }
  };

  const confirmDelete = async () => {
    if (!npcToDelete) return;
    try {
      const response = await fetch(`/api/npcs/${npcToDelete.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Ошибка удаления');
    } catch (error) {
      console.error(error);
      showError('Не удалось удалить NPC');
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
                onDuplicate={() => handleDuplicateClick(npc)}
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
      {isDuplicateModalOpen && duplicateNpc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-xl font-bold mb-4">Дублировать NPC</h3>
            <p className="text-gray-600 mb-2">Создать копию NPC "{duplicateNpc.name}"</p>
            <input
              type="text"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-4"
              placeholder="Имя нового NPC"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDuplicateModalOpen(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={confirmDuplicate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Дублировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};