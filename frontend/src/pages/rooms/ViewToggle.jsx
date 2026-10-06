import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

export default function ViewToggle({ view, onChange }) {
  return (
    <div className="inline-flex bg-[#f2f2f2] p-1 rounded-xl gap-1">
      <button
        onClick={() => onChange('grid')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          view === 'grid'
            ? 'bg-white text-[#222222] shadow-xs'
            : 'text-[#6a6a6a] hover:text-[#222222]'
        }`}
      >
        <LayoutGrid size={14} />
        <span>Grid</span>
      </button>

      <button
        onClick={() => onChange('list')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          view === 'list'
            ? 'bg-white text-[#222222] shadow-xs'
            : 'text-[#6a6a6a] hover:text-[#222222]'
        }`}
      >
        <List size={14} />
        <span>List</span>
      </button>
    </div>
  );
}
