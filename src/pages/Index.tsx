import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ─────────────────────────────────────────────────────────────────────

type MuscleGroup = "Грудь" | "Спина" | "Ноги" | "Плечи" | "Руки" | "Кардио" | "Растяжка" | string;
type SetType = "warmup" | "working" | "failure" | "dropset" | "cluster";
type Tab = "days" | "templates" | "stats" | "settings";

interface WorkSet {
  id: string;
  type: SetType;
  weight: number;
  reps: number;
  rpe: number;
  done: boolean;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  sets: WorkSet[];
  collapsed: boolean;
}

interface TrainingDay {
  id: string;
  name: string;
  date: string;
  muscleGroup: MuscleGroup;
  exercises: Exercise[];
  timerStart?: number;
}

interface Template {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  exercises: { name: string; muscleGroup: MuscleGroup; setsCount: number }[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MUSCLE_GROUPS: MuscleGroup[] = ["Грудь", "Спина", "Ноги", "Плечи", "Руки", "Кардио", "Растяжка"];

const MUSCLE_ICONS: Record<string, string> = {
  "Грудь": "🫀", "Спина": "🔙", "Ноги": "🦵", "Плечи": "💪",
  "Руки": "🤜", "Кардио": "❤️", "Растяжка": "🧘",
};

const SET_TYPES: { value: SetType; label: string; color: string }[] = [
  { value: "warmup",  label: "Разминочный", color: "#F5A623" },
  { value: "working", label: "Рабочий",     color: "#00FF88" },
  { value: "failure", label: "Отказной",    color: "#FF4D4D" },
  { value: "dropset", label: "Дроп-сет",    color: "#B44FFF" },
  { value: "cluster", label: "Кластерный",  color: "#4FA3FF" },
];

const EXERCISE_DATABASE: { name: string; muscleGroup: MuscleGroup; type: string }[] = [
  { name: "Жим лёжа",               muscleGroup: "Грудь",     type: "базовое" },
  { name: "Жим гантелей лёжа",      muscleGroup: "Грудь",     type: "базовое" },
  { name: "Разводка гантелей",       muscleGroup: "Грудь",     type: "изолированное" },
  { name: "Кроссовер",               muscleGroup: "Грудь",     type: "изолированное" },
  { name: "Отжимания",               muscleGroup: "Грудь",     type: "с собственным весом" },
  { name: "Тяга штанги в наклоне",   muscleGroup: "Спина",     type: "базовое" },
  { name: "Подтягивания",            muscleGroup: "Спина",     type: "с собственным весом" },
  { name: "Тяга гантели",            muscleGroup: "Спина",     type: "базовое" },
  { name: "Тяга в блоке",            muscleGroup: "Спина",     type: "изолированное" },
  { name: "Гиперэкстензия",          muscleGroup: "Спина",     type: "изолированное" },
  { name: "Приседания",              muscleGroup: "Ноги",      type: "базовое" },
  { name: "Жим ногами",              muscleGroup: "Ноги",      type: "базовое" },
  { name: "Разгибания ног",          muscleGroup: "Ноги",      type: "изолированное" },
  { name: "Сгибания ног",            muscleGroup: "Ноги",      type: "изолированное" },
  { name: "Мёртвая тяга",            muscleGroup: "Ноги",      type: "базовое" },
  { name: "Выпады",                  muscleGroup: "Ноги",      type: "базовое" },
  { name: "Жим штанги стоя",         muscleGroup: "Плечи",     type: "базовое" },
  { name: "Жим гантелей сидя",       muscleGroup: "Плечи",     type: "базовое" },
  { name: "Разводка в стороны",      muscleGroup: "Плечи",     type: "изолированное" },
  { name: "Тяга к подбородку",       muscleGroup: "Плечи",     type: "базовое" },
  { name: "Сгибания на бицепс",      muscleGroup: "Руки",      type: "изолированное" },
  { name: "Молоток",                 muscleGroup: "Руки",      type: "изолированное" },
  { name: "Французский жим",         muscleGroup: "Руки",      type: "изолированное" },
  { name: "Разгибания на трицепс",   muscleGroup: "Руки",      type: "изолированное" },
  { name: "Бег",                     muscleGroup: "Кардио",    type: "кардио" },
  { name: "Велотренажёр",            muscleGroup: "Кардио",    type: "кардио" },
  { name: "Скакалка",                muscleGroup: "Кардио",    type: "кардио" },
  { name: "Растяжка спины",          muscleGroup: "Растяжка",  type: "растяжка" },
  { name: "Растяжка ног",            muscleGroup: "Растяжка",  type: "растяжка" },
];

const INITIAL_DAYS: TrainingDay[] = [
  {
    id: "day1",
    name: "Грудь и трицепс",
    date: "2026-04-25",
    muscleGroup: "Грудь",
    exercises: [
      {
        id: "ex1", name: "Жим лёжа", muscleGroup: "Грудь", collapsed: false,
        sets: [
          { id: "s1", type: "warmup",  weight: 60, reps: 12, rpe: 5, done: true  },
          { id: "s2", type: "working", weight: 80, reps: 10, rpe: 7, done: true  },
          { id: "s3", type: "working", weight: 80, reps: 8,  rpe: 8, done: false },
        ]
      },
      {
        id: "ex2", name: "Разводка гантелей", muscleGroup: "Грудь", collapsed: false,
        sets: [
          { id: "s4", type: "working", weight: 20, reps: 12, rpe: 7, done: false },
          { id: "s5", type: "working", weight: 20, reps: 12, rpe: 8, done: false },
        ]
      },
    ]
  },
];

// ─── Utils ─────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const getDayProgress = (day: TrainingDay) => {
  const allSets = day.exercises.flatMap(e => e.sets);
  if (!allSets.length) return 0;
  return Math.round((allSets.filter(s => s.done).length / allSets.length) * 100);
};

const getDayTonnage = (day: TrainingDay) =>
  day.exercises.flatMap(e => e.sets).reduce((sum, s) => sum + s.weight * s.reps, 0);

const getSetTypeInfo = (type: SetType) => SET_TYPES.find(t => t.value === type) || SET_TYPES[1];

// ─── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#1C1C22] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-hide"
        onClick={e => e.stopPropagation()}
      >
        {title && <h3 className="text-lg font-bold mb-4 text-white">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

// ─── ConfirmDialog ─────────────────────────────────────────────────────────────

function ConfirmDialog({ open, onClose, onConfirm, text }: {
  open: boolean; onClose: () => void; onConfirm: () => void; text: string
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <p className="text-white/80 text-sm mb-6">{text}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/8 text-white/70 font-medium text-sm hover:bg-white/12 transition-colors">
          Отмена
        </button>
        <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 rounded-xl bg-red-500/90 text-white font-medium text-sm hover:bg-red-500 transition-colors">
          Удалить
        </button>
      </div>
    </Modal>
  );
}

// ─── RestTimer ─────────────────────────────────────────────────────────────────

function RestTimer({ onClose, restSeconds = 90 }: { onClose: () => void; restSeconds?: number }) {
  const [seconds, setSeconds] = useState(restSeconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, running]);

  const progress = ((restSeconds - seconds) / restSeconds) * 100;
  const isUrgent = seconds <= 10 && seconds > 0;
  const isDone = seconds <= 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-scale-in">
      <div className="bg-[#1C1C22] border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl min-w-[260px]">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg width="80" height="80" className="-rotate-90">
            <circle cx="40" cy="40" r={radius} stroke="#2C2C34" strokeWidth="4" fill="none" />
            <circle
              cx="40" cy="40" r={radius}
              stroke={isDone ? "#00FF88" : isUrgent ? "#FF4D4D" : "#00FF88"}
              strokeWidth="4" fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
            />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center text-base font-bold ${isUrgent ? "timer-urgent" : isDone ? "neon-text" : "text-white"}`}>
            {isDone ? "✓" : formatDuration(seconds)}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-white/50 text-xs mb-1">Отдых</div>
          <div className="text-white font-semibold text-sm">{isDone ? "Время!" : `Осталось ${formatDuration(seconds)}`}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setRunning(r => !r)} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 transition-colors">
              {running ? "Пауза" : "Пуск"}
            </button>
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 transition-colors">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SetRow ─────────────────────────────────────────────────────────────────────

function SetRow({ set, index, onUpdate, onDelete, onStartRest }: {
  set: WorkSet; index: number;
  onUpdate: (s: WorkSet) => void;
  onDelete: () => void;
  onStartRest: () => void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const info = getSetTypeInfo(set.type);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -80));
  };
  const handleTouchEnd = () => {
    setDragging(false);
    if (swipeX < -60) setSwipeX(-80);
    else setSwipeX(0);
  };

  const toggleDone = () => {
    onUpdate({ ...set, done: !set.done });
    if (!set.done) onStartRest();
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500/90 rounded-r-xl">
        <button onClick={onDelete} className="text-white text-xs font-medium">Удалить</button>
      </div>
      <div
        className="relative bg-[#242429] rounded-xl flex items-center gap-2 px-3 py-2.5 transition-transform"
        style={{ transform: `translateX(${swipeX}px)`, touchAction: "pan-y" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={toggleDone}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            set.done ? "border-[#00FF88] bg-[#00FF88]" : "border-white/20 hover:border-[#00FF88]/50"
          }`}
        >
          {set.done && <Icon name="Check" size={12} className="text-black" />}
        </button>

