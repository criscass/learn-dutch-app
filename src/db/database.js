import Dexie from 'dexie';

export const db = new Dexie('DutchWorkdayCompanionDB');

db.version(1).stores({
  user_profile: 'id',
  sentences: 'id, pack_id, category, checkpoint_id, times_spoken_irl, mastery_level, in_daily_queue, last_practiced, created_at',
  quick_captures: 'id, created_at, processed'
});

export const DEFAULT_PROFILE = {
  id: 'default',
  source_lang: 'en-US',
  target_lang: 'nl-NL',
  ui_lang: 'en',
  active_pack_id: 'hotel-maintenance',
  daily_goal_count: 5,
  work_days: [1, 2, 3, 4, 5],
  last_queue_date: null,
  checkpoints: [
    { id: 'arrival', label: 'Arrival & Handover', time: '08:55' },
    { id: 'morning_rounds', label: 'Morning Rounds', time: '10:30' },
    { id: 'lunch', label: 'Lunch Break', time: '12:30' },
    { id: 'afternoon', label: 'Afternoon Check', time: '15:00' },
    { id: 'handover', label: 'End of Shift', time: '16:45' }
  ]
};
