import { useMemo, useState } from "react";
import {
  actions,
  computeBadges,
  CARE_TIPS,
  daysSince,
  daysUntilNext,
  downloadIcs,
  googleCalendarUrl,
  nextWaterDate,
  PLANT_EMOJI,
  PLANT_TYPES,
  sfx,
  useAppState,
  WATER_INTERVAL_DAYS,
  type Plant,
  type PlantType,
} from "@/lib/plant-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Trash2, Droplet, Coins, Flame, Sprout, Volume2, VolumeX } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---------- decorative pieces ---------- */

function SkyDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute top-4 left-0 text-3xl opacity-90 cloud-drift"
        style={{ animationDelay: "0s" }}
        aria-hidden
      >
        ☁️
      </div>
      <div
        className="absolute top-16 left-0 text-2xl opacity-80 cloud-drift"
        style={{ animationDelay: "-20s", animationDuration: "80s" }}
        aria-hidden
      >
        ☁️
      </div>
      <div
        className="absolute top-28 left-0 text-xl opacity-70 cloud-drift"
        style={{ animationDelay: "-45s", animationDuration: "100s" }}
        aria-hidden
      >
        ☁️
      </div>
    </div>
  );
}

function Pipe({ children }: { children: React.ReactNode }) {
  return (
    <div className="pixel-box pipe-bg text-white p-3 pixel-text text-[10px] sm:text-xs">
      {children}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "default" | "coin" | "streak";
}) {
  const bg =
    tone === "coin"
      ? "bg-[var(--color-coin)]"
      : tone === "streak"
        ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
        : "bg-[var(--color-card)]";
  return (
    <div className={`pixel-box-sm ${bg} p-2 sm:p-3 flex flex-col gap-1`}>
      <div className="flex items-center gap-1.5 pixel-text text-[8px] sm:text-[10px] opacity-80">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="pixel-text text-base sm:text-xl">{value}</div>
    </div>
  );
}

/* ---------- add plant ---------- */

