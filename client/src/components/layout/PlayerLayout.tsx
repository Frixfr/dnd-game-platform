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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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

  // Остальной код без изменений (hydration, resize, scroll, logout и т.д.)
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

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const main = document.querySelector('main');
    if (!main) return;
    const handleScroll = () => {
      setShowStickyBar(main.scrollTop > 150);
    };
    main.addEventListener('scroll', handleScroll);
    return () => main.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

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
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800 relative">
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={closeSidebar} />
      )}
      <div
        className={`fixed md:relative z-40 transition-transform duration-300 ease-in-out ${
          isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        <PlayerSidebar onClose={closeSidebar} isMobile={isMobile} playerId={selectedPlayer.id} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PlayerHeader
          toggleSidebar={toggleSidebar}
          isMobile={isMobile}
          onLogout={handleLogout}
          playerName={selectedPlayer.name}
        />
        {isMobile && showStickyBar && (
          <StickyHealthBar health={finalStats.health} maxHealth={finalStats.max_health} armor={finalStats.armor} />
        )}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-20 md:pb-0">
          <Outlet />
        </main>
        {isMobile && <MobileTabBar playerId={selectedPlayer.id} />}
      </div>
    </div>
  );
};

export default PlayerLayout;