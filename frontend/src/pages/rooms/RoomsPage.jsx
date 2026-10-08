import React, { useState, useMemo } from 'react';
import { useRooms } from '../../hooks/useRooms';
import { useHotel } from '../../context/HotelContext';
import { hotelApi } from '../../api/hotelApi';
import StatusChips from './StatusChips';
import RoomFilters from './RoomFilters';
import ViewToggle from './ViewToggle';
import RoomsGrid from './RoomsGrid';
import RoomsTable from './RoomsTable';
import CheckoutConfirmModal from './CheckoutConfirmModal';
import { Search, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RoomsPage() {
  const { refreshData } = useHotel();

  // Filter & view state
  const [view, setView] = useState('grid');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [filters, setFilters] = useState({
    search: '',
    floor: 'All',
    roomType: 'All',
    priority: 'All',
    vip: false,
    arrivingSoon: false,
    maintOpen: false,
  });

  // Checkout modal state
  const [checkoutRoom, setCheckoutRoom] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const { rooms, summary, loading, error, refreshRooms } = useRooms(filters);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setSelectedStatus('All');
    setFilters({
      search: '',
      floor: 'All',
      roomType: 'All',
      priority: 'All',
      vip: false,
      arrivingSoon: false,
      maintOpen: false,
    });
  };

  const handleOpenCheckout = (room) => {
    setCheckoutRoom(room);
    setCheckoutError(null);
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutRoom || checkoutLoading) return;
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const payload = {
        property_id: checkoutRoom.property_id || 1,
        room_id: checkoutRoom.id,
        reservation_id: checkoutRoom.reservation_id || 5001,
        checkout_time: new Date().toISOString(),
      };

      await hotelApi.processCheckout(payload);

      const rNum = checkoutRoom.room_number || checkoutRoom.id;
      setCheckoutRoom(null);
      setToastMessage(`Room ${rNum} checked out successfully`);
      setTimeout(() => setToastMessage(null), 4000);

      // Refresh both local rooms list and global hotel context
      await Promise.allSettled([
        refreshRooms(),
        refreshData ? refreshData() : Promise.resolve(),
      ]);
    } catch (err) {
      setCheckoutError(err.message || 'Failed to check out room');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Status counts derived directly from backend summary (or fallback from live room entities)
  const statusCounts = useMemo(() => {
    if (summary?.by_status) {
      return summary.by_status;
    }
    const counts = {};
    rooms.forEach((r) => {
      const raw = (r.raw_status || r.status || 'READY').toUpperCase().replace(/[\s-]+/g, '_');
      counts[raw] = (counts[raw] || 0) + 1;
    });
    return counts;
  }, [summary, rooms]);

  // Dynamic floors list derived from by_floor
  const dynamicFloors = useMemo(() => {
    if (summary?.by_floor && Object.keys(summary.by_floor).length > 0) {
      return Object.keys(summary.by_floor).sort((a, b) => Number(a) - Number(b));
    }
    const derived = Array.from(new Set(rooms.map((r) => String(r.floor)).filter(Boolean)));
    return derived.sort((a, b) => Number(a) - Number(b));
  }, [summary, rooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // 1. Status Filter (chip click)
      if (selectedStatus !== 'All') {
        const normalizedSelected = selectedStatus.toUpperCase().replace(/[\s_-]+/g, '_');
        const normalizedRoomStatus = (r.raw_status || r.status || '').toUpperCase().replace(/[\s_-]+/g, '_');
        if (
          r.status !== selectedStatus &&
          normalizedRoomStatus !== normalizedSelected
        ) {
          return false;
        }
      }
      // 2. Floor Filter
      if (filters.floor !== 'All' && String(r.floor) !== String(filters.floor)) {
        return false;
      }
      // 3. Room Type Filter
      if (filters.roomType !== 'All' && r.room_type !== filters.roomType) {
        return false;
      }
      // 4. Priority Filter
      if (filters.priority !== 'All' && (r.priority || '').toLowerCase() !== filters.priority.toLowerCase()) {
        return false;
      }
      // 5. VIP Toggle
      if (filters.vip && !r.vip) {
        return false;
      }
      // 6. Maintenance Open Toggle
      if (filters.maintOpen && !r.maint) {
        return false;
      }
      // 7. Search Text
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const numMatch = String(r.room_number || r.id).toLowerCase().includes(query);
        const guestMatch = (r.guest || '').toLowerCase().includes(query);
        const arrMatch = (r.arrival?.name || '').toLowerCase().includes(query);
        if (!numMatch && !guestMatch && !arrMatch) return false;
      }
      return true;
    });
  }, [rooms, selectedStatus, filters]);

  // Dynamic header subtitle
  const summaryText = useMemo(() => {
    if (summary) {
      const total = summary.total ?? 0;
      const ready = summary.by_status?.READY ?? 0;
      const dirty = summary.by_status?.DIRTY ?? 0;
      const cleaning = summary.by_status?.CLEANING ?? 0;
      const inspection = summary.by_status?.INSPECTION ?? 0;
      const turnover = dirty + cleaning + inspection;
      return `${total} rooms · ${ready} ready · ${turnover} in turnover`;
    }
    const total = rooms.length;
    const ready = rooms.filter((r) => r.status === 'Ready').length;
    const turnover = rooms.filter((r) => ['Dirty', 'Cleaning', 'Inspection'].includes(r.status)).length;
    return `${total} rooms · ${ready} ready · ${turnover} in turnover`;
  }, [summary, rooms]);

  const hasActiveFilters =
    selectedStatus !== 'All' ||
    filters.search !== '' ||
    filters.floor !== 'All' ||
    filters.roomType !== 'All' ||
    filters.priority !== 'All' ||
    filters.vip ||
    filters.arrivingSoon ||
    filters.maintOpen;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#222222] text-white rounded-xl shadow-lg border border-white/10 animate-slide-down">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Page Header & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">Rooms</h2>
          <p className="text-xs sm:text-sm text-[#6a6a6a] mt-0.5 font-medium">{summaryText}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshRooms}
            title="Refresh room data"
            className="p-2 rounded-xl border border-[#dddddd] bg-white text-[#6a6a6a] hover:text-[#222222] hover:bg-[#f7f7f7] transition-all cursor-pointer"
          >
            <RefreshCw size={15} />
          </button>
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {/* 2. Status Chips */}
      <StatusChips
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
        counts={statusCounts}
      />

      {/* 3. Filter Bar */}
      <RoomFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
        floors={dynamicFloors}
        byFloorStatus={summary?.by_floor_status}
      />

      {/* 4. Loading & Error States */}
      {loading && rooms.length === 0 && (
        <div className="p-12 text-center text-[#6a6a6a] font-medium text-sm flex items-center justify-center gap-2">
          <RefreshCw size={18} className="animate-spin text-[#ff385c]" />
          <span>Loading rooms from database...</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 5. Main Content: Grid View or List View */}
      {!loading && !error && filteredRooms.length === 0 ? (
        <div className="bg-white border border-[#dddddd] rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f2f2f2] text-[#6a6a6a] flex items-center justify-center mx-auto">
            <Search size={20} />
          </div>
          <h3 className="font-bold text-[#222222] text-base">No rooms match these filters</h3>
          <p className="text-xs text-[#6a6a6a]">Try clearing your search term or adjusting status filters.</p>
          <button
            onClick={handleResetFilters}
            className="btn-dark px-4 py-2 text-white text-xs font-semibold rounded-xl inline-block mt-2"
          >
            <span className="text-white">Clear filters</span>
          </button>
        </div>
      ) : (
        (!loading || rooms.length > 0) &&
        !error && (
          <div>
            {view === 'grid' ? (
              <RoomsGrid
                rooms={filteredRooms}
                summary={summary}
                onCheckout={handleOpenCheckout}
              />
            ) : (
              <RoomsTable
                rooms={filteredRooms}
                summary={summary}
                onCheckout={handleOpenCheckout}
              />
            )}
          </div>
        )
      )}

      {/* Checkout Confirm Dialog Modal */}
      <CheckoutConfirmModal
        room={checkoutRoom}
        isOpen={Boolean(checkoutRoom)}
        onClose={() => {
          if (!checkoutLoading) {
            setCheckoutRoom(null);
            setCheckoutError(null);
          }
        }}
        onConfirm={handleConfirmCheckout}
        loading={checkoutLoading}
        error={checkoutError}
      />
    </div>
  );
}
