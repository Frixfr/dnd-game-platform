import React from 'react';
import type { RaceType } from '../../types';

interface RaceCardProps {
  race: RaceType;
  onClick: () => void;
  onDelete: () => void;
}

export const RaceCard: React.FC<RaceCardProps> = ({ race, onClick, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-gray-800">{race.name}</h3>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-red-500 hover:text-red-700"
        >
          🗑️
        </button>
      </div>
      <p className="text-gray-600 text-sm mt-2 line-clamp-2">{race.description || 'Нет описания'}</p>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs text-gray-400">ID: {race.id}</span>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {race.effects?.length || 0} эффектов
        </span>
      </div>
      <button
        onClick={onClick}
        className="mt-3 w-full px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
      >
        Редактировать
      </button>
    </div>
  );
};