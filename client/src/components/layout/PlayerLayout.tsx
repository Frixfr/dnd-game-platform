// client/src/components/layout/PlayerLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import PlayerSidebar from './PlayerSidebar';
import PlayerHeader from './PlayerHeader';
import MobileTabBar from './MobileTabBar';
import StickyHealthBar from './StickyHealthBar';
import { usePlayerSessionStore } from '../../stores/playerSessionStore';
import { useMapStore } from '../../stores/mapStore';
import { useCombatStore } from '../../stores/combatStore';
import { useLogStore } from '../../stores/logStore';
import { socket } from '../../lib/socket';

const PlayerLayout: React.FC = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { selectedPlayer, clearSession } = usePlayerSessionStore();
  const [hydrated, setHydrated] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Инициализация сокет-подписок для игрока
  useEffect(() => {
    // Переинициализируем сторы, которые нужны игроку
    usePlayerSessionStore.getState().initializeSessionSocket();
    useMapStore.getState().initializeSocket();
    useCombatStore.getState().initializeSocket();
    useLogStore.getState().initializeSocket();

    // Подключаемся к комнате игрока
    if (playerId) {
      socket.emit('join-player', playerId);
    }

    return () => {
      if (playerId) {
        socket.emit('leave', `player:${playerId}`);
      }
      // Не отключаем обработчики при размонтировании,
      // они будут отключены при логауте через disconnectAllSocketHandlers
    };
  }, [playerId]);

  useEffect(() => {
    const unsubHydrate = usePlayerSessionStore.persist.onHydrate?.(() => setHydrated(false));
    const unsubFinish = usePlayerSessionStore.persist.onFinishHydration?.(() => setHydrated(true));
    const timeout = setTimeout(() => setHydrated(true), 100);
    return () => {
      unsubHydrate?.();
      unsubFinish?.();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!selectedPlayer || selectedPlayer.id !== Number(playerId)) {
      navigate('/');
    }
  }, [selectedPlayer, playerId, navigate, hydrated]);

  // Липкая полоса здоровья показывается при прокрутке вниз.
  // Само переключение мобильный/десктоп — на CSS (md:), поэтому не привязываемся к JS isMobile.
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const handleScroll = () => {
      setShowStickyBar(main.scrollTop > 150);
    };
    main.addEventListener('scroll', handleScroll);
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  if (!hydrated) return null;
  if (!selectedPlayer) return null;

  const finalStats = selectedPlayer.final_stats || {
    health: selectedPlayer.health,
    max_health: selectedPlayer.max_health,
    armor: selectedPlayer.armor,
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0A1F44] to-[#0d2552] relative">
      {/* Боковой сайдбар — только десктоп (md+). Видимость управляется CSS. */}
      <PlayerSidebar playerId={selectedPlayer.id} className="hidden md:flex" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PlayerHeader onLogout={handleLogout} playerName={selectedPlayer.name} />
        {/* Липкая полоса здоровья — только на мобиле (md:hidden) */}
        <div className={`${showStickyBar ? 'block' : 'hidden'} md:hidden`}>
          <StickyHealthBar
            health={finalStats.health}
            baseMaxHealth={selectedPlayer.max_health}
            finalMaxHealth={finalStats.max_health}
            armor={finalStats.armor}
          />
        </div>
        {/* pb-20 снизу — отступ под нижнюю панель на мобиле */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0">
          <Outlet />
        </main>
        {/* Нижняя панель навигации — только на мобиле (md:hidden) */}
        <MobileTabBar playerId={selectedPlayer.id} />
      </div>
    </div>
  );
};

export default PlayerLayout;