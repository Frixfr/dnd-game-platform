import { useState, useEffect } from "react";
import { CreateNpcModal } from "../components/ui/CreateNpcModal";
import { EditNpcModal } from "../components/ui/EditNpcModal";
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">NPC</h1>
          <p className="text-gray-600 mt-1">Всего NPC: {npcs.length}</p>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">+ Создать NPC</button>
      </div>
      {npcs.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">Нет созданных NPC</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {npcs.map((npc) => (
            <div key={npc.id} onClick={() => handleNpcClick(npc)} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md cursor-pointer transition" title={`ID: ${npc.id}`}>
              <h3 className="text-xl font-semibold">{npc.name}</h3>
              <p className="text-sm text-gray-500">Пол: {npc.gender === "male" ? "Мужской" : "Женский"}</p>
              <div className="mt-2 flex justify-between">
                <span>❤️ {npc.health}/{npc.max_health}</span>
                <span>🛡️ {npc.armor}</span>
                <span className={`px-2 rounded ${
                  npc.aggression === 0 ? "bg-green-100 text-green-800" :
                  npc.aggression === 1 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {npc.aggression === 0 ? "Мирный" : npc.aggression === 1 ? "Нейтральный" : "Агрессивный"}
                </span>
              </div>
              <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-2">
                <span>💪 {npc.strength}</span>
                <span>🏃 {npc.agility}</span>
                <span>🧠 {npc.intelligence}</span>
                <span>🏋️ {npc.physique}</span>
                <span>🔮 {npc.wisdom}</span>
                <span>🗣️ {npc.charisma}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {isCreateModalOpen && <CreateNpcModal onClose={() => setIsCreateModalOpen(false)} />}
      {selectedNpc && <EditNpcModal npc={selectedNpc} onClose={() => setSelectedNpc(null)} onNpcUpdated={() => { setSelectedNpc(null); fetchNpcs(); }} />}
      {loadingDetails && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded">Загрузка...</div></div>}
    </div>
  );
};