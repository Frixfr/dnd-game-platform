// client/src/pages/PlayerInventoryPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ItemCard } from '../components/ui/ItemCard';
import type { PlayerItemExtended, EffectType } from '../types';

export const PlayerInventoryPage = () => {
  const { playerId } = useParams();
  const [items, setItems] = useState<PlayerItemExtended[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch(`/api/players/${playerId}/details`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        const mappedItems: PlayerItemExtended[] = (data.items || []).map((item: any) => ({
          ...item,
          quantity: item.quantity || 1,
          is_equipped: item.is_equipped === 1 || item.is_equipped === true,
          active_effect: item.active_effect || null,
          passive_effect: item.passive_effect || null,
        }));
        setItems(mappedItems);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, [playerId]);

  if (loading) return <div className="text-center py-12">Загрузка инвентаря...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {items.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Инвентарь пуст</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              effects={[item.active_effect, item.passive_effect].filter((e): e is EffectType => e !== null)}
            />
          ))}
        </div>
      )}
    </div>
  );
};