// client/src/components/layout/MasterLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { MasterRequestsListener } from './MasterRequestsListener';
import { useAbilityStore } from '../../stores/abilityStore';
import { useCombatStore } from '../../stores/combatStore';
import { useEffectStore } from '../../stores/effectStore';
import { useItemStore } from '../../stores/itemStore';
import { useLogStore } from '../../stores/logStore';
import { useMapStore } from '../../stores/mapStore';
import { useRaceStore } from '../../stores/raceStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useNpcStore } from '../../stores/npcStore';

const MasterLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    usePlayerStore.getState().initializeSocket();
    useNpcStore.getState().initializeSocket();
    useRaceStore.getState().initializeSocket();
    useAbilityStore.getState().initializeSocket();
    useEffectStore.getState().initializeSocket();
    useItemStore.getState().initializeSocket();
    useMapStore.getState().initializeSocket();
    useCombatStore.getState().initializeSocket();
    useLogStore.getState().initializeSocket();
  }, []);

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
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg-primary)] relative">
      <MasterRequestsListener />
      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={closeSidebar} />
      )}
      <div className={`fixed md:relative z-40 transition-transform duration-300 ease-in-out ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}>
        <Sidebar onClose={closeSidebar} isMobile={isMobile} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} isMobile={isMobile} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MasterLayout;