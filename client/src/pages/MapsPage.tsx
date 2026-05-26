// client/src/pages/MapsPage.tsx
import { useEffect, useState } from "react";
import { useMapStore } from "../stores/mapStore";
import { MapEditor } from "../components/game/MapEditor";
import type { MapWithTokensType } from "../types";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useErrorHandler } from "../hooks/useErrorHandler";

export const MapsPage = () => {
  const { maps, currentMap, fetchMaps, fetchMap, createMap, updateMap, deleteMap, setCurrentMap, loading } = useMapStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [newMapFile, setNewMapFile] = useState<File | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const { showError } = useErrorHandler();

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const handleCreate = async () => {
    if (!newMapName || !newMapFile) {
      showError("Введите название и выберите изображение");
      return;
    }
    const formData = new FormData();
    formData.append("name", newMapName);
    formData.append("image", newMapFile);
    try {
      await createMap(formData);
      setShowCreateModal(false);
      setNewMapName("");
      setNewMapFile(null);
    } catch {
      showError("Не удалось создать карту");
    }
  };

  const handleSelectMap = async (id: number) => {
    console.log("[MapsPage] Selecting map", id);
    await fetchMap(id);
    console.log("[MapsPage] After fetchMap, currentMap in store:", useMapStore.getState().currentMap);
  };

  const handleToggleShow = async (map: MapWithTokensType) => {
    try {
      await updateMap(map.id, { show_to_players: !map.show_to_players });
    } catch {
      showError("Ошибка обновления");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMap(id);
      if (currentMap?.id === id) setCurrentMap(null);
    } catch {
      showError("Ошибка удаления");
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-text-primary">Карты</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          + Загрузить карту
        </button>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Список карт */}
        <div className="w-64 bg-card rounded-lg border border-border-color shadow p-4 overflow-y-auto">
          <h2 className="font-semibold mb-2 text-text-primary">Список карт</h2>
          {loading && <p className="text-text-secondary">Загрузка...</p>}
          {maps.map((map) => (
            <div
              key={map.id}
              className={`p-2 mb-2 rounded cursor-pointer flex justify-between items-center ${currentMap?.id === map.id ? "bg-bg-secondary border-l-4 border-accent-red" : "hover:bg-bg-secondary"}`}
              onClick={() => handleSelectMap(map.id)}
            >
              <span className="truncate text-text-primary">{map.name}</span>
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleShow(map as MapWithTokensType);
                  }}
                  className={`text-xs px-2 py-1 rounded ${map.show_to_players ? "bg-green-500/20 text-green-400" : "bg-bg-tertiary text-text-secondary"}`}
                >
                  {map.show_to_players ? "Показ" : "Скрыта"}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(map.id);
                  }}
                  className="text-xs bg-accent-red text-white px-2 py-1 rounded hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {maps.length === 0 && <p className="text-text-secondary">Нет карт</p>}
        </div>

        {/* Редактор карты */}
        <div className="flex-1 bg-bg-secondary rounded-lg border border-border-color shadow overflow-hidden">
          {currentMap ? (
            <MapEditor mapId={currentMap.id} />
          ) : (
            <div className="flex items-center justify-center h-full text-text-secondary">
              Выберите карту для редактирования
            </div>
          )}
        </div>
      </div>

      {/* Модалка создания */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="modal-content w-96">
            <h2 className="text-xl mb-4 text-text-primary">Новая карта</h2>
            <input
              type="text"
              placeholder="Название"
              className="form-input mb-3"
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              className="w-full mb-3 text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-accent-red file:text-white hover:file:bg-red-700"
              onChange={(e) => setNewMapFile(e.target.files?.[0] || null)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary">
                Отмена
              </button>
              <button onClick={handleCreate} className="btn-primary">
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        message="Удалить карту? Все токены на ней будут потеряны."
        onConfirm={() => {
          if (deleteConfirm) handleDelete(deleteConfirm);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};