        <span className="text-white/30 text-xs w-4 text-center flex-shrink-0">{index + 1}</span>

        <div
          className="w-1.5 h-6 rounded-full flex-shrink-0"
          style={{ backgroundColor: info.color, boxShadow: `0 0 6px ${info.color}60` }}
        />

        <select
          value={set.type}
          onChange={e => onUpdate({ ...set, type: e.target.value as SetType })}
          className="bg-transparent text-xs font-medium w-24 border-none outline-none cursor-pointer"
          style={{ color: info.color }}
        >
          {SET_TYPES.map(t => (
            <option key={t.value} value={t.value} style={{ background: "#1C1C22", color: t.color }}>
              {t.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 flex-1">
          <input
            type="number" value={set.weight || ""}
            onChange={e => onUpdate({ ...set, weight: parseFloat(e.target.value) || 0 })}
            className={`w-14 text-center text-sm font-semibold bg-[#1C1C22] rounded-lg py-1 border border-white/8 text-white outline-none focus:border-[#00FF88]/50 transition-colors ${set.done ? "opacity-40" : ""}`}
            placeholder="0"
          />
          <span className="text-white/30 text-xs">кг</span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => onUpdate({ ...set, reps: Math.max(0, set.reps - 1) })} className="w-6 h-6 rounded-lg bg-white/8 text-white/60 text-sm flex items-center justify-center hover:bg-white/15 transition-colors">−</button>
          <span className={`text-sm font-semibold text-white w-6 text-center ${set.done ? "opacity-40 line-through" : ""}`}>{set.reps}</span>
          <button onClick={() => onUpdate({ ...set, reps: set.reps + 1 })} className="w-6 h-6 rounded-lg bg-white/8 text-white/60 text-sm flex items-center justify-center hover:bg-white/15 transition-colors">+</button>
        </div>

        <div className="text-xs text-white/30 w-10 text-right flex-shrink-0">
          {set.rpe > 0 ? <span className="text-white/55">RPE {set.rpe}</span> : <span className="text-white/20">RPE</span>}
        </div>
      </div>
    </div>
  );
}

// ─── ExerciseCard ───────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, onUpdate, onDelete, onClone, onShowHistory }: {
  exercise: Exercise;
  onUpdate: (e: Exercise) => void;
  onDelete: () => void;
  onClone: () => void;
  onShowHistory: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [restActive, setRestActive] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);

