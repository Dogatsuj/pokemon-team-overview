export class Move {
  name: string;
  type: { name: string };
  power: number | null;
  accuracy: number | null;
  damage_class: { name: string };
  effect_entries: { effect: string }[];

  constructor(data?: Partial<Move>) {
    this.name = data?.name ?? '';
    this.type = data?.type ?? { name: '' };
    this.power = data?.power ?? null;
    this.accuracy = data?.accuracy ?? null;
    this.damage_class = data?.damage_class ?? { name: '' };
    this.effect_entries = data?.effect_entries ?? [{ effect: '' }];
  }
}
