// client/src/components/layout/PlayerLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import PlayerSidebar from './PlayerSidebar';
import PlayerHeader from './PlayerHeader';
import { usePlayerSessionStore } from '../../stores/playerSessionStore';

const PlayerLayout: React.FC = () => {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { selectedPlayer, clearSession } = usePlayerSessionStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Состояние гидратации стора
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Ожидаем восстановления персистентного состояния
    const unsubHydrate = usePlayerSessionStore.persist.onHydrate?.(() => setHydrated(false));
    const unsubFinish = usePlayerSessionStore.persist.onFinishHydration?.(() => setHydrated(true));
    
    // Если onFinishHydration не доступен, устанавливаем true через таймаут
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

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  if (!hydrated) return null;
  if (!selectedPlayer) return null;

  return (
    <div className="flex h-screen bg-slate-50 relative">
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={closeSidebar} />
      )}
      <div className={`fixed md:relative z-40 transition-transform duration-300 ease-in-out ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}>
        <PlayerSidebar onClose={closeSidebar} isMobile={isMobile} playerId={selectedPlayer.id} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <PlayerHeader toggleSidebar={toggleSidebar} isMobile={isMobile} onLogout={handleLogout} playerName={selectedPlayer.name} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PlayerLayout;