  const totalSets = exercise.sets.length;
  const doneSets = exercise.sets.filter(s => s.done).length;
  const maxWeight = Math.max(...exercise.sets.map(s => s.weight), 0);
  const tonnage = exercise.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    onUpdate({
      ...exercise, sets: [...exercise.sets, {
        id: uid(), type: last?.type || "working",
        weight: last?.weight || 0, reps: last?.reps || 10, rpe: 0, done: false
      }]
    });
  };

  const updateSet = (idx: number, s: WorkSet) => {
    const sets = [...exercise.sets];
    sets[idx] = s;
    onUpdate({ ...exercise, sets });
  };

  const deleteSet = (idx: number) => {
    onUpdate({ ...exercise, sets: exercise.sets.filter((_, i) => i !== idx) });
  };

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -80));
  };
  const handleTouchEnd = () => {
    if (swipeX < -60) setSwipeX(-80);
    else setSwipeX(0);
  };

  return (
    <>
      <ConfirmDialog open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={onDelete}
        text={`Удалить упражнение «${exercise.name}»? Все подходы будут удалены.`} />
      {restActive && <RestTimer onClose={() => setRestActive(false)} />}

      <div className="relative mb-3 rounded-2xl overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500/90">
          <button onClick={() => setShowConfirm(true)} className="text-white text-xs font-medium">Удалить</button>
        </div>

        <div
          className="relative bg-[#1C1C22] border border-white/8 rounded-2xl overflow-hidden transition-transform"
          style={{ transform: `translateX(${swipeX}px)`, touchAction: "pan-y" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/6">
            <button
              onClick={() => onUpdate({ ...exercise, collapsed: !exercise.collapsed })}
              className="flex-1 flex items-center gap-2.5 text-left"
            >
              <span className="text-xl">{MUSCLE_ICONS[exercise.muscleGroup] || "💪"}</span>
              <div>
                <div className="text-white font-semibold text-sm">{exercise.name}</div>
                <div className="text-white/40 text-xs mt-0.5">
                  {exercise.muscleGroup} · {totalSets} подх · макс {maxWeight} кг · {tonnage} кг тоннаж
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              {doneSets > 0 && (
                <div className="flex items-center gap-1 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-lg px-2 py-1">
                  <span className="text-[#00FF88] text-xs font-bold">{doneSets}/{totalSets}</span>
                </div>
              )}
              <button onClick={() => onUpdate({ ...exercise, collapsed: !exercise.collapsed })} className="text-white/30 hover:text-white/60 transition-colors">
                <Icon name={exercise.collapsed ? "ChevronDown" : "ChevronUp"} size={18} />
              </button>
              <div className="relative">
                <button onClick={() => setShowMenu(m => !m)} className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors">
                  <Icon name="MoreVertical" size={16} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-9 z-20 bg-[#2C2C34] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[160px] animate-scale-in">
                    <button onClick={() => { onShowHistory(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors">
                      <Icon name="BarChart2" size={14} />История
                    </button>
                    <button onClick={() => { onClone(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors">
                      <Icon name="Copy" size={14} />Дублировать
                    </button>
                    <button onClick={() => { setShowConfirm(true); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <Icon name="Trash2" size={14} />Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!exercise.collapsed && (
            <div className="px-3 pt-3 pb-2">
              {exercise.sets.map((set, idx) => (
                <SetRow
                  key={set.id} set={set} index={idx}
                  onUpdate={s => updateSet(idx, s)}
                  onDelete={() => deleteSet(idx)}
                  onStartRest={() => setRestActive(true)}
                />
              ))}
              <button
                onClick={addSet}
                className="w-full mt-1 py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 text-sm hover:border-[#00FF88]/40 hover:text-[#00FF88]/70 transition-colors flex items-center justify-center gap-1.5"
              >
                <Icon name="Plus" size={14} />Добавить подход
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ExercisePicker ─────────────────────────────────────────────────────────────

function ExercisePicker({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (name: string, muscle: MuscleGroup) => void;
}) {
  const [search, setSearch] = useState("");
  const [filterMuscle, setFilterMuscle] = useState("all");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState<MuscleGroup>("Грудь");

  const filtered = EXERCISE_DATABASE.filter(e =>
    (filterMuscle === "all" || e.muscleGroup === filterMuscle) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal open={open} onClose={onClose} title="Добавить упражнение">
      {!customMode ? (
        <>
          <div className="relative mb-3">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск упражнения..."
              className="w-full bg-[#242429] border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-[#00FF88]/40 transition-colors"
            />
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
            <button onClick={() => setFilterMuscle("all")} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterMuscle === "all" ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}>Все</button>
            {MUSCLE_GROUPS.map(m => (
              <button key={m} onClick={() => setFilterMuscle(m)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterMuscle === m ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}>{m}</button>
            ))}
          </div>
          <div className="max-h-64 overflow-y-auto scrollbar-hide space-y-1 mb-4">
            {filtered.map(ex => (
              <button key={ex.name} onClick={() => onAdd(ex.name, ex.muscleGroup)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-colors text-left">
                <span className="text-lg">{MUSCLE_ICONS[ex.muscleGroup]}</span>
                <div>
                  <div className="text-white text-sm font-medium">{ex.name}</div>
                  <div className="text-white/35 text-xs">{ex.muscleGroup} · {ex.type}</div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div className="text-white/30 text-sm text-center py-6">Ничего не найдено</div>}
          </div>
          <button onClick={() => setCustomMode(true)} className="w-full py-3 rounded-xl border border-dashed border-[#00FF88]/30 text-[#00FF88] text-sm font-medium hover:bg-[#00FF88]/8 transition-colors">
            + Создать своё упражнение
          </button>
        </>
      ) : (
        <>
          <div className="space-y-3 mb-5">
            <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
              placeholder="Название упражнения" autoFocus
              className="w-full bg-[#242429] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/30 outline-none focus:border-[#00FF88]/40 transition-colors"
            />
            <div className="flex gap-2 flex-wrap">
              {MUSCLE_GROUPS.map(m => (
                <button key={m} onClick={() => setCustomMuscle(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${customMuscle === m ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCustomMode(false)} className="flex-1 py-3 rounded-xl bg-white/8 text-white/70 text-sm font-medium">Назад</button>
            <button
              onClick={() => { if (customName.trim()) { onAdd(customName.trim(), customMuscle); setCustomMode(false); setCustomName(""); } }}
              disabled={!customName.trim()}
              className="flex-1 py-3 rounded-xl bg-[#00FF88] text-black text-sm font-bold disabled:opacity-40"
            >Создать</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── AddDayModal ────────────────────────────────────────────────────────────────

function AddDayModal({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (day: TrainingDay) => void;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [muscle, setMuscle] = useState<MuscleGroup>("Грудь");
  const [customMuscle, setCustomMuscle] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) return;
    onAdd({ id: uid(), name: name.trim(), date, muscleGroup: useCustom ? customMuscle : muscle, exercises: [] });
    setName(""); setDate(new Date().toISOString().slice(0, 10)); setMuscle("Грудь"); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Новый тренировочный день">
      <div className="space-y-4 mb-5">
        <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
          placeholder="Название дня (например, Грудь + Трицепс)"
          className="w-full bg-[#242429] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/30 outline-none focus:border-[#00FF88]/40 transition-colors"
        />
        <div>
          <label className="text-white/40 text-xs mb-2 block">Дата</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-[#242429] border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-[#00FF88]/40 transition-colors"
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div>
          <label className="text-white/40 text-xs mb-2 block">Группа мышц</label>
          <div className="flex gap-2 flex-wrap">
            {MUSCLE_GROUPS.map(m => (
              <button key={m} onClick={() => { setMuscle(m); setUseCustom(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!useCustom && muscle === m ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}
              >{MUSCLE_ICONS[m]} {m}</button>
            ))}
            <button onClick={() => setUseCustom(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${useCustom ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}>✏️ Своя</button>
          </div>
          {useCustom && (
            <input type="text" value={customMuscle} onChange={e => setCustomMuscle(e.target.value)}
              placeholder="Своя группа мышц..."
              className="mt-2 w-full bg-[#242429] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-white/30 outline-none focus:border-[#00FF88]/40 transition-colors"
            />
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/8 text-white/70 text-sm font-medium">Отмена</button>
        <button onClick={handleCreate} disabled={!name.trim()} className="flex-1 py-3 rounded-xl bg-[#00FF88] text-black text-sm font-bold disabled:opacity-40">Создать</button>
      </div>
    </Modal>
  );
}

// ─── DayCard ─────────────────────────────────────────────────────────────────────

function DayCard({ day, onClick, onDelete, onClone }: {
  day: TrainingDay; onClick: () => void; onDelete: () => void; onClone: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);

  const progress = getDayProgress(day);
  const tonnage = getDayTonnage(day);
  const allSets = day.exercises.flatMap(e => e.sets);
  const doneSets = allSets.filter(s => s.done).length;
  const totalSets = allSets.length;
  const isCompleted = totalSets > 0 && doneSets === totalSets;

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -80));
  };
  const handleTouchEnd = () => {
    if (swipeX < -60) setSwipeX(-80);
    else setSwipeX(0);
  };

  return (
    <>
      <ConfirmDialog open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={onDelete}
        text={`Удалить день «${day.name}»? Все упражнения будут удалены.`} />
      <div className="relative mb-3 rounded-2xl overflow-hidden animate-fade-in">
        <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500/90">
          <button onClick={() => setShowConfirm(true)} className="text-white text-xs font-medium">Удалить</button>
        </div>
        <div
          className="relative bg-[#1C1C22] border border-white/8 rounded-2xl overflow-hidden transition-transform"
          style={{ transform: `translateX(${swipeX}px)`, touchAction: "pan-y" }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {totalSets > 0 && (
            <div className="h-0.5 w-full bg-white/5">
              <div className="h-full bg-[#00FF88] transition-all duration-700"
                style={{ width: `${progress}%`, boxShadow: "0 0 8px rgba(0,255,136,0.5)" }} />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isCompleted ? "bg-[#00FF88]/15 border border-[#00FF88]/25" : "bg-white/6"}`}>
                {isCompleted ? "✅" : (MUSCLE_ICONS[day.muscleGroup] || "💪")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={onClick} className="text-white font-semibold text-base leading-tight text-left flex-1 truncate">{day.name}</button>
                  <div className="relative flex-shrink-0">
                    <button onClick={() => setShowMenu(m => !m)} className="w-7 h-7 rounded-lg bg-white/6 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
                      <Icon name="MoreVertical" size={14} />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-8 z-20 bg-[#2C2C34] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[160px] animate-scale-in">
                        <button onClick={() => { onClone(); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors">
                          <Icon name="Copy" size={14} />Дублировать
                        </button>
                        <button onClick={() => { setShowConfirm(true); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                          <Icon name="Trash2" size={14} />Удалить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-white/40 text-xs">{formatDate(day.date)}</span>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-white/40 text-xs">{day.muscleGroup}</span>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-white/40 text-xs">{day.exercises.length} упр.</span>
                  {tonnage > 0 && <><span className="text-white/20 text-xs">·</span><span className="text-white/40 text-xs">{tonnage} кг</span></>}
                </div>
              </div>
            </div>
            {progress > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-white/35">{doneSets}/{totalSets} подходов</div>
                <div className={`text-xs font-bold ${isCompleted ? "neon-text" : "text-white/50"}`}>{progress}%</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── DayScreen ──────────────────────────────────────────────────────────────────

function DayScreen({ day, onUpdate, onBack }: {
  day: TrainingDay; onUpdate: (d: TrainingDay) => void; onBack: () => void;
}) {
  const [showExPicker, setShowExPicker] = useState(false);
  const [historyEx, setHistoryEx] = useState<Exercise | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerStart, setTimerStart] = useState<number | null>(null);

  const allSets = day.exercises.flatMap(e => e.sets);
  const doneSets = allSets.filter(s => s.done).length;
  const totalSets = allSets.length;
  const progress = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const tonnage = getDayTonnage(day);
  const isCompleted = totalSets > 0 && doneSets === totalSets;

  useEffect(() => {
    if (doneSets > 0 && !timerStart) setTimerStart(Date.now());
  }, [doneSets]);

  useEffect(() => {
    if (!timerStart) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - timerStart) / 1000)), 1000);
    return () => clearInterval(t);
  }, [timerStart]);

  const addExercise = (name: string, muscleGroup: MuscleGroup) => {
    const ex: Exercise = {
      id: uid(), name, muscleGroup, collapsed: false,
      sets: [{ id: uid(), type: "working", weight: 0, reps: 10, rpe: 0, done: false }]
    };
    onUpdate({ ...day, exercises: [...day.exercises, ex] });
  };

  const updateExercise = (idx: number, ex: Exercise) => {
    const exercises = [...day.exercises];
    exercises[idx] = ex;
    onUpdate({ ...day, exercises });
  };

  const deleteExercise = (idx: number) => {
    onUpdate({ ...day, exercises: day.exercises.filter((_, i) => i !== idx) });
  };

  const cloneExercise = (idx: number) => {
    const ex = day.exercises[idx];
    const cloned: Exercise = { ...ex, id: uid(), sets: ex.sets.map(s => ({ ...s, id: uid(), done: false })) };
    const exercises = [...day.exercises];
    exercises.splice(idx + 1, 0, cloned);
    onUpdate({ ...day, exercises });
  };

  return (
    <>
      <ExercisePicker open={showExPicker} onClose={() => setShowExPicker(false)} onAdd={addExercise} />
      {historyEx && (
        <Modal open={!!historyEx} onClose={() => setHistoryEx(null)} title={`История: ${historyEx.name}`}>
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📊</div>
            <div className="text-white/60 font-medium mb-1">История тренировок</div>
            <div className="text-white/30 text-xs">Данные появятся после нескольких тренировок</div>
          </div>
        </Modal>
      )}

      <div className="min-h-screen bg-[#111114]">
        <div className="glass sticky top-0 z-30 border-b border-white/6 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-white/60 hover:text-white transition-colors">
              <Icon name="ArrowLeft" size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-lg leading-tight truncate">{day.name}</h1>
              <div className="text-white/40 text-xs">{formatDate(day.date)} · {day.muscleGroup}</div>
            </div>
            {timerStart && (
              <div className="flex items-center gap-1.5 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-xl px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] pulse-neon" />
                <span className="text-[#00FF88] text-sm font-mono font-bold">{formatDuration(elapsed)}</span>
              </div>
            )}
          </div>
          <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #00FF88, #00C870)",
                boxShadow: progress > 0 ? "0 0 12px rgba(0,255,136,0.4)" : "none"
              }}
            />
          </div>
          {totalSets > 0 && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-white/30 text-xs">{doneSets}/{totalSets} подходов</span>
              <span className={`text-xs font-bold ${isCompleted ? "neon-text" : "text-white/50"}`}>
                {isCompleted ? "✓ Выполнено!" : `${progress}%`}
              </span>
            </div>
          )}
        </div>

        <div className="px-4 pt-4 pb-32">
          {tonnage > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Тоннаж", value: `${tonnage} кг` },
                { label: "Упражнений", value: day.exercises.length },
                { label: "Подходов", value: totalSets },
              ].map(stat => (
                <div key={stat.label} className="bg-[#1C1C22] rounded-xl p-3 text-center border border-white/6">
                  <div className="text-white font-bold text-base">{stat.value}</div>
                  <div className="text-white/35 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {day.exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">🏋️</div>
              <div className="text-white/60 font-semibold text-base mb-1">Нет упражнений</div>
              <div className="text-white/30 text-sm mb-6">Добавьте первое упражнение<br/>для начала тренировки</div>
            </div>
          ) : (
            day.exercises.map((ex, idx) => (
              <ExerciseCard
                key={ex.id} exercise={ex}
                onUpdate={e => updateExercise(idx, e)}
                onDelete={() => deleteExercise(idx)}
                onClone={() => cloneExercise(idx)}
                onShowHistory={() => setHistoryEx(ex)}
              />
            ))
          )}
        </div>

        <div className="fixed bottom-6 inset-x-0 flex justify-center pointer-events-none z-30">
          <button
            onClick={() => setShowExPicker(true)}
            className="pointer-events-auto flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-black shadow-2xl transition-all active:scale-95"
            style={{ background: "#00FF88", boxShadow: "0 0 30px rgba(0,255,136,0.4)" }}
          >
            <Icon name="Plus" size={18} />Добавить упражнение
          </button>
        </div>
      </div>
    </>
  );
}

// ─── TemplatesTab ───────────────────────────────────────────────────────────────

function TemplatesTab({ onApply }: { onApply: (t: Template) => void }) {
  const [templates, setTemplates] = useState<Template[]>([
    { id: "t1", name: "Грудь + Трицепс", muscleGroup: "Грудь", exercises: [
      { name: "Жим лёжа", muscleGroup: "Грудь", setsCount: 4 },
      { name: "Разводка гантелей", muscleGroup: "Грудь", setsCount: 3 },
      { name: "Французский жим", muscleGroup: "Руки", setsCount: 3 },
    ]},
    { id: "t2", name: "Спина + Бицепс", muscleGroup: "Спина", exercises: [
      { name: "Подтягивания", muscleGroup: "Спина", setsCount: 4 },
      { name: "Тяга штанги в наклоне", muscleGroup: "Спина", setsCount: 3 },
      { name: "Сгибания на бицепс", muscleGroup: "Руки", setsCount: 3 },
    ]},
    { id: "t3", name: "День ног", muscleGroup: "Ноги", exercises: [
      { name: "Приседания", muscleGroup: "Ноги", setsCount: 4 },
      { name: "Жим ногами", muscleGroup: "Ноги", setsCount: 3 },
      { name: "Разгибания ног", muscleGroup: "Ноги", setsCount: 3 },
      { name: "Мёртвая тяга", muscleGroup: "Ноги", setsCount: 3 },
    ]},
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>("Грудь");

  return (
    <div className="px-4 pt-4 pb-32">
      <h2 className="text-white font-bold text-xl mb-4">Шаблоны тренировок</h2>
      <div className="space-y-3">
        {templates.map(t => (
          <div key={t.id} className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{MUSCLE_ICONS[t.muscleGroup] || "💪"}</span>
              <div className="flex-1">
                <div className="text-white font-semibold">{t.name}</div>
                <div className="text-white/35 text-xs">{t.exercises.length} упражнений</div>
              </div>
              <button onClick={() => onApply(t)} className="px-4 py-2 rounded-xl bg-[#00FF88] text-black text-sm font-bold hover:bg-[#00E87A] transition-colors">
                Применить
              </button>
            </div>
            <div className="space-y-1.5">
              {t.exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/50">
                  <span>{MUSCLE_ICONS[ex.muscleGroup]}</span>
                  <span className="flex-1">{ex.name}</span>
                  <span className="text-white/25">{ex.setsCount} × подх</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setShowCreate(true)} className="w-full mt-4 py-4 rounded-2xl border border-dashed border-white/15 text-white/40 text-sm hover:border-[#00FF88]/40 hover:text-[#00FF88]/70 transition-colors flex items-center justify-center gap-2">
        <Icon name="Plus" size={16} />Создать шаблон
      </button>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Новый шаблон">
        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название шаблона"
          className="w-full bg-[#242429] border border-white/10 rounded-xl py-3 px-4 text-sm text-white placeholder-white/30 outline-none focus:border-[#00FF88]/40 mb-4 transition-colors"
        />
        <div className="flex gap-2 flex-wrap mb-5">
          {MUSCLE_GROUPS.map(m => (
            <button key={m} onClick={() => setNewMuscle(m)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${newMuscle === m ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}>{m}</button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl bg-white/8 text-white/70 text-sm font-medium">Отмена</button>
          <button
            onClick={() => { if (!newName.trim()) return; setTemplates(ts => [...ts, { id: uid(), name: newName.trim(), muscleGroup: newMuscle, exercises: [] }]); setNewName(""); setShowCreate(false); }}
            disabled={!newName.trim()}
            className="flex-1 py-3 rounded-xl bg-[#00FF88] text-black text-sm font-bold disabled:opacity-40"
          >Создать</button>
        </div>
      </Modal>
    </div>
  );
}

// ─── StatsTab ───────────────────────────────────────────────────────────────────

function StatsTab({ days }: { days: TrainingDay[] }) {
  const totalTrainings = days.length;
  const totalExercises = days.reduce((s, d) => s + d.exercises.length, 0);
  const totalSets = days.reduce((s, d) => s + d.exercises.flatMap(e => e.sets).length, 0);
  const totalTonnage = days.reduce((s, d) => s + getDayTonnage(d), 0);

  const muscleFreq: Record<string, number> = {};
  days.forEach(d => { muscleFreq[d.muscleGroup] = (muscleFreq[d.muscleGroup] || 0) + 1; });
  const sortedMuscles = Object.entries(muscleFreq).sort((a, b) => b[1] - a[1]);
  const maxFreq = sortedMuscles[0]?.[1] || 1;

  return (
    <div className="px-4 pt-4 pb-32">
      <h2 className="text-white font-bold text-xl mb-4">Статистика</h2>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: "Тренировок", value: totalTrainings, icon: "Calendar" },
          { label: "Упражнений", value: totalExercises, icon: "Dumbbell" },
          { label: "Подходов", value: totalSets, icon: "BarChart2" },
          { label: "Тоннаж кг", value: totalTonnage.toLocaleString("ru"), icon: "TrendingUp" },
        ].map(stat => (
          <div key={stat.label} className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4 animate-fade-in">
            <Icon name={stat.icon} fallback="BarChart2" size={20} className="text-[#00FF88] mb-2" />
            <div className="text-white font-bold text-2xl">{stat.value}</div>
            <div className="text-white/35 text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4 mb-4">
        <div className="text-white font-semibold text-sm mb-4">Частота по группам мышц</div>
        {sortedMuscles.length === 0 ? (
          <div className="text-white/30 text-sm text-center py-4">Нет данных</div>
        ) : (
          <div className="space-y-3">
            {sortedMuscles.map(([muscle, count]) => (
              <div key={muscle} className="flex items-center gap-3">
                <span className="text-lg w-7">{MUSCLE_ICONS[muscle] || "💪"}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white/70 text-xs">{muscle}</span>
                    <span className="text-white/40 text-xs">{count} раз</span>
                  </div>
                  <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxFreq) * 100}%`, background: "linear-gradient(90deg, #00FF88, #00C870)", boxShadow: "0 0 8px rgba(0,255,136,0.4)" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4">
        <div className="text-white font-semibold text-sm mb-3">Последние тренировки</div>
        {days.length === 0 ? (
          <div className="text-white/30 text-sm text-center py-4">Нет данных</div>
        ) : (
          [...days].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(d => (
            <div key={d.id} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
              <span className="text-lg">{MUSCLE_ICONS[d.muscleGroup] || "💪"}</span>
              <div className="flex-1">
                <div className="text-white/80 text-sm">{d.name}</div>
                <div className="text-white/35 text-xs">{formatDate(d.date)}</div>
              </div>
              <div className="text-white/40 text-xs text-right">
                {d.exercises.length} упр.<br/>{getDayTonnage(d)} кг
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── SettingsTab ────────────────────────────────────────────────────────────────

function SettingsTab() {
  const [restTime, setRestTime] = useState(90);
  const [vibration, setVibration] = useState(true);
  const [sound, setSound] = useState(true);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");

  return (
    <div className="px-4 pt-4 pb-32">
      <h2 className="text-white font-bold text-xl mb-4">Настройки</h2>
      <div className="space-y-3">
        <div className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-white font-medium text-sm">Время отдыха</div>
              <div className="text-white/35 text-xs">По умолчанию между подходами</div>
            </div>
            <span className="text-[#00FF88] font-bold text-lg">{restTime}с</span>
          </div>
          <input type="range" min={30} max={300} step={15} value={restTime}
            onChange={e => setRestTime(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-white/20 text-xs mt-1"><span>30с</span><span>5 мин</span></div>
        </div>

        {([
          { label: "Вибрация", sub: "При отметке подхода и таймере", val: vibration, set: setVibration },
          { label: "Звуковой сигнал", sub: "По окончании таймера отдыха", val: sound, set: setSound },
        ] as { label: string; sub: string; val: boolean; set: (v: boolean) => void }[]).map(({ label, sub, val, set }) => (
          <div key={label} className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-white font-medium text-sm">{label}</div>
              <div className="text-white/35 text-xs">{sub}</div>
            </div>
            <button onClick={() => set(!val)} className={`w-12 h-6 rounded-full relative transition-all duration-300 ${val ? "bg-[#00FF88]" : "bg-white/15"}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${val ? "left-[26px]" : "left-0.5"}`} />
            </button>
          </div>
        ))}

        <div className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4">
          <div className="text-white font-medium text-sm mb-3">Единицы веса</div>
          <div className="flex gap-2">
            {(["kg", "lb"] as const).map(u => (
              <button key={u} onClick={() => setWeightUnit(u)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${weightUnit === u ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}>
                {u === "kg" ? "Кг" : "Фунты"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00FF88]/15 border border-[#00FF88]/25 flex items-center justify-center text-lg">💪</div>
          <div>
            <div className="text-white font-semibold">FitTrack</div>
            <div className="text-white/35 text-xs">v1.0 · Профессиональный трекер</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ────────────────────────────────────────────────────────────────────────

export default function Index() {
  const [days, setDays] = useState<TrainingDay[]>(INITIAL_DAYS);
  const [activeTab, setActiveTab] = useState<Tab>("days");
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null);
  const [showAddDay, setShowAddDay] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const addDay = (day: TrainingDay) => { setDays(ds => [...ds, day]); showToast("Тренировочный день создан"); };
  const updateDay = (updated: TrainingDay) => {
    setDays(ds => ds.map(d => d.id === updated.id ? updated : d));
    if (selectedDay?.id === updated.id) setSelectedDay(updated);
  };
  const deleteDay = (id: string) => { setDays(ds => ds.filter(d => d.id !== id)); showToast("День удалён"); };
  const cloneDay = (day: TrainingDay) => {
    const cloned: TrainingDay = {
      ...day, id: uid(), name: `${day.name} (копия)`,
      date: new Date().toISOString().slice(0, 10),
      exercises: day.exercises.map(ex => ({ ...ex, id: uid(), sets: ex.sets.map(s => ({ ...s, id: uid(), done: false })) }))
    };
    setDays(ds => [...ds, cloned]);
    showToast("День дублирован ✓");
  };
  const applyTemplate = (t: Template) => {
    const day: TrainingDay = {
      id: uid(), name: t.name, date: new Date().toISOString().slice(0, 10), muscleGroup: t.muscleGroup,
      exercises: t.exercises.map(te => ({
        id: uid(), name: te.name, muscleGroup: te.muscleGroup, collapsed: false,
        sets: Array(te.setsCount).fill(null).map(() => ({ id: uid(), type: "working" as SetType, weight: 0, reps: 10, rpe: 0, done: false }))
      }))
    };
    setDays(ds => [...ds, day]);
    setActiveTab("days");
    showToast(`Шаблон «${t.name}» применён`);
  };

  const sortedDays = [...days].sort((a, b) => b.date.localeCompare(a.date));

  if (selectedDay) {
    const current = days.find(d => d.id === selectedDay.id) || selectedDay;
    return (
      <div className="font-golos">
        <DayScreen day={current} onUpdate={updateDay} onBack={() => setSelectedDay(null)} />
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C22] border border-white/15 rounded-2xl px-5 py-3 text-white text-sm font-medium shadow-2xl animate-fade-in flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00FF88]" />{toast}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111114] font-golos">
      <div className="glass sticky top-0 z-30 border-b border-white/6 px-4 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white/35 text-xs font-medium tracking-widest uppercase">FitTrack</div>
            <h1 className="text-white font-bold text-2xl mt-0.5">
              {activeTab === "days" && "Тренировки"}
              {activeTab === "templates" && "Шаблоны"}
              {activeTab === "stats" && "Прогресс"}
              {activeTab === "settings" && "Настройки"}
            </h1>
          </div>
          {activeTab === "days" && (
            <button onClick={() => setShowAddDay(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-black font-bold transition-all active:scale-90"
              style={{ background: "#00FF88", boxShadow: "0 0 20px rgba(0,255,136,0.35)" }}
            >
              <Icon name="Plus" size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="pt-2">
        {activeTab === "days" && (
          <div className="px-4 pt-3 pb-32">
            {sortedDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-24 pb-12 text-center animate-fade-in">
                <div className="text-6xl mb-5">🏋️‍♂️</div>
                <div className="text-white font-bold text-xl mb-2">Начни первую тренировку</div>
                <div className="text-white/35 text-sm mb-8 max-w-xs leading-relaxed">Создай тренировочный день, добавь упражнения и отслеживай прогресс</div>
                <button onClick={() => setShowAddDay(true)}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-black font-bold text-base transition-all active:scale-95"
                  style={{ background: "#00FF88", boxShadow: "0 0 30px rgba(0,255,136,0.4)" }}
                >
                  <Icon name="Plus" size={20} />Создать первую тренировку
                </button>
              </div>
            ) : (
              <>
                <div className="bg-[#1C1C22] border border-white/8 rounded-2xl p-4 mb-4">
                  <div className="text-white/40 text-xs mb-3 uppercase tracking-wider font-medium">Эта неделя</div>
                  <div className="flex gap-4">
                    {[
                      { v: (() => { const now = new Date(); const weekAgo = new Date(now.getTime() - 7*24*60*60*1000); return sortedDays.filter(d => { const dd = new Date(d.date); return dd >= weekAgo && dd <= now; }).length; })(), l: "тренировок" },
                      { v: sortedDays.reduce((s, d) => s + d.exercises.length, 0), l: "упражнений" },
                      { v: sortedDays.reduce((s, d) => s + getDayTonnage(d), 0), l: "кг тоннаж" },
                    ].map(({ v, l }) => (
                      <div key={l} className="flex-1 text-center">
                        <div className="text-[#00FF88] font-bold text-xl">{v}</div>
                        <div className="text-white/30 text-xs">{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {sortedDays.map(day => (
                  <DayCard key={day.id} day={day} onClick={() => setSelectedDay(day)} onDelete={() => deleteDay(day.id)} onClone={() => cloneDay(day)} />
                ))}
              </>
            )}
          </div>
        )}
        {activeTab === "templates" && <TemplatesTab onApply={applyTemplate} />}
        {activeTab === "stats" && <StatsTab days={days} />}
        {activeTab === "settings" && <SettingsTab />}
      </div>

      <nav className="bottom-nav">
        <div className="flex items-center justify-around px-2 py-2">
          {([
            { tab: "days",      icon: "Calendar",  label: "Дни" },
            { tab: "templates", icon: "Layout",     label: "Шаблоны" },
            { tab: "stats",     icon: "BarChart2",  label: "Прогресс" },
            { tab: "settings",  icon: "Settings",   label: "Настройки" },
          ] as { tab: Tab; icon: string; label: string }[]).map(({ tab, icon, label }) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative ${activeTab === tab ? "tab-active" : "text-white/30 hover:text-white/60"}`}
            >
              <Icon name={icon} fallback="Circle" size={22} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AddDayModal open={showAddDay} onClose={() => setShowAddDay(false)} onAdd={addDay} />

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C22] border border-[#00FF88]/25 rounded-2xl px-5 py-3 text-white text-sm font-medium shadow-2xl animate-fade-in flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00FF88]" />{toast}
        </div>
      )}
    </div>
  );
}