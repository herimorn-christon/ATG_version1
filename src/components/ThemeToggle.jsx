import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../store/slices/themeSlice';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const { mode } = useSelector((state) => state.theme);

  return (
    <button
      onClick={() => dispatch(toggleTheme())}
      className={`
        flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
        ${mode === 'dark' 
          ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        }
      `}
    >
      {mode === 'dark' ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-sm font-medium">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-sm font-medium">Dark</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;