"use client";

import { useSyncExternalStore } from "react";

export type Person = {
  id: string;
  name: string;
  parentIds: string[];
  partnerIds: string[];
};

export type RelationshipKind = "child" | "partner" | "parent";

const STORAGE_KEY = "mamilyti.people.v1";
const EMPTY: Person[] = [];

let cache: Person[] | null = null;
const listeners = new Set<() => void>();

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function readFromStorage(): Person[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    const people: Person[] = [];
    const seen = new Set<string>();

    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      if (typeof record.id !== "string" || typeof record.name !== "string") {
        continue;
      }
      const id = record.id;
      const name = record.name.trim();
      if (!name || seen.has(id)) continue;
      seen.add(id);

      people.push({
        id,
        name,
        parentIds: stringArray(record.parentIds),
        partnerIds: stringArray(record.partnerIds),
      });
    }

    if (people.length === 0) return EMPTY;

    const validIds = new Set(people.map((person) => person.id));
    const partnerSets = new Map<string, Set<string>>(
      people.map((person) => [person.id, new Set<string>()]),
    );

    for (const person of people) {
      for (const partnerId of person.partnerIds) {
        if (partnerId === person.id || !validIds.has(partnerId)) continue;
        partnerSets.get(person.id)?.add(partnerId);
        partnerSets.get(partnerId)?.add(person.id);
      }
    }

    for (const person of people) {
      person.parentIds = [...new Set(person.parentIds)].filter(
        (parentId) => parentId !== person.id && validIds.has(parentId),
      );
      person.partnerIds = [...(partnerSets.get(person.id) ?? [])];
    }

    return people;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): Person[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache === null) cache = readFromStorage();
  return cache;
}

function getServerSnapshot(): Person[] {
  return EMPTY;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    emit();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(next: Person[]): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // If storage is unavailable, the tree still works for this visit.
  }
  emit();
}

export function addPerson(
  name: string,
  relativeId?: string,
  relationship: RelationshipKind = "child",
): void {
  const trimmed = name.trim();
  if (!trimmed) return;

  let current = getSnapshot();
  const relative = relativeId
    ? current.find((person) => person.id === relativeId)
    : undefined;

  const person: Person = {
    id: createId(),
    name: trimmed.slice(0, 80),
    parentIds: [],
    partnerIds: [],
  };

  if (relative) {
    if (relationship === "partner") {
      person.partnerIds = [relative.id];
      current = current.map((existing) =>
        existing.id === relative.id
          ? {
              ...existing,
              partnerIds: [...new Set([...existing.partnerIds, person.id])],
            }
          : existing,
      );
    } else if (relationship === "parent") {
      // A person can have more than two parents. Treat every existing parent
      // as a co-parent so the new parent stays in the same row above the child.
      const knownParents = [
        ...new Set(
          relative.parentIds.filter((parentId) =>
            current.some((existing) => existing.id === parentId),
          ),
        ),
      ];

      current = current.map((existing) => {
        if (existing.id === relative.id) {
          return {
            ...existing,
            parentIds: [...new Set([...existing.parentIds, person.id])],
          };
        }
        if (knownParents.includes(existing.id)) {
          return {
            ...existing,
            partnerIds: [...new Set([...existing.partnerIds, person.id])],
          };
        }
        return existing;
      });

      if (knownParents.length > 0) {
        person.partnerIds = knownParents;
      }
    } else {
      const parentIds = new Set([relative.id]);
      if (relative.partnerIds.length === 1) {
        parentIds.add(relative.partnerIds[0]);
      }
      person.parentIds = [...parentIds];
    }
  }

  commit([...current, person]);
}

export function renamePerson(personId: string, name: string): void {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return;

  commit(
    getSnapshot().map((person) =>
      person.id === personId ? { ...person, name: trimmed } : person,
    ),
  );
}

export function removePerson(personId: string): void {
  commit(
    getSnapshot()
      .filter((person) => person.id !== personId)
      .map((person) => ({
        ...person,
        parentIds: person.parentIds.filter((id) => id !== personId),
        partnerIds: person.partnerIds.filter((id) => id !== personId),
      })),
  );
}

export function usePeople(): Person[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, clientHydrated, serverHydrated);
}
