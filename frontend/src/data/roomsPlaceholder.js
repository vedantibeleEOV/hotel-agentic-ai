/**
 * roomsPlaceholder.js
 * Temporary demo placeholder data for room details that the backend does not store yet
 * (such as guest names, upcoming arrival times, VIP status, and specific notes).
 * 
 * TODO: Replace with real backend data once guest and reservation APIs are fully connected.
 */

export const roomsPlaceholderExtra = {
  101: { guest: 'Siddharth Rao', vip: false, arrival: null, priority: 'LOW', note: null },
  102: { guest: null, vip: false, arrival: { name: 'Kavya Nair', ts: '15:00', vip: false }, priority: 'MEDIUM', note: null },
  118: { guest: null, vip: false, arrival: { name: 'Manish Verma', ts: '12:27', vip: false }, priority: 'HIGH', note: 'Next guest arrives soon' },
  201: { guest: 'Aditi Roy', vip: true, arrival: null, priority: 'HIGH', note: 'VIP guest requested extra towels' },
  220: { guest: 'Rohan Mehta', vip: false, arrival: null, priority: 'HIGH', note: 'Plumbing maintenance issue' },
  305: { guest: 'Rajesh Khanna', vip: true, arrival: null, priority: 'CRITICAL', note: 'Electrical socket burning smell' },
  410: { guest: null, vip: false, arrival: { name: 'Priya Sharma', ts: '16:00', vip: true }, priority: 'HIGH', note: null },
  520: { guest: null, vip: false, arrival: { name: 'Sunita Pawar', ts: '13:12', vip: false }, priority: 'HIGH', note: 'SLA breached' },
};

export const getPlaceholderRoomMeta = (roomId) => {
  return roomsPlaceholderExtra[roomId] || {
    guest: null,
    vip: false,
    arrival: null,
    priority: 'LOW',
    note: null,
  };
};
