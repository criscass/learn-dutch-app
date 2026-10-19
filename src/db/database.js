import Dexie from 'dexie';

export const db = new Dexie('DutchWorkdayCompanionDB');

db.version(1).stores({
  user_profile: 'id',
  sentences: 'id, pack_id, category, checkpoint_id, times_spoken_irl, mastery_level, in_daily_queue, last_practiced, created_at',
  quick_captures: 'id, created_at, processed'
});

db.version(2).stores({
  user_profile: 'id',
  sentences: 'id, pack_id, category, checkpoint_id, times_spoken_irl, mastery_level, in_daily_queue, last_practiced, created_at',
  quick_captures: 'id, created_at, processed',
  categories: 'id, name, order'
});

export const CATEGORY_COLOR_PALETTE = {
  blue: {
    label: 'Blue',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400'
  },
  purple: {
    label: 'Purple',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400'
  },
  amber: {
    label: 'Amber',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400'
  },
  emerald: {
    label: 'Emerald',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400'
  },
  pink: {
    label: 'Pink',
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    dot: 'bg-pink-400'
  },
  cyan: {
    label: 'Cyan',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    dot: 'bg-cyan-400'
  },
  orange: {
    label: 'Orange',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-400'
  },
  slate: {
    label: 'Slate',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    dot: 'bg-slate-400'
  }
};

export const DEFAULT_CATEGORIES = [
  {
    id: 'cat-arrival',
    name: 'Arrival & Handover',
    has_time_bracket: true,
    start_time: '08:30',
    end_time: '09:30',
    color: 'blue',
    order: 1
  },
  {
    id: 'cat-housekeeping',
    name: 'Housekeeping',
    has_time_bracket: false,
    start_time: null,
    end_time: null,
    color: 'purple',
    order: 2
  },
  {
    id: 'cat-tech',
    name: 'Tech & Repairs',
    has_time_bracket: false,
    start_time: null,
    end_time: null,
    color: 'amber',
    order: 3
  },
  {
    id: 'cat-front-desk',
    name: 'Front Desk & Guests',
    has_time_bracket: false,
    start_time: null,
    end_time: null,
    color: 'emerald',
    order: 4
  },
  {
    id: 'cat-small-talk',
    name: 'Small Talk & Breaks',
    has_time_bracket: true,
    start_time: '12:00',
    end_time: '13:00',
    color: 'pink',
    order: 5
  }
];

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

