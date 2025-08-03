import React from "react";

interface TopBarProps {
  title: string;
  onBack?: () => void;
  onMenu: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ title, onBack, onMenu }) => {
  return (
    <div className="flex items-center justify-between px-2 py-2 bg-white shadow-sm sticky top-0 z-30">
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            className="text-xl text-blue-600 hover:text-blue-800"
            onClick={onBack}
            aria-label="Back"
          >
            ←
          </button>
        )}
        <span className="font-semibold text-blue-700 text-base">{title}</span>
      </div>
      <button
        className="text-2xl text-blue-600 hover:text-blue-800"
        onClick={onMenu}
        aria-label="Menu"
      >
        ☰
      </button>
    </div>
  );
};

export default TopBar;
