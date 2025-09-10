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
}
