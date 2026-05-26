import React, { useState, useEffect, useRef } from "react";
import { useLogStore } from "../../stores/logStore";

const LogsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { logs, initializeSocket } = useLogStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-[#FF0026] hover:bg-[#FF0026]/90 text-white rounded-full p-3 shadow-lg transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-[#0A1F44] rounded-xl shadow-xl border border-[#F2E9E4]/20 flex flex-col max-h-[500px]">
          <div className="flex justify-between items-center p-4 border-b border-[#F2E9E4]/20">
            <h3 className="font-semibold text-[#F2E9E4]">Логи действий</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#F2E9E4]/60 hover:text-[#F2E9E4]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto p-2 flex-1">
            {logs.length === 0 ? (
              <p className="text-center text-[#F2E9E4]/60 py-8">Нет логов</p>
            ) : (
              logs.map((log) => {
                const { action_type, entity_name, action_name, details } = log;
                let actionText = "";
                let actionColor = "";
                let extra = "";

                switch (action_type) {
                  case "ability_use":
                    actionText = "использовал способность";
                    actionColor = "text-purple-400";
                    break;
                  case "item_use":
                    actionText = "использовал предмет";
                    actionColor = "text-green-400";
                    break;
                  case "item_transfer":
                    actionText = "передал предмет";
                    actionColor = "text-blue-400";
                    if (details) {
                      try {
                        const parsed = JSON.parse(details);
                        extra = ` игроку ${parsed.to_name || `#${parsed.to}`}`;
                      } catch {
                        // игнорируем ошибки парсинга, extra останется пустым
                      }
                    }
                    break;
                  case "item_discard":
                    actionText = "выбросил предмет";
                    actionColor = "text-orange-400";
                    break;
                  case "effect_gain":
                    actionText = "получил эффект";
                    actionColor = "text-yellow-400";
                    break;
                  default:
                    actionText = "совершил действие";
                    actionColor = "text-[#F2E9E4]/60";
                }

                return (
                  <div key={log.id} className="text-sm py-2 border-b border-[#F2E9E4]/10 last:border-0">
                    <span className="text-[#F2E9E4]/40 text-xs">{new Date(log.created_at).toLocaleTimeString()}</span>
                    <span className="ml-2 text-[#F2E9E4]">
                      {entity_name}{" "}
                      <span className={actionColor}>{actionText}</span>{" "}
                      <span className="font-medium">{action_name}</span>
                      {extra && <span className="text-[#F2E9E4]/60">{extra}</span>}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </>
  );
};

export default LogsButton;