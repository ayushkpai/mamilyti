"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  addPerson,
  removePerson as removeStoredPerson,
  renamePerson as renameStoredPerson,
  useHydrated,
  usePeople,
  type Person,
  type RelationshipKind,
} from "@/lib/people-store";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  PARTNER_GAP,
  layoutPeople,
} from "@/lib/tree-layout";

const avatarTones = [
  "from-[#5f8a70] to-[#3d654f]",
  "from-[#bd735d] to-[#93513f]",
  "from-[#907fae] to-[#6b5b8b]",
  "from-[#c19a53] to-[#9a7534]",
  "from-[#6a8c9e] to-[#486a7c]",
];

const inputClass =
  "w-full rounded-xl border border-[#ddd2bf] bg-white px-3.5 py-2.5 text-sm text-[#2b261f] outline-none transition placeholder:text-[#b1a48f] focus:border-[#6f8f72] focus:ring-2 focus:ring-[#6f8f72]/20";

const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c705d]";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function clampZoom(value: number): number {
  return Math.min(1.6, Math.max(0.35, Number(value.toFixed(2))));
}

function FamilyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="4.5" r="2.3" />
      <circle cx="5.5" cy="19" r="2.3" />
      <circle cx="18.5" cy="19" r="2.3" />
      <path d="M12 6.8v4.7M5.5 16.7v-2.4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v2.4M12 11.3v3" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function XIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function PencilIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function HeartIcon({ className = "h-2.5 w-2.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ZoomInIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M11 8v6M8 11h6M20 20l-3.6-3.6" />
    </svg>
  );
}

function ZoomOutIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M8 11h6M20 20l-3.6-3.6" />
    </svg>
  );
}

function FitIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

type PersonNodeProps = {
  person: Person;
  x: number;
  y: number;
  tone: string;
  onRemove: (personId: string) => void;
  onEdit: (person: Person) => void;
};