function AddPlantDialog() {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [type, setType] = useState<PlantType>("Pothos");

  function submit() {
    actions.addPlant(nickname, type);
    sfx.powerup();
    toast.success(`${nickname || `${type} Buddy`} joined the kingdom! 🌟`);
    setNickname("");
    setType("Pothos");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="hero"
          className="pixel-text text-[10px] sm:text-xs w-full"
        >
          + ADD PLANT
        </Button>
      </DialogTrigger>
      <DialogContent className="pixel-box bg-[var(--color-card)] !rounded-none max-w-sm">
        <DialogHeader>
          <DialogTitle className="pixel-text text-sm">
            New Plant Buddy
          </DialogTitle>
          <DialogDescription className="pixel-text text-[10px] leading-relaxed">
            Choose a type and give it a nickname.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="pixel-text text-[10px]">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as PlantType)}>
              <SelectTrigger className="pixel-box-sm !rounded-none pixel-text text-xs h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="pixel-box !rounded-none">
                {PLANT_TYPES.map((t) => (
                  <SelectItem
                    key={t}
                    value={t}
                    className="pixel-text text-xs"
                  >
                    {PLANT_EMOJI[t]} {t} · every {WATER_INTERVAL_DAYS[t]}d
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="pixel-text text-[10px]">Nickname</Label>
            <Input
              className="pixel-box-sm !rounded-none pixel-text text-xs h-11"
              placeholder="Parker's Aloe"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={32}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            variant="hero"
            className="pixel-text text-[10px] w-full"
          >
            ADD TO KINGDOM
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- reminder dialog ---------- */

function ReminderDialog({
  plant,
  onClose,
}: {
  plant: Plant | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={plant !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="pixel-box bg-[var(--color-card)] !rounded-none max-w-sm">
        <DialogHeader>
          <DialogTitle className="pixel-text text-sm">
            +1 COIN! 🪙
          </DialogTitle>
          <DialogDescription className="pixel-text text-[10px] leading-relaxed">
            Schedule a reminder for the next watering on{" "}
            {plant && formatDate(nextWaterDate(plant).toISOString())}?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            variant="hero"
            className="pixel-text text-[10px] w-full"
            onClick={() => {
              if (plant) window.open(googleCalendarUrl(plant), "_blank");
              onClose();
            }}
          >
            YES → GOOGLE CALENDAR
          </Button>
          <Button
            variant="pipe"
            className="pixel-text text-[10px] w-full"
            onClick={() => {
              if (plant) downloadIcs(plant);
              onClose();
            }}
          >
            DOWNLOAD .ICS
          </Button>
          <Button
            variant="brick"
            className="pixel-text text-[10px] w-full"
            onClick={onClose}
          >
            NOT NOW
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- plant card ---------- */

function PlantCard({
  plant,
  onWatered,
}: {
  plant: Plant;
  onWatered: (p: Plant) => void;
}) {
  const [popping, setPopping] = useState(false);
  const days = daysSince(plant.lastWateredAt);
  const interval = WATER_INTERVAL_DAYS[plant.type];
  const until = daysUntilNext(plant);
  // Health = inverse of progress through interval
  const used = plant.lastWateredAt
    ? Math.min(1, Math.max(0, (days ?? 0) / interval))
    : 1;
  const healthPct = Math.max(0, Math.round((1 - used) * 100));
  const low = healthPct < 35;

  function water() {
    actions.waterPlant(plant.id);
    sfx.coin();
    setPopping(true);
    setTimeout(() => setPopping(false), 1300);
    onWatered(plant);
  }

  function remove() {
    if (confirm(`Remove ${plant.nickname}? Their log entries will also be cleared.`)) {
      actions.removePlant(plant.id);
      toast(`${plant.nickname} left the kingdom.`);
    }
  }

  return (
    <div className="pixel-box bg-[var(--color-card)] p-3 sm:p-4 relative">
      {popping && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pop-up pixel-text text-[var(--color-coin)] text-2xl drop-shadow">
          +1 🪙
        </div>
      )}
      <div className="flex items-start gap-3">
        <div
          className={`pixel-box-sm bg-[var(--color-grass)] w-14 h-14 grid place-items-center text-3xl shrink-0 ${
            popping ? "bounce-pixel" : ""
          }`}
          aria-hidden
        >
          {PLANT_EMOJI[plant.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="pixel-text text-xs sm:text-sm truncate">
                {plant.nickname}
              </h3>
              <p className="pixel-text text-[9px] opacity-70 mt-1">
                {plant.type}
              </p>
            </div>
            <button
              onClick={remove}
              aria-label={`Remove ${plant.nickname}`}
              className="pixel-box-sm bg-[var(--color-brick)] text-white p-1.5 hover:translate-y-px"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-3">
            <div className="flex justify-between pixel-text text-[8px] mb-1">
              <span>HYDRATION</span>
              <span>{healthPct}%</span>
            </div>
            <div className={`health-bar ${low ? "low" : ""}`}>
              <span style={{ width: `${healthPct}%` }} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 pixel-text text-[9px]">
            <div className="pixel-box-sm bg-[var(--color-muted)] p-1.5">
              <div className="opacity-60">LAST</div>
              <div className="mt-1">
                {plant.lastWateredAt ? `${days}d ago` : "Never"}
              </div>
            </div>
            <div className="pixel-box-sm bg-[var(--color-muted)] p-1.5">
              <div className="opacity-60">NEXT</div>
              <div className="mt-1">
                {until <= 0 ? "Now!" : `in ${until}d`}
              </div>
            </div>
          </div>

          <p className="pixel-text text-[9px] opacity-70 mt-3 leading-relaxed">
            💡 {CARE_TIPS[plant.type]}
          </p>

          <Button
            onClick={water}
            variant="hero"
            className="w-full mt-3 pixel-text text-[10px]"
          >
            <Droplet className="w-3.5 h-3.5 mr-1" /> WATER PLANT
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- log view ---------- */

function LogView() {
  const state = useAppState();
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<"new" | "old">("new");

  const entries = useMemo(() => {
    let list = state.log.slice();
    if (filter !== "all") list = list.filter((l) => l.plantId === filter);
    list.sort((a, b) =>
      sort === "new"
        ? b.wateredAt.localeCompare(a.wateredAt)
        : a.wateredAt.localeCompare(b.wateredAt),
    );
    return list;
  }, [state.log, filter, sort]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="pixel-box-sm !rounded-none pixel-text text-[10px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="pixel-box !rounded-none">
            <SelectItem value="all" className="pixel-text text-[10px]">
              All plants
            </SelectItem>
            {state.plants.map((p) => (
              <SelectItem
                key={p.id}
                value={p.id}
                className="pixel-text text-[10px]"
              >
                {p.nickname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as "new" | "old")}>
          <SelectTrigger className="pixel-box-sm !rounded-none pixel-text text-[10px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="pixel-box !rounded-none">
            <SelectItem value="new" className="pixel-text text-[10px]">
              Newest first
            </SelectItem>
            <SelectItem value="old" className="pixel-text text-[10px]">
              Oldest first
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {entries.length === 0 ? (
        <div className="pixel-box bg-[var(--color-card)] p-6 text-center pixel-text text-[10px] opacity-70">
          No activity yet. Water a plant to start the log!
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="pixel-box-sm bg-[var(--color-card)] p-3 flex items-center gap-3"
            >
              <div className="text-2xl shrink-0" aria-hidden>
                {PLANT_EMOJI[e.plantType]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="pixel-text text-[10px] truncate">
                  {e.plantNickname}{" "}
                  <span className="opacity-60">({e.plantType})</span>
                </p>
                <p className="pixel-text text-[9px] opacity-70 mt-1">
                  watered {formatDate(e.wateredAt)} · {formatTime(e.wateredAt)}
                </p>
              </div>
              <button
                onClick={() => actions.deleteLog(e.id)}
                className="pixel-box-sm bg-[var(--color-brick)] text-white p-1.5 shrink-0"
                aria-label="Delete log entry"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- dashboard ---------- */

function Dashboard() {
  const state = useAppState();
  const wateredThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000;
    return state.log.filter((l) => new Date(l.wateredAt).getTime() >= cutoff)
      .length;
  }, [state.log]);
  const upcoming = useMemo(
    () =>
      state.plants
        .map((p) => ({ p, until: daysUntilNext(p) }))
        .sort((a, b) => a.until - b.until)
        .slice(0, 3),
    [state.plants],
  );
  const badges = computeBadges(state);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatTile
          icon={<Sprout className="w-3 h-3" />}
          label="PLANTS"
          value={state.plants.length}
        />
        <StatTile
          icon={<Droplet className="w-3 h-3" />}
          label="THIS WEEK"
          value={wateredThisWeek}
        />
        <StatTile
          icon={<Coins className="w-3 h-3" />}
          label="COINS"
          value={state.coins}
          tone="coin"
        />
        <StatTile
          icon={<Flame className="w-3 h-3" />}
          label="STREAK"
          value={`${state.streak}d`}
          tone="streak"
        />
        <StatTile
          icon={<span aria-hidden>⏰</span>}
          label="DUE SOON"
          value={upcoming.filter((u) => u.until <= 1).length}
        />
        <StatTile
          icon={<span aria-hidden>🏆</span>}
          label="BADGES"
          value={badges.filter((b) => b.unlocked).length}
        />
      </div>

      <Pipe>
        <div className="flex items-center gap-2 mb-2">
          <span aria-hidden>🟢</span>
          <span>UPCOMING WATERINGS</span>
        </div>
        {upcoming.length === 0 ? (
          <p className="opacity-80">Add a plant to see your schedule.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {upcoming.map(({ p, until }) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {PLANT_EMOJI[p.type]} {p.nickname}
                </span>
                <span className="shrink-0 pixel-box-sm bg-[var(--color-coin)] text-[var(--color-foreground)] px-1.5 py-0.5">
                  {until <= 0 ? "NOW" : `${until}d`} · {formatDate(nextWaterDate(p).toISOString())}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Pipe>

      <div className="pixel-box bg-[var(--color-card)] p-3">
        <h2 className="pixel-text text-xs mb-3 flex items-center gap-2">
          🏅 BADGES
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`pixel-box-sm p-2 text-center ${
                b.unlocked
                  ? "bg-[var(--color-coin)]"
                  : "bg-[var(--color-muted)] opacity-60"
              }`}
              title={b.description}
            >
              <div className="text-2xl">{b.icon}</div>
              <div className="pixel-text text-[8px] mt-1 leading-tight">
                {b.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pixel-box bg-[var(--color-card)] p-3">
        <h2 className="pixel-text text-xs mb-2">🚧 COMING SOON</h2>
        <ul className="pixel-text text-[10px] opacity-80 flex flex-col gap-1.5">
          <li>🌾 Fertilizing reminders</li>
          <li>🪴 Repotting reminders</li>
          <li>📈 Plant growth tracking</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- root ---------- */

export function PlantKingdomApp() {
  const state = useAppState();
  const [reminder, setReminder] = useState<Plant | null>(null);
  const [muted, setMuted] = useState(false);
  const [dark, setDark] = useState(false);

  function onWatered(p: Plant) {
    setReminder({ ...p, lastWateredAt: new Date().toISOString() });
  }

  // Patch sfx if muted
  const wrappedSfx = useMemo(() => {
    if (!muted) return;
    // monkey patch: temporarily no-op while muted via overriding methods
    sfx.coin = () => {};
    sfx.jump = () => {};
    sfx.powerup = () => {};
  }, [muted]);
  void wrappedSfx;

  return (
    <div
      className={`${dark ? "dark" : ""} min-h-screen relative overflow-x-hidden`}
      style={{ backgroundColor: "var(--color-sky)" }}
    >
      <SkyDecor />
      {/* Header (brick) */}
      <header className="relative brick-bg pixel-box border-b-0 !shadow-none px-4 py-4 sm:py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <h1 className="pixel-text text-white text-xs sm:text-sm leading-tight drop-shadow-[2px_2px_0_var(--color-border)]">
            PLANT
            <br />
            KINGDOM
          </h1>
          <div className="flex items-center gap-2">
            <div className="pixel-box-sm bg-[var(--color-coin)] px-2 py-1 pixel-text text-[10px] flex items-center gap-1">
              <span className="coin-spin inline-block">🪙</span>
              {state.coins}
            </div>
            <button
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="pixel-box-sm bg-[var(--color-cloud)] text-[var(--color-foreground)] p-1.5"
            >
              {muted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => setDark((d) => !d)}
              aria-label="Toggle dark mode"
              className="pixel-box-sm bg-[var(--color-cloud)] text-[var(--color-foreground)] p-1.5 pixel-text text-[10px]"
            >
              {dark ? "☀" : "☾"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-2xl mx-auto px-4 py-4 pb-32">
        <Tabs defaultValue="dashboard" className="flex flex-col gap-4">
          <TabsList className="!rounded-none pixel-box-sm bg-[var(--color-card)] h-12 w-full grid grid-cols-3 p-1">
            <TabsTrigger
              value="dashboard"
              className="pixel-text text-[9px] sm:text-[10px] !rounded-none data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-[var(--color-primary-foreground)]"
            >
              WORLD 1-1
            </TabsTrigger>
            <TabsTrigger
              value="plants"
              className="pixel-text text-[9px] sm:text-[10px] !rounded-none data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-[var(--color-primary-foreground)]"
            >
              PLANTS
            </TabsTrigger>
            <TabsTrigger
              value="log"
              className="pixel-text text-[9px] sm:text-[10px] !rounded-none data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-[var(--color-primary-foreground)]"
            >
              LOG
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="plants" className="flex flex-col gap-3">
            <AddPlantDialog />
            {state.plants.length === 0 ? (
              <div className="pixel-box bg-[var(--color-card)] p-6 text-center pixel-text text-[10px] opacity-80">
                Your kingdom is empty.
                <br />
                <br />
                Press <strong>+ ADD PLANT</strong> to begin your quest! 🌱
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {state.plants.map((p) => (
                  <PlantCard key={p.id} plant={p} onWatered={onWatered} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="log">
            <LogView />
          </TabsContent>
        </Tabs>
      </main>

      {/* Grass footer */}
      <div
        className="fixed bottom-0 left-0 right-0 h-10 pointer-events-none"
        aria-hidden
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--color-grass) 0 8px, oklch(0.5 0.16 142) 8px 12px)",
          borderTop: "3px solid var(--color-border)",
        }}
      />

      <ReminderDialog plant={reminder} onClose={() => setReminder(null)} />
      <Toaster />
    </div>
  );
}