import { useState, useEffect } from 'react';

export const ItemsPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Панель предметов</h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              + Создать предмет
            </button>
          </div>        
        </div>
      );
};

export default ItemsPage;