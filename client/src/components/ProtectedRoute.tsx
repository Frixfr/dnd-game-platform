// client/src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useRoomStore } from '../stores/roomStore';

interface ProtectedRouteProps {
  requireRoom?: boolean; // true – требуется наличие currentRoom, false – требуется только токен (без комнаты)
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireRoom = false }) => {
  const { token, currentRoom } = useRoomStore();

  if (!token) {
    // Нет токена – на страницу входа
    return <Navigate to="/" replace />;
  }

  if (requireRoom && !currentRoom) {
    // Требуется комната, но её нет – на страницу выбора комнаты
    return <Navigate to="/rooms" replace />;
  }

  if (!requireRoom && currentRoom) {
    // Не требуется комната, но она есть – на мастер-интерфейс
    return <Navigate to="/master" replace />;
  }

  return <Outlet />;
};