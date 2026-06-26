import { Type } from "./types.model";

export class Pokemon {

  name: string = "";
  nickname: string = "";
  imageUrl: string = "";
  ability: string = "";
  nature: string = "";
  heldItem: string = "";
  teraType: string = "";
  types: Type[] = [];
  baseStats: { [key: string]: number } = { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
  ivs: { [key: string]: number } = { HP: 31, Atk: 31, Def: 31, SpA: 31, SpD: 31, Spe: 31 };
  evs: { [key: string]: number } = { HP: 0, Atk: 0, Def: 0, SpA: 0, SpD: 0, Spe: 0 };
  typesRelations?: Map<Type, number>;
  moves: string[] = [];
  level: number = 100;
  shiny: boolean = false;

  constructor() { }

  getEVsHTMLText(): string {
    var text = "";
    for (var ev in this.evs) {
      if (this.evs[ev] !== 0) {
        if (text.length > 0) {
          text += " / "
        }
        text += this.evs[ev] + " " + ev;
      }
    }
    return text;
  }

  getIVsHTMLText(): string {
    var text = "";
    for (var iv in this.ivs) {
      if (this.ivs[iv] !== 31) {
        if (text.length > 0) {
          text += " / "
        }
        text += this.ivs[iv] + " " + iv;
      }
    }
    return text;
  }

  getEffectiveSpeed(): number {
  const baseSpeed = this.baseStats["Spe"];
  const iv = this.ivs["Spe"];
  const ev = this.evs["Spe"];

  let speed = Math.floor(
    ((2 * baseSpeed + iv + Math.floor(ev / 4)) * this.level) / 100
  ) + 5;

  const positiveSpeedNatures = [
    "Timid",
    "Jolly",
    "Hasty",
    "Naive"
  ];

  const negativeSpeedNatures = [
    "Brave",
    "Relaxed",
    "Quiet",
    "Sassy"
  ];

  if (positiveSpeedNatures.includes(this.nature)) {
    speed = Math.floor(speed * 1.1);
  } else if (negativeSpeedNatures.includes(this.nature)) {
    speed = Math.floor(speed * 0.9);
  }

  const speedItems: { [key: string]: number } = {
    "Choice Scarf": 1.5,
    "Iron Ball": 0.5,
    "Macho Brace": 0.5,
    "Power Anklet": 0.5,
    "Power Band": 0.5,
    "Power Belt": 0.5,
    "Power Bracer": 0.5,
    "Power Lens": 0.5,
    "Power Weight": 0.5
  };

  if (speedItems[this.heldItem] !== undefined) {
    speed = Math.floor(speed * speedItems[this.heldItem]);
  }

  return speed;
}
}
