import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── Types ──────────────────────────────────────────────────────────────────

type SetType = "warmup" | "working" | "failure" | "dropset";
type Tab = "days" | "settings";

interface WorkSet {
  id: string;
  type: SetType;
  weight: number;
  reps: number;
  done: boolean;
}

interface Exercise {
  id: string;
  name: string;
  muscle: string;
  sets: WorkSet[];
}

interface TrainingDay {
  id: string;
  name: string;
  date: string;
  muscle: string;
  exercises: Exercise[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MUSCLES = ["Грудь", "Спина", "Ноги", "Плечи", "Руки", "Кардио"];
const MUSCLE_EMOJI: Record<string, string> = {
  Грудь: "🫀", Спина: "🔙", Ноги: "🦵", Плечи: "💪", Руки: "🤜", Кардио: "❤️",
};

const SET_TYPES: { value: SetType; label: string; color: string }[] = [
  { value: "warmup",  label: "Разминка",  color: "#F5A623" },
  { value: "working", label: "Рабочий",   color: "#00FF88" },
  { value: "failure", label: "Отказ",     color: "#FF4D4D" },
  { value: "dropset", label: "Дроп-сет",  color: "#B44FFF" },
];

const EXERCISES: { name: string; muscle: string }[] = [
  { name: "Жим лёжа",            muscle: "Грудь" },
  { name: "Жим гантелей",        muscle: "Грудь" },
  { name: "Разводка",            muscle: "Грудь" },
  { name: "Отжимания",           muscle: "Грудь" },
  { name: "Подтягивания",        muscle: "Спина" },
  { name: "Тяга штанги",         muscle: "Спина" },
  { name: "Тяга гантели",        muscle: "Спина" },
  { name: "Гиперэкстензия",      muscle: "Спина" },
  { name: "Приседания",          muscle: "Ноги"  },
  { name: "Жим ногами",          muscle: "Ноги"  },
  { name: "Мёртвая тяга",        muscle: "Ноги"  },
  { name: "Выпады",              muscle: "Ноги"  },
  { name: "Жим стоя",            muscle: "Плечи" },
  { name: "Разводка в стороны",  muscle: "Плечи" },
  { name: "Тяга к подбородку",   muscle: "Плечи" },
  { name: "Бицепс",              muscle: "Руки"  },
  { name: "Молоток",             muscle: "Руки"  },
  { name: "Трицепс",             muscle: "Руки"  },
  { name: "Французский жим",     muscle: "Руки"  },
  { name: "Бег",                 muscle: "Кардио"},
  { name: "Велотренажёр",        muscle: "Кардио"},
  { name: "Скакалка",            muscle: "Кардио"},
];

const SAMPLE_DAYS: TrainingDay[] = [
  {
    id: "d1", name: "Грудь + Трицепс", date: "2026-04-25", muscle: "Грудь",
    exercises: [
      { id: "e1", name: "Жим лёжа", muscle: "Грудь", sets: [
        { id: "s1", type: "warmup",  weight: 60, reps: 12, done: true  },
        { id: "s2", type: "working", weight: 80, reps: 10, done: true  },
        { id: "s3", type: "working", weight: 80, reps: 8,  done: false },
      ]},
      { id: "e2", name: "Отжимания", muscle: "Грудь", sets: [
        { id: "s4", type: "working", weight: 0,  reps: 15, done: false },
        { id: "s5", type: "working", weight: 0,  reps: 12, done: false },
      ]},
    ]
  },
];

// ─── Utils ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const tonnage = (day: TrainingDay) => day.exercises.flatMap(e => e.sets).reduce((a, s) => a + s.weight * s.reps, 0);

// ─── Action Menu (center popup) ──────────────────────────────────────────────

function ActionMenu({ open, onClose, actions }: {
  open: boolean; onClose: () => void;
  actions: { label: string; icon: string; danger?: boolean; onClick: () => void }[];
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xs animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="bg-[#242429] rounded-3xl overflow-hidden border border-white/8">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => { a.onClick(); onClose(); }}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors active:bg-white/8 ${i > 0 ? "border-t border-white/6" : ""} ${a.danger ? "text-red-400" : "text-white/80"}`}
            >
              <Icon name={a.icon} fallback="Circle" size={20} className={a.danger ? "text-red-400" : "text-white/50"} />
              <span className="text-base font-medium">{a.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-4 rounded-3xl bg-[#242429] border border-white/8 text-white/60 font-semibold text-base active:bg-white/10 transition-colors">
          Отмена
        </button>
      </div>
    </div>
  );
}

// ─── Bottom Sheet Modal ──────────────────────────────────────────────────────

function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full bg-[#1A1A1E] rounded-t-3xl border-t border-white/8 max-h-[88vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4">
          <div className="w-10 h-1 rounded-full bg-white/15 absolute top-3 left-1/2 -translate-x-1/2" />
          {title && <h3 className="text-white font-bold text-lg">{title}</h3>}
          <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-white/50">
            <Icon name="X" size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-8 scrollbar-hide">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

function Confirm({ open, onClose, onOk, text }: {
  open: boolean; onClose: () => void; onOk: () => void; text: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-[#242429] rounded-2xl p-6 w-full max-w-sm animate-scale-in">
        <p className="text-white/80 text-sm text-center mb-6 leading-relaxed">{text}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-white/8 text-white/70 font-medium text-sm">Отмена</button>
          <button onClick={() => { onOk(); onClose(); }} className="flex-1 py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm">Удалить</button>
        </div>
      </div>
    </div>
  );
}

// ─── Rest Timer Widget ───────────────────────────────────────────────────────

function RestTimer({ onClose }: { onClose: () => void }) {
  const TOTAL = 90;
  const [sec, setSec] = useState(TOTAL);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running || sec <= 0) return;
    const t = setInterval(() => setSec(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [sec, running]);

  const pct = ((TOTAL - sec) / TOTAL) * 100;
  const r = 28, C = 2 * Math.PI * r;
  const done = sec <= 0;
  const urgent = sec > 0 && sec <= 10;

  return (
    <div className="fixed bottom-28 left-4 right-4 z-40 animate-slide-up">
      <div className="bg-[#1A1A1E] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
        <svg width={68} height={68} className="-rotate-90 flex-shrink-0">
          <circle cx={34} cy={34} r={r} stroke="#2C2C34" strokeWidth={4} fill="none" />
          <circle cx={34} cy={34} r={r}
            stroke={done ? "#00FF88" : urgent ? "#FF4D4D" : "#00FF88"}
            strokeWidth={4} fill="none"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className={`absolute left-4 flex items-center justify-center`} style={{ width: 68, height: 68 }}>
          <span className={`text-sm font-bold font-mono ${done ? "neon-text" : urgent ? "text-red-400" : "text-white"}`}>
            {done ? "✓" : fmtTime(sec)}
          </span>
        </div>
        <div className="flex-1 ml-1">
          <div className="text-white font-semibold text-sm">{done ? "Время! Начинай 💪" : "Отдых"}</div>
          <div className="text-white/40 text-xs mt-0.5">{done ? "" : `Осталось ${fmtTime(sec)}`}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setRunning(r => !r)} className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-white/60">
            <Icon name={running ? "Pause" : "Play"} size={16} />
          </button>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-white/60">
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Set Row ─────────────────────────────────────────────────────────────────

function SetRow({ set, index, onUpdate, onDelete, onRest }: {
  set: WorkSet; index: number;
  onUpdate: (s: WorkSet) => void; onDelete: () => void; onRest: () => void;
}) {
  const info = SET_TYPES.find(t => t.value === set.type)!;

  const toggle = () => { onUpdate({ ...set, done: !set.done }); if (!set.done) onRest(); };

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 transition-opacity ${set.done ? "opacity-50" : ""}`}>
      {/* Done checkbox */}
      <button onClick={toggle}
        className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${set.done ? "bg-[#00FF88] border-[#00FF88]" : "border-white/20"}`}
      >
        {set.done && <Icon name="Check" size={14} className="text-black" />}
      </button>

      {/* Index */}
      <span className="text-white/30 text-xs w-4 text-center flex-shrink-0">{index + 1}</span>

      {/* Type dot */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: info.color }} />

      {/* Weight input */}
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number" inputMode="decimal" value={set.weight || ""}
          onChange={e => onUpdate({ ...set, weight: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          className={`w-16 text-center font-bold text-base bg-[#242429] rounded-xl py-2 border border-white/8 text-white outline-none focus:border-[#00FF88]/60 transition-colors ${set.done ? "line-through" : ""}`}
        />
        <span className="text-white/30 text-xs">кг</span>
      </div>

      {/* Reps stepper */}
      <div className="flex items-center gap-2">
        <button onClick={() => onUpdate({ ...set, reps: Math.max(1, set.reps - 1) })}
          className="w-8 h-8 rounded-xl bg-white/8 text-white text-lg flex items-center justify-center active:bg-white/15">−</button>
        <span className={`text-base font-bold text-white w-7 text-center ${set.done ? "line-through" : ""}`}>{set.reps}</span>
        <button onClick={() => onUpdate({ ...set, reps: set.reps + 1 })}
          className="w-8 h-8 rounded-xl bg-white/8 text-white text-lg flex items-center justify-center active:bg-white/15">+</button>
      </div>

      {/* Delete */}
      <button onClick={onDelete} className="w-8 h-8 rounded-xl bg-white/5 text-white/25 flex items-center justify-center active:bg-red-500/20 active:text-red-400">
        <Icon name="Trash2" size={14} />
      </button>
    </div>
  );
}

// ─── Exercise Card ───────────────────────────────────────────────────────────

function ExCard({ ex, onUpdate, onDelete, onClone }: {
  ex: Exercise; onUpdate: (e: Exercise) => void; onDelete: () => void; onClone: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [rest, setRest] = useState(false);

  const done = ex.sets.filter(s => s.done).length;
  const total = ex.sets.length;
  const maxW = Math.max(...ex.sets.map(s => s.weight), 0);

  const addSet = () => {
    const last = ex.sets[ex.sets.length - 1];
    onUpdate({ ...ex, sets: [...ex.sets, { id: uid(), type: last?.type || "working", weight: last?.weight || 0, reps: last?.reps || 10, done: false }] });
  };
  const updSet = (i: number, s: WorkSet) => { const ss = [...ex.sets]; ss[i] = s; onUpdate({ ...ex, sets: ss }); };
  const delSet = (i: number) => onUpdate({ ...ex, sets: ex.sets.filter((_, j) => j !== i) });

  return (
    <>
      <Confirm open={confirm} onClose={() => setConfirm(false)} onOk={onDelete} text={`Удалить «${ex.name}»?`} />
      <ActionMenu
        open={menu} onClose={() => setMenu(false)}
        actions={[
          { label: open ? "Свернуть" : "Развернуть", icon: open ? "ChevronUp" : "ChevronDown", onClick: () => setOpen(o => !o) },
          { label: "Дублировать", icon: "Copy", onClick: onClone },
          { label: "Удалить", icon: "Trash2", danger: true, onClick: () => setConfirm(true) },
        ]}
      />
      {rest && <RestTimer onClose={() => setRest(false)} />}

      <div className="bg-[#1A1A1E] rounded-2xl border border-white/8 mb-3 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <span className="text-2xl flex-shrink-0">{MUSCLE_EMOJI[ex.muscle] || "💪"}</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-base truncate">{ex.name}</div>
              <div className="text-white/35 text-xs mt-0.5">{total} подх · макс {maxW} кг</div>
            </div>
          </button>
          {done > 0 && (
            <div className="bg-[#00FF88]/12 border border-[#00FF88]/20 rounded-lg px-2.5 py-1 flex-shrink-0">
              <span className="text-[#00FF88] text-xs font-bold">{done}/{total}</span>
            </div>
          )}
          <button onClick={() => setMenu(true)} className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center text-white/40 active:bg-white/12 flex-shrink-0">
            <Icon name="MoreVertical" size={18} />
          </button>
        </div>

        {open && (
          <div className="border-t border-white/6">
            {ex.sets.map((s, i) => (
              <SetRow key={s.id} set={s} index={i}
                onUpdate={ns => updSet(i, ns)}
                onDelete={() => delSet(i)}
                onRest={() => setRest(true)}
              />
            ))}
            <button onClick={addSet} className="w-full py-3.5 text-white/40 text-sm flex items-center justify-center gap-1.5 active:bg-white/4 transition-colors">
              <Icon name="Plus" size={15} /> Добавить подход
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Exercise Picker ─────────────────────────────────────────────────────────

function ExPicker({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (name: string, muscle: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Все");
  const [custom, setCustom] = useState(false);
  const [cName, setCName] = useState("");
  const [cMuscle, setCMuscle] = useState("Грудь");

  const list = EXERCISES.filter(e =>
    (filter === "Все" || e.muscle === filter) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const close = () => { setSearch(""); setFilter("Все"); setCustom(false); setCName(""); onClose(); };

  return (
    <Sheet open={open} onClose={close} title={custom ? "Своё упражнение" : "Упражнение"}>
      {!custom ? (
        <>
          <div className="relative mb-3">
            <Icon name="Search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
              className="w-full bg-[#242429] rounded-2xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none border border-white/8 focus:border-[#00FF88]/40"
            />
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
            {["Все", ...MUSCLES].map(m => (
              <button key={m} onClick={() => setFilter(m)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === m ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}
              >{m}</button>
            ))}
          </div>
          <div className="space-y-1">
            {list.map(e => (
              <button key={e.name} onClick={() => { onAdd(e.name, e.muscle); close(); }}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-2xl active:bg-white/8 transition-colors text-left"
              >
                <span className="text-xl w-8 text-center">{MUSCLE_EMOJI[e.muscle]}</span>
                <div>
                  <div className="text-white text-sm font-medium">{e.name}</div>
                  <div className="text-white/35 text-xs">{e.muscle}</div>
                </div>
              </button>
            ))}
            {!list.length && <div className="text-white/30 text-sm text-center py-8">Ничего не найдено</div>}
          </div>
          <button onClick={() => setCustom(true)} className="w-full mt-4 py-4 rounded-2xl border border-dashed border-[#00FF88]/25 text-[#00FF88]/70 text-sm font-medium">
            + Создать своё
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <input type="text" value={cName} onChange={e => setCName(e.target.value)} placeholder="Название" autoFocus
            className="w-full bg-[#242429] rounded-2xl py-3.5 px-4 text-sm text-white placeholder-white/30 outline-none border border-white/8 focus:border-[#00FF88]/40"
          />
          <div className="flex gap-2 flex-wrap">
            {MUSCLES.map(m => (
              <button key={m} onClick={() => setCMuscle(m)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${cMuscle === m ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}
              >{m}</button>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setCustom(false)} className="flex-1 py-3.5 rounded-2xl bg-white/8 text-white/70 font-medium text-sm">Назад</button>
            <button
              disabled={!cName.trim()}
              onClick={() => { onAdd(cName.trim(), cMuscle); close(); }}
              className="flex-1 py-3.5 rounded-2xl bg-[#00FF88] text-black font-bold text-sm disabled:opacity-40"
            >Добавить</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ─── Add Day Sheet ────────────────────────────────────────────────────────────

function AddDaySheet({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (d: TrainingDay) => void;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [muscle, setMuscle] = useState("Грудь");

  const create = () => {
    if (!name.trim()) return;
    onAdd({ id: uid(), name: name.trim(), date, muscle, exercises: [] });
    setName(""); setDate(new Date().toISOString().slice(0, 10)); setMuscle("Грудь"); onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Новая тренировка">
      <div className="space-y-4">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Название (напр. Грудь + Трицепс)" autoFocus
          className="w-full bg-[#242429] rounded-2xl py-3.5 px-4 text-sm text-white placeholder-white/30 outline-none border border-white/8 focus:border-[#00FF88]/40"
        />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-[#242429] rounded-2xl py-3.5 px-4 text-sm text-white outline-none border border-white/8 focus:border-[#00FF88]/40"
          style={{ colorScheme: "dark" }}
        />
        <div>
          <div className="text-white/40 text-xs mb-2">Группа мышц</div>
          <div className="flex gap-2 flex-wrap">
            {MUSCLES.map(m => (
              <button key={m} onClick={() => setMuscle(m)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${muscle === m ? "bg-[#00FF88] text-black" : "bg-white/8 text-white/60"}`}
              >{MUSCLE_EMOJI[m]} {m}</button>
            ))}
          </div>
        </div>
        <button onClick={create} disabled={!name.trim()}
          className="w-full py-4 rounded-2xl bg-[#00FF88] text-black font-bold text-base disabled:opacity-40 mt-2"
        >Создать</button>
      </div>
    </Sheet>
  );
}

// ─── Day Card ─────────────────────────────────────────────────────────────────

function DayCard({ day, onClick, onDelete, onClone }: {
  day: TrainingDay; onClick: () => void; onDelete: () => void; onClone: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ton = tonnage(day);

  return (
    <>
      <Confirm open={confirm} onClose={() => setConfirm(false)} onOk={onDelete} text={`Удалить «${day.name}»?`} />
      <ActionMenu
        open={menu} onClose={() => setMenu(false)}
        actions={[
          { label: "Открыть", icon: "ArrowRight", onClick: onClick },
          { label: "Дублировать", icon: "Copy", onClick: onClone },
          { label: "Удалить", icon: "Trash2", danger: true, onClick: () => setConfirm(true) },
        ]}
      />
      <div className="bg-[#1A1A1E] rounded-2xl border border-white/8 mb-3 overflow-hidden animate-fade-in">
        <div className="flex items-center gap-4 px-4 py-4">
          <button onClick={onClick} className="flex items-center gap-4 flex-1 min-w-0 text-left active:opacity-70 transition-opacity">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-white/6">
              {MUSCLE_EMOJI[day.muscle] || "💪"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-base truncate">{day.name}</div>
              <div className="text-white/40 text-sm mt-0.5">
                {fmtDate(day.date)} · {day.exercises.length} упр.{ton > 0 ? ` · ${ton} кг` : ""}
              </div>
            </div>
          </button>
          <button
            onClick={() => setMenu(true)}
            className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center text-white/40 active:bg-white/12 flex-shrink-0"
          >
            <Icon name="MoreVertical" size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Day Screen ───────────────────────────────────────────────────────────────

function DayScreen({ day, onUpdate, onBack }: {
  day: TrainingDay; onUpdate: (d: TrainingDay) => void; onBack: () => void;
}) {
  const [picker, setPicker] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allSets = day.exercises.flatMap(e => e.sets);
  const done = allSets.filter(s => s.done).length;

  useEffect(() => {
    if (done > 0 && !started) {
      setStarted(true);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [done]);

  const addEx = (name: string, muscle: string) => {
    onUpdate({ ...day, exercises: [...day.exercises, { id: uid(), name, muscle, sets: [{ id: uid(), type: "working", weight: 0, reps: 10, done: false }] }] });
  };
  const updEx = (i: number, ex: Exercise) => { const arr = [...day.exercises]; arr[i] = ex; onUpdate({ ...day, exercises: arr }); };
  const delEx = (i: number) => onUpdate({ ...day, exercises: day.exercises.filter((_, j) => j !== i) });
  const cloneEx = (i: number) => {
    const ex = day.exercises[i];
    const cloned = { ...ex, id: uid(), sets: ex.sets.map(s => ({ ...s, id: uid(), done: false })) };
    const arr = [...day.exercises]; arr.splice(i + 1, 0, cloned);
    onUpdate({ ...day, exercises: arr });
  };

  return (
    <>
      <ExPicker open={picker} onClose={() => setPicker(false)} onAdd={addEx} />
      <div className="min-h-screen bg-[#111114]">
        {/* Header */}
        <div className="glass sticky top-0 z-30 border-b border-white/6 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 rounded-2xl bg-white/8 flex items-center justify-center text-white/60 active:bg-white/15">
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-lg truncate">{day.name}</h1>
              <div className="text-white/35 text-xs">{fmtDate(day.date)}</div>
            </div>
            {started && (
              <div className="flex items-center gap-2 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded-2xl px-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] pulse-neon" />
                <span className="text-[#00FF88] font-mono font-bold text-sm">{fmtTime(elapsed)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 pb-36">
          {day.exercises.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏋️</div>
              <div className="text-white/50 font-medium mb-1">Нет упражнений</div>
              <div className="text-white/25 text-sm">Нажмите кнопку внизу</div>
            </div>
          )}

          {day.exercises.map((ex, i) => (
            <ExCard key={ex.id} ex={ex} onUpdate={e => updEx(i, e)} onDelete={() => delEx(i)} onClone={() => cloneEx(i)} />
          ))}
        </div>

        {/* FAB */}
        <div className="fixed bottom-6 inset-x-4 z-30">
          <button onClick={() => setPicker(true)}
            className="w-full py-4 rounded-2xl text-black font-bold text-base flex items-center justify-center gap-2 active:scale-98 transition-transform"
            style={{ background: "#00FF88", boxShadow: "0 0 24px rgba(0,255,136,.35)" }}
          >
            <Icon name="Plus" size={20} /> Добавить упражнение
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [rest, setRest] = useState(90);
  const [vib, setVib] = useState(true);

  return (
    <div className="px-4 pt-4 pb-32 space-y-3">
      <div className="bg-[#1A1A1E] border border-white/8 rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-white font-medium">Время отдыха</div>
            <div className="text-white/35 text-xs mt-0.5">Между подходами</div>
          </div>
          <span className="text-[#00FF88] font-bold text-lg">{rest}с</span>
        </div>
        <input type="range" min={30} max={300} step={15} value={rest} onChange={e => setRest(+e.target.value)} className="w-full" />
        <div className="flex justify-between text-white/20 text-xs mt-1"><span>30с</span><span>5 мин</span></div>
      </div>

      <div className="bg-[#1A1A1E] border border-white/8 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="text-white font-medium">Вибрация</div>
          <div className="text-white/35 text-xs mt-0.5">При отметке подхода</div>
        </div>
        <button onClick={() => setVib(v => !v)} className={`w-14 h-7 rounded-full relative transition-all ${vib ? "bg-[#00FF88]" : "bg-white/15"}`}>
          <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${vib ? "left-[32px]" : "left-0.5"}`} />
        </button>
      </div>

      <div className="bg-[#1A1A1E] border border-white/8 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/12 border border-[#00FF88]/20 flex items-center justify-center text-2xl">💪</div>
        <div>
          <div className="text-white font-bold text-base">FitTrack</div>
          <div className="text-white/35 text-sm">Версия 1.0</div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function Index() {
  const [days, setDays] = useState<TrainingDay[]>(SAMPLE_DAYS);
  const [tab, setTab] = useState<Tab>("days");
  const [selected, setSelected] = useState<TrainingDay | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const addDay = (d: TrainingDay) => { setDays(ds => [d, ...ds]); showToast("Тренировка создана"); };
  const updateDay = (d: TrainingDay) => { setDays(ds => ds.map(x => x.id === d.id ? d : x)); if (selected?.id === d.id) setSelected(d); };
  const deleteDay = (id: string) => { setDays(ds => ds.filter(d => d.id !== id)); showToast("Удалено"); };
  const cloneDay = (day: TrainingDay) => {
    const c = { ...day, id: uid(), name: `${day.name} (копия)`, date: new Date().toISOString().slice(0, 10), exercises: day.exercises.map(ex => ({ ...ex, id: uid(), sets: ex.sets.map(s => ({ ...s, id: uid(), done: false })) })) };
    setDays(ds => [c, ...ds]); showToast("Дублировано");
  };;

  if (selected) {
    const cur = days.find(d => d.id === selected.id) || selected;
    return (
      <>
        <DayScreen day={cur} onUpdate={updateDay} onBack={() => setSelected(null)} />
        {toast && <Toast msg={toast} />}
      </>
    );
  }

  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-[#111114]">
      {/* Header */}
      <div className="glass border-b border-white/6 px-5 pt-12 pb-5 flex items-end justify-between">
        <div>
          <div className="text-white/30 text-xs uppercase tracking-widest mb-1">FitTrack</div>
          <h1 className="text-white font-bold text-3xl">
            {tab === "days" && "Тренировки"}
            {tab === "settings" && "Настройки"}
          </h1>
        </div>
        {tab === "days" && (
          <button onClick={() => setAddOpen(true)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-black"
            style={{ background: "#00FF88", boxShadow: "0 0 20px rgba(0,255,136,.4)" }}
          >
            <Icon name="Plus" size={22} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="pb-24">
        {tab === "days" && (
          <div className="px-4 pt-5">
            {sorted.length === 0 ? (
              <div className="text-center pt-24">
                <div className="text-6xl mb-5">🏋️‍♂️</div>
                <div className="text-white font-bold text-xl mb-2">Начни тренировку</div>
                <div className="text-white/35 text-sm mb-8">Нажми + чтобы создать первый день</div>
                <button onClick={() => setAddOpen(true)}
                  className="px-8 py-4 rounded-2xl text-black font-bold text-base"
                  style={{ background: "#00FF88", boxShadow: "0 0 24px rgba(0,255,136,.4)" }}
                >Создать тренировку</button>
              </div>
            ) : (
              sorted.map(d => (
                <DayCard key={d.id} day={d} onClick={() => setSelected(d)} onDelete={() => deleteDay(d.id)} onClone={() => cloneDay(d)} />
              ))
            )}
          </div>
        )}
        {tab === "settings" && <SettingsTab />}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#111114]/95 backdrop-blur-xl border-t border-white/6 pb-safe">
        <div className="flex items-center justify-around py-2 px-4">
          {([
            { t: "days" as Tab,     i: "Calendar",  l: "Дни" },
            { t: "settings" as Tab, i: "Settings",  l: "Настройки" },
          ]).map(({ t, i, l }) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex flex-col items-center gap-1 py-2 px-6 rounded-2xl transition-all relative ${tab === t ? "text-[#00FF88]" : "text-white/30"}`}
            >
              <Icon name={i} fallback="Circle" size={24} />
              <span className="text-xs font-medium">{l}</span>
              {tab === t && <div className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-[#00FF88]" />}
            </button>
          ))}
        </div>
      </nav>

      <AddDaySheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={addDay} />
      {toast && <Toast msg={toast} />}
    </div>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] animate-fade-in">
      <div className="bg-[#1A1A1E] border border-[#00FF88]/20 rounded-2xl px-5 py-3 text-white text-sm font-medium shadow-2xl flex items-center gap-2 whitespace-nowrap">
        <div className="w-2 h-2 rounded-full bg-[#00FF88]" />{msg}
      </div>
    </div>
  );
}