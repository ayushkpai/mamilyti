import type { Person } from "./people-store";

export const CARD_WIDTH = 180;
export const CARD_HEIGHT = 92;
export const PARTNER_GAP = 28;
export const SIBLING_GAP = 34;
export const BRANCH_GAP = 88;
export const LEVEL_GAP = 72;
export const TREE_PADDING = 48;

export type LayoutUnit = {
  key: string;
  primaryId: string;
  memberIds: string[];
  depth: number;
  x: number;
  y: number;
  width: number;
  memberX: number[];
  children: LayoutUnit[];
};

export type LayoutConnection = {
  unitKey: string;
  d: string;
};

export type FamilyTreeLayout = {
  units: LayoutUnit[];
  connections: LayoutConnection[];
  width: number;
  height: number;
  maxDepth: number;
  branchCount: number;
};

function unitOwnWidth(memberCount: number): number {
  return (
    memberCount * CARD_WIDTH + Math.max(0, memberCount - 1) * PARTNER_GAP
  );
}

function childrenRowWidth(children: LayoutUnit[]): number {
  return (
    children.reduce((total, child) => total + child.width, 0) +
    Math.max(0, children.length - 1) * SIBLING_GAP
  );
}

function emptyLayout(): FamilyTreeLayout {
  return {
    units: [],
    connections: [],
    width: TREE_PADDING * 2,
    height: TREE_PADDING * 2,
    maxDepth: 0,
    branchCount: 0,
  };
}

export function layoutPeople(people: Person[]): FamilyTreeLayout {
  if (people.length === 0) return emptyLayout();

  const byId = new Map(people.map((person) => [person.id, person]));
  const hasKnownParents = (person: Person) =>
    person.parentIds.some((parentId) => byId.has(parentId));

  const noParents = people.filter((person) => !hasKnownParents(person));
  const unattachedRoots = noParents.filter(
    (person) =>
      !person.partnerIds.some((partnerId) => {
        const partner = byId.get(partnerId);
        return partner ? hasKnownParents(partner) : false;
      }),
  );
  const roots = unattachedRoots.length
    ? unattachedRoots
    : noParents.length
      ? noParents
      : [people[0]];

  const used = new Set<string>();

  const draftUnit = (personId: string, depth: number): LayoutUnit => {
    used.add(personId);

    const person = byId.get(personId);
    const memberIds = [personId];
    const memberSet = new Set(memberIds);

    if (person) {
      for (let index = 0; index < memberIds.length; index += 1) {
        const member = byId.get(memberIds[index]);
        if (!member) continue;
        for (const partnerId of member.partnerIds) {
          if (
            partnerId === personId ||
            used.has(partnerId) ||
            memberSet.has(partnerId) ||
            !byId.has(partnerId)
          ) {
            continue;
          }
          used.add(partnerId);
          memberIds.push(partnerId);
          memberSet.add(partnerId);
        }
      }
    }

    const childCandidates = people.filter(
      (candidate) =>
        !used.has(candidate.id) &&
        candidate.parentIds.some((parentId) => memberSet.has(parentId)),
    );

    const children = childCandidates.map((child) =>
      draftUnit(child.id, depth + 1),
    );

    const width = Math.max(
      unitOwnWidth(memberIds.length),
      childrenRowWidth(children),
      CARD_WIDTH,
    );

    return {
      key: personId,
      primaryId: personId,
      memberIds,
      depth,
      x: 0,
      y: 0,
      width,
      memberX: [],
      children,
    };
  };

  const place = (unit: LayoutUnit, left: number, top: number) => {
    unit.x = left;
    unit.y = top;

    const ownWidth = unitOwnWidth(unit.memberIds.length);
    const center = left + unit.width / 2;
    unit.memberX = unit.memberIds.map(
      (_, index) =>
        center - ownWidth / 2 + index * (CARD_WIDTH + PARTNER_GAP),
    );

    const rowWidth = childrenRowWidth(unit.children);
    let cursor = left + (unit.width - rowWidth) / 2;

    for (const child of unit.children) {
      place(child, cursor, top + CARD_HEIGHT + LEVEL_GAP);
      cursor += child.width + SIBLING_GAP;
    }
  };

  const units: LayoutUnit[] = [];
  let maxDepth = 0;
  let branchCount = 0;
  let cursorX = TREE_PADDING;

  const collect = (unit: LayoutUnit) => {
    units.push(unit);
    maxDepth = Math.max(maxDepth, unit.depth);
    unit.children.forEach(collect);
  };

  for (const rootPerson of roots) {
    if (used.has(rootPerson.id)) continue;
    const branch = draftUnit(rootPerson.id, 0);
    place(branch, cursorX, TREE_PADDING);
    collect(branch);
    cursorX += branch.width + BRANCH_GAP;
    branchCount += 1;
  }

  if (branchCount === 0) {
    const branch = draftUnit(people[0].id, 0);
    place(branch, TREE_PADDING, TREE_PADDING);
    collect(branch);
    cursorX = TREE_PADDING + branch.width + BRANCH_GAP;
    branchCount = 1;
  }

  const connections: LayoutConnection[] = units
    .filter((unit) => unit.children.length > 0)
    .map((unit) => {
      const startX = unit.x + unit.width / 2;
      const startY = unit.y + CARD_HEIGHT;
      const busY = startY + LEVEL_GAP * 0.45;
      const childCenters = unit.children.map(
        (child) => child.x + child.width / 2,
      );
      const minX = Math.min(startX, ...childCenters);
      const maxX = Math.max(startX, ...childCenters);

      let d = `M ${startX} ${startY} V ${busY}`;
      if (maxX - minX > 0.5) {
        d += ` M ${minX} ${busY} H ${maxX}`;
      }
      for (const child of unit.children) {
        d += ` M ${child.x + child.width / 2} ${busY} V ${child.y}`;
      }

      return { unitKey: unit.key, d };
    });

  return {
    units,
    connections,
    width: cursorX - BRANCH_GAP + TREE_PADDING,
    height:
      TREE_PADDING * 2 +
      (maxDepth + 1) * CARD_HEIGHT +
      maxDepth * LEVEL_GAP,
    maxDepth,
    branchCount,
  };
}