function PersonNode({
  person,
  x,
  y,
  tone,
  onRemove,
  onEdit,
}: PersonNodeProps) {
  return (
    <div
      className="group absolute z-10"
      style={{ left: x, top: y, width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <div className="relative flex h-full items-center gap-3 rounded-2xl border border-[#e3d8c5] bg-[#fffdf8] px-4 pr-11 shadow-[0_4px_16px_rgba(62,50,31,0.07)] transition duration-200 hover:border-[#cdbfa7] hover:shadow-[0_10px_24px_rgba(62,50,31,0.13)]">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br ${tone} font-display text-[11px] font-semibold tracking-wide text-white ring-1 ring-black/10`}
        >
          {getInitials(person.name)}
        </span>
        <p className="line-clamp-2 break-words font-display text-[16px] leading-tight text-[#2b261f]">
          {person.name}
        </p>
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(person)}
            aria-label={`Edit ${person.name}`}
            title={`Edit ${person.name}`}
            className="rounded-full p-1.5 text-[#b1a48f] transition hover:bg-[#efe7d8] hover:text-[#3d362b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6f8f72]/40"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(person.id)}
            aria-label={`Remove ${person.name}`}
            title={`Remove ${person.name}`}
            className="rounded-full p-1.5 text-[#b1a48f] transition hover:bg-[#f6e9e2] hover:text-[#a35a45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b3674f]/40"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PeopleBoard() {
  const people = usePeople();
  const hydrated = useHydrated();
  const layout = useMemo(() => layoutPeople(people), [people]);
  const peopleById = useMemo(
    () => new Map(people.map((person) => [person.id, person])),
    [people],
  );
  const toneById = useMemo(() => {
    const tones = new Map<string, string>();
    people.forEach((person, index) => {
      tones.set(person.id, avatarTones[index % avatarTones.length]);
    });
    return tones;
  }, [people]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [relationship, setRelationship] =
    useState<RelationshipKind>("child");
  const [relativeId, setRelativeId] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");
  const [zoom, setZoom] = useState(1);
  const inputId = useId();
  const selectId = useId();
  const editInputId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fittedOnce = useRef(false);

  const fitToView = useCallback(() => {
    const element = scrollRef.current;
    if (!element || layout.units.length === 0) return;

    const horizontal = (element.clientWidth - 32) / layout.width;
    const vertical = (element.clientHeight - 32) / layout.height;
    setZoom(clampZoom(Math.min(horizontal, vertical, 1)));
  }, [layout.height, layout.units.length, layout.width]);

  useEffect(() => {
    if (fittedOnce.current || layout.units.length === 0) return;
    fittedOnce.current = true;
    const frame = requestAnimationFrame(fitToView);
    return () => cancelAnimationFrame(frame);
  }, [fitToView, layout.units.length]);

  useEffect(() => {
    if (!dialogOpen && pendingDeleteId === null && editingId === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (dialogOpen) {
        setDialogOpen(false);
        setName("");
        setError("");
      }
      setEditingId(null);
      setEditName("");
      setEditError("");
      setPendingDeleteId(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dialogOpen, editingId, pendingDeleteId]);

  const openDialog = () => {
    setName("");
    setError("");
    setRelationship("child");
    setRelativeId(people[people.length - 1]?.id ?? "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setName("");
    setError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }

    if (people.length > 0) {
      const target =
        relativeId || people[people.length - 1]?.id || undefined;
      addPerson(trimmed, target, relationship);
    } else {
      addPerson(trimmed);
    }

    closeDialog();
  };

  const handleRemove = (personId: string) => {
    setPendingDeleteId(personId);
  };

  const confirmRemove = () => {
    if (!pendingDeleteId) return;
    removeStoredPerson(pendingDeleteId);
    setPendingDeleteId(null);
  };

  const openEdit = (person: Person) => {
    setEditingId(person.id);
    setEditName(person.name);
    setEditError("");
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditError("");
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = editName.trim();

    if (!trimmed) {
      setEditError("Please enter a name.");
      return;
    }

    if (editingId) renameStoredPerson(editingId, trimmed);
    closeEdit();
  };

  const countLabel =
    people.length === 0
      ? "No names yet"
      : `${people.length} ${people.length === 1 ? "person" : "people"} so far`;

  const relativeName = peopleById.get(relativeId)?.name;
  const relationHint =
    relationship === "child"
      ? `They will appear below ${relativeName ?? "this person"} in the tree.`
      : relationship === "partner"
        ? `${relativeName ?? "They"} will appear side by side as partners.`
        : `They will appear above ${relativeName ?? "this person"} as a parent.`;

  const pendingPerson = pendingDeleteId
    ? peopleById.get(pendingDeleteId)
    : undefined;
  const editingPerson = editingId ? peopleById.get(editingId) : undefined;
  const pendingChildren = pendingPerson
    ? people.filter((person) =>
        person.parentIds.includes(pendingPerson.id),
      )
    : [];
  const pendingPartnerCount = pendingPerson
    ? pendingPerson.partnerIds.filter((id) => peopleById.has(id)).length
    : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#e7ddcb] bg-[#fbf8f1]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest text-[#fbf7ec] shadow-sm">
              <FamilyIcon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-[22px] leading-tight tracking-tight text-[#2b261f]">
                Our Family
              </h1>
              <p className="mt-0.5 text-[11px] text-[#9a8c75]">
                {hydrated ? countLabel : "Opening…"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openDialog}
            className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2.5 text-xs font-semibold text-[#fbf7ec] shadow-sm transition hover:bg-[#2c4e3d] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add person
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        {!hydrated ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <span className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#a29580]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6f8f72]" />
              Opening the family book
            </span>
          </div>
        ) : people.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center sm:py-28">
            <span className="rounded-full border border-[#d9c9a9] bg-white/60 p-5 shadow-sm">
              <FamilyIcon className="h-8 w-8 text-[#6f8f72]" />
            </span>
            <h2 className="mt-6 max-w-xl font-display text-4xl leading-tight tracking-tight text-[#2b261f] sm:text-5xl">
              A family tree begins with a name.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#8a7d68]">
              There is no one here yet. Add the first person, and the first
              branch of the tree will appear.
            </p>
            <button
              type="button"
              onClick={openDialog}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-[#fbf7ec] shadow-sm transition hover:bg-[#2c4e3d] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add the first person
            </button>
            <p className="mt-3 text-[11px] text-[#b1a48f]">
              Names are saved in this browser.
            </p>
          </div>
        ) : (
          <section
            aria-labelledby="tree-heading"
            className="animate-rise overflow-hidden rounded-3xl border border-[#e3d8c5] bg-[#fbf8f0]/85 shadow-[0_20px_60px_rgba(61,49,30,0.08)]"
          >
            <div className="flex flex-col gap-3 border-b border-[#e9dfcd] bg-white/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl border border-[#e6dcc9] bg-[#fbf6ec] text-[#6f8f72]">
                  <FamilyIcon className="h-4 w-4" />
                </span>
                <div>
                  <h2
                    id="tree-heading"
                    className="font-display text-lg leading-tight tracking-tight text-[#2b261f]"
                  >
                    The family tree
                  </h2>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#a29580]">
                    {people.length} {people.length === 1 ? "person" : "people"}
                    {layout.branchCount > 1
                      ? ` · ${layout.branchCount} branches`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-full border border-[#ddd2bf] bg-[#fbf8f1]">
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((current) => clampZoom(current - 0.1))
                    }
                    aria-label="Zoom out"
                    title="Zoom out"
                    className="rounded-l-full p-1.5 text-[#7a6d59] transition hover:bg-[#efe7d8] hover:text-[#3d362b]"
                  >
                    <ZoomOutIcon className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-[11px] font-semibold tabular-nums text-[#7a6d59]">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setZoom((current) => clampZoom(current + 0.1))
                    }
                    aria-label="Zoom in"
                    title="Zoom in"
                    className="rounded-r-full p-1.5 text-[#7a6d59] transition hover:bg-[#efe7d8] hover:text-[#3d362b]"
                  >
                    <ZoomInIcon className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={fitToView}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#ddd2bf] bg-[#fbf8f1] px-3 py-1.5 text-[11px] font-semibold text-[#6f6453] transition hover:border-[#b9a888] hover:text-[#3d362b]"
                >
                  <FitIcon />
                  Fit
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="tree-scroll relative h-[clamp(430px,64vh,760px)] overflow-auto bg-[#f7f1e6]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(160,142,112,0.22) 0.7px, transparent 0.7px)",
                backgroundSize: "18px 18px",
              }}
            >
              <div
                className="relative flex min-h-full items-center"
                style={{
                  width: `max(100%, ${layout.width * zoom}px)`,
                }}
              >
                <div
                  className="relative mx-auto"
                  style={{
                    width: layout.width * zoom,
                    height: layout.height * zoom,
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: layout.width,
                      height: layout.height,
                      transform: `scale(${zoom})`,
                      transformOrigin: "top left",
                    }}
                  >
                  <svg
                    className="pointer-events-none absolute inset-0 z-0"
                    width={layout.width}
                    height={layout.height}
                    aria-hidden="true"
                  >
                    <g
                      fill="none"
                      stroke="#c9baa0"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {layout.connections.map((connection) => (
                        <path key={connection.unitKey} d={connection.d} />
                      ))}
                    </g>
                  </svg>

                  {layout.units.map((unit) => (
                    <div key={unit.key} className="contents">
                      {unit.memberIds.map((memberId, index) => {
                        const person = peopleById.get(memberId);
                        if (!person) return null;
                        return (
                          <Fragment key={memberId}>
                            {index > 0 && (
                              <span
                                className="absolute z-[5] flex h-[18px] items-center justify-center"
                                style={{
                                  left:
                                    unit.memberX[index - 1] + CARD_WIDTH,
                                  top: unit.y + CARD_HEIGHT / 2 - 9,
                                  width: PARTNER_GAP,
                                }}
                                aria-hidden="true"
                              >
                                <span className="absolute left-0 right-0 top-1/2 h-px bg-[#cbbd9f]" />
                                <span className="relative flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[#dccdac] bg-[#fbf8f0] shadow-sm">
                                  <HeartIcon className="h-2 w-2 text-[#b3674f]" />
                                </span>
                              </span>
                            )}
                            <PersonNode
                              person={person}
                              x={unit.memberX[index]}
                              y={unit.y}
                              tone={toneById.get(memberId) ?? avatarTones[0]}
                              onRemove={handleRemove}
                              onEdit={openEdit}
                            />
                          </Fragment>
                        );
                      })}
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e9dfcd] bg-white/45 px-4 py-2.5 text-[11px] text-[#8a7d68]">
              <span className="inline-flex items-center gap-1.5">
                <HeartIcon className="h-2.5 w-2.5 text-[#b3674f]" />
                Add a child, partner, or parent to grow the branches.
              </span>
              <span className="text-[#a29580]">
                {layout.units.length} cards on the tree
              </span>
            </div>
          </section>
        )}
      </main>

      <footer className="px-4 pb-6 pt-2 text-center text-[11px] text-[#b1a48f]">
        Everything here is kept privately in your browser.
      </footer>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={closeDialog}
            className="absolute inset-0 cursor-default bg-[#15261e]/50 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-person-title"
            className="animate-rise relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#fbf8f1] px-6 pb-6 pt-5 shadow-[0_30px_90px_rgba(21,38,30,0.35)] sm:max-w-md sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a29580]">
                  New family member
                </p>
                <h2
                  id="add-person-title"
                  className="mt-1 font-display text-2xl tracking-tight text-[#2b261f]"
                >
                  Add a person
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close"
                className="-mr-1 rounded-full p-2 text-[#9a8c75] transition hover:bg-[#efe7d8] hover:text-[#3d362b]"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-[#8a7d68]">
              {people.length === 0
                ? "This person will start the family tree."
                : "Choose how they connect to someone already on the tree."}
            </p>

            <form onSubmit={handleSubmit} className="mt-5">
              <label
                htmlFor={inputId}
                className={labelClass}
              >
                Name
              </label>
              <input
                id={inputId}
                autoFocus
                maxLength={80}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Kamala Devi"
                className={inputClass}
              />

              {error && (
                <p role="alert" className="mt-2 text-xs text-[#a35a45]">
                  {error}
                </p>
              )}

              {people.length > 0 && (
                <fieldset className="mt-5">
                  <legend className={labelClass}>Add as</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { value: "child", label: "Child of" },
                        { value: "partner", label: "Partner of" },
                        { value: "parent", label: "Parent of" },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={relationship === option.value}
                        onClick={() => setRelationship(option.value)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                          relationship === option.value
                            ? "border-forest bg-forest text-[#fbf7ec] shadow-sm"
                            : "border-[#ddd2bf] bg-white text-[#6f6453] hover:border-[#b9a888] hover:text-[#3d362b]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <label htmlFor={selectId} className="mt-3 block">
                    <span className={labelClass}>
                      {relationship === "child"
                        ? "Child of"
                        : relationship === "partner"
                          ? "Partner of"
                          : "Parent of"}
                    </span>
                    <span className="relative block">
                      <select
                        id={selectId}
                        value={relativeId}
                        onChange={(event) =>
                          setRelativeId(event.target.value)
                        }
                        className={`${inputClass} appearance-none pr-9`}
                      >
                        {people.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8c75]" />
                    </span>
                  </label>

                  <p className="mt-2 text-[11px] leading-relaxed text-[#948670]">
                    {relationHint}
                  </p>
                </fieldset>
              )}

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#e9dfcd] pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#6f6453] transition hover:bg-[#efe7d8] hover:text-[#3d362b]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-[#fbf7ec] shadow-sm transition hover:bg-[#2c4e3d] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2"
                >
                  Add person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={closeEdit}
            className="absolute inset-0 cursor-default bg-[#15261e]/50 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-person-title"
            className="animate-rise relative z-10 w-full rounded-t-3xl bg-[#fbf8f1] px-6 pb-6 pt-5 shadow-[0_30px_90px_rgba(21,38,30,0.35)] sm:max-w-md sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#a29580]">
                  Edit family member
                </p>
                <h2
                  id="edit-person-title"
                  className="mt-1 font-display text-2xl tracking-tight text-[#2b261f]"
                >
                  Edit name
                </h2>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                aria-label="Close"
                className="-mr-1 rounded-full p-2 text-[#9a8c75] transition hover:bg-[#efe7d8] hover:text-[#3d362b]"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5">
              <label htmlFor={editInputId} className={labelClass}>
                Name
              </label>
              <input
                id={editInputId}
                autoFocus
                maxLength={80}
                value={editName}
                onChange={(event) => {
                  setEditName(event.target.value);
                  if (editError) setEditError("");
                }}
                placeholder="e.g. Kamala Devi"
                className={inputClass}
              />

              {editError && (
                <p role="alert" className="mt-2 text-xs text-[#a35a45]">
                  {editError}
                </p>
              )}

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#e9dfcd] pt-4">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#6f6453] transition hover:bg-[#efe7d8] hover:text-[#3d362b]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-[#fbf7ec] shadow-sm transition hover:bg-[#2c4e3d] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 focus-visible:ring-offset-2"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingPerson && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => setPendingDeleteId(null)}
            className="absolute inset-0 cursor-default bg-[#15261e]/50 backdrop-blur-[2px]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-person-title"
            aria-describedby="remove-person-desc"
            className="animate-rise relative z-10 w-full rounded-t-3xl bg-[#fbf8f1] px-6 pb-6 pt-5 shadow-[0_30px_90px_rgba(21,38,30,0.35)] sm:max-w-sm sm:rounded-3xl"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f6e9e2] text-[#a35a45]">
                <XIcon className="h-4 w-4" />
              </span>
              <div>
                <h2
                  id="remove-person-title"
                  className="font-display text-xl tracking-tight text-[#2b261f]"
                >
                  Remove {pendingPerson.name}?
                </h2>
                <p
                  id="remove-person-desc"
                  className="mt-1.5 text-xs leading-relaxed text-[#8a7d68]"
                >
                  {pendingChildren.length > 0
                    ? `${pendingPerson.name} is a parent of ${
                        pendingChildren.length
                      } ${
                        pendingChildren.length === 1 ? "person" : "people"
                      } on the tree. Removing them will unlink ${
                        pendingChildren.length === 1
                          ? "that child"
                          : "those children"
                      }.`
                    : `${pendingPerson.name} will be removed from the family tree.`}
                  {pendingPartnerCount > 0
                    ? ` ${pendingPartnerCount} partner ${
                        pendingPartnerCount === 1 ? "link" : "links"
                      } will also be removed.`
                    : ""}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#e9dfcd] pt-4">
              <button
                type="button"
                autoFocus
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#6f6453] transition hover:bg-[#efe7d8] hover:text-[#3d362b]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                className="rounded-xl bg-[#a35a45] px-5 py-2.5 text-sm font-semibold text-[#fbf7ec] shadow-sm transition hover:bg-[#8e4b39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a35a45]/40 focus-visible:ring-offset-2"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
