import React from 'react';
import RoomTaskCard from './RoomTaskCard';

/**
 * Single Kanban Board Column with count, subtitle, card list, and dashed empty placeholder
 */
export default function BoardColumn({ column, onCardClick }) {
  const { key, title, subtitle, count, cards } = column;
  const cardList = Array.isArray(cards) ? cards : [];

  let emptyText = 'No tasks';
  if (key === 'blocked') {
    emptyText = 'Nothing blocked';
  } else if (key === 'unassigned') {
    emptyText = 'Every room has an attendant';
  } else if (key === 'inspection_required') {
    emptyText = 'No rooms awaiting inspection';
  } else if (key === 'completed') {
    emptyText = 'No rooms completed yet today';
  }

  return (
    <div className="hk-bcol">
      {/* Column Header */}
      <div className="hk-bhead">
        <div className="hk-bhead-top">
          <span className="hk-bhead-title">{title}</span>
          <span className="hk-bhead-count">{count ?? cardList.length}</span>
        </div>
        {subtitle && <span className="hk-bhead-sub">{subtitle}</span>}
      </div>

      {/* Cards List or Empty Placeholder */}
      <div className="hk-bcol-cards">
        {cardList.length > 0 ? (
          cardList.map((card, idx) => (
            <RoomTaskCard
              key={card.id || card.display_id || `${card.room_number}-${idx}`}
              card={card}
              onCardClick={onCardClick}
            />
          ))
        ) : (
          <div className="hk-bempty">{emptyText}</div>
        )}
      </div>
    </div>
  );
}
