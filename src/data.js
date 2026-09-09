export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const DEFAULT_GROUPS = [
  {
    id: "uspallata",
    name: "Uspallata",
    sectors: [
      { id: "uspallata-1er-piso", name: "1er piso", subsectors: [] },
      { id: "uspallata-2do-piso", name: "2do piso", subsectors: [] }
    ]
  },
  {
    id: "higiene",
    name: "Higiene",
    sectors: [
      { id: "higiene-pb", name: "PB", subsectors: [] },
      { id: "higiene-1er-piso", name: "1er piso", subsectors: [] },
      { id: "higiene-2do-piso", name: "2do piso", subsectors: [] }
    ]
  }
];

export const INITIAL_DESKS = [];
