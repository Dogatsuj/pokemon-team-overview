import { Injectable } from '@angular/core';
import { Pokemon } from '../models/pokemon.model';
import { calculate, Generations, Move, Pokemon as SmogonPokemon } from '@smogon/calc';
import { PokemonMatchups, Matchup } from '../models/pokemon-matchup';
import { Generation, ID } from '@smogon/calc/dist/data/interface';
import { toID } from '@smogon/calc';

export enum Tier {
    OU = 'OU',
    UU = 'UU',
    NU = 'NU'
}

export type BestAndWorstMatchupsForAPokemon = {
    pokemon: Pokemon;
    bestMatchups: Map<Pokemon, Matchup>;
    worstMatchups: Map<Pokemon, Matchup>;
}

export type TeamWorstMatchup = {
    threat: Pokemon;
    teamMatchups: {
        pokemon: Pokemon;
        matchup: Matchup;
    }[];
};

@Injectable({
    providedIn: 'root'
})
export class TeamAnalysisService {

    private sets: Pokemon[] = [];
    private setsLoaded: boolean = false;

    // Gen9 patched once at startup to match PokeMMO rules
    private readonly gen: Generation = Generations.get(9);

    // Pokémon whose types changed when Fairy was introduced in Gen6.
    // PokeMMO uses Gen5 types for these.
    // Format: Smogon species name → [type1, type2?]
    private readonly POKEMMO_TYPES: Record<string, [string, string?]> = {
        'Azumarill': ['Water'],
        'Clefable': ['Normal'],
        'Gardevoir': ['Psychic'],
        'Granbull': ['Normal'],
        'Mawile': ['Steel'],
        'Togekiss': ['Normal', 'Flying'],
        'Whimsicott': ['Grass'],
        'Wigglytuff': ['Normal'],
    };

    private tiers: Tier[] = [Tier.OU];

    constructor() {
        this.patchGenForPokeMMO();
        this.loadSets().then(() => {
            this.setsLoaded = true;
        });
    }


    // ---------------------------------------------------------------------------
    //Tiers selector
    // ---------------------------------------------------------------------------
    setTiers(tiers: Tier[]) {
        this.tiers = tiers;
        this.setsLoaded = false;
        this.loadSets().then(() => {
            this.setsLoaded = true;
        });
    }

    // ---------------------------------------------------------------------------
    // PokeMMO type chart patch
    // PokeMMO runs on Gen5 mechanics: no Fairy type.
    // We use Gen9 for item/move coverage, then restore Gen5 type interactions.
    //
    // damageTaken encoding (Smogon):
    //   0 → ×1  (normal)
    //   1 → ×2  (super effective)
    //   2 → ×½  (not very effective)
    //   3 → ×0  (immune)
    // ---------------------------------------------------------------------------
    private patchGenForPokeMMO(): void {
        const T = (name: string) => this.gen.types.get(name as ID);

        // damageTaken[attackingType] is set on the DEFENDING type object.
        // Reading the image row by row (attacker → defender):

        const overrides: [string, string, number][] = [
            // ── Fairy attacking ──────────────────────────────────────────────
            // In Gen6+ Fairy is ×2 vs Dragon, Dark, Fighting.
            // In PokeMMO those are all ×1.
            ['Fairy', 'Dragon', 0],
            ['Fairy', 'Dark', 0],
            ['Fairy', 'Fighting', 0],

            // In Gen6+ Fairy is ×½ vs Fire, Poison, Steel.
            // In PokeMMO those are all ×1.
            ['Fairy', 'Fire', 0],
            ['Fairy', 'Poison', 0],
            ['Fairy', 'Steel', 0],

            // ── Fairy defending ──────────────────────────────────────────────
            // In Gen6+ the Fairy type has resistances/weaknesses.
            // In PokeMMO every attacking type deals ×1 to Fairy.
            ['Normal', 'Fairy', 0],
            ['Fighting', 'Fairy', 0],  // was ×½ in Gen6
            ['Flying', 'Fairy', 0],
            ['Poison', 'Fairy', 0],  // was ×2 in Gen6
            ['Ground', 'Fairy', 0],
            ['Rock', 'Fairy', 0],
            ['Bug', 'Fairy', 0],  // was ×½ in Gen6
            ['Ghost', 'Fairy', 0],
            ['Steel', 'Fairy', 0],  // was ×2 in Gen6
            ['Fire', 'Fairy', 0],  // was ×½ in Gen6
            ['Water', 'Fairy', 0],
            ['Grass', 'Fairy', 0],
            ['Electric', 'Fairy', 0],
            ['Psychic', 'Fairy', 0],
            ['Ice', 'Fairy', 0],
            ['Dragon', 'Fairy', 0],  // was ×0 in Gen6
            ['Dark', 'Fairy', 0],  // was ×½ in Gen6
            ['Fairy', 'Fairy', 0],  // was ×½ in Gen6
        ];

        for (const [attacker, defender, value] of overrides) {
            const defType = T(defender);
            if (defType) {
                (defType as any).damageTaken[attacker] = value;
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Overwrite the Smogon-computed types with PokeMMO Gen5 types where needed.
    // ---------------------------------------------------------------------------
    private applyPokeMMOTypes(smogonPokemon: SmogonPokemon, species: string): void {
        const types = this.POKEMMO_TYPES[species];
        if (types) {
            (smogonPokemon as any).types = types;
        }
    }


    // ---------------------------------------------------------------------------
    // Sets loading
    // ---------------------------------------------------------------------------

    private async waitForSetsLoaded(): Promise<void> {
        let recursions = 0;

        while (!this.setsLoaded) {
            if (recursions++ > 100) {
                throw new Error('Sets failed to load');
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    private async loadSets() {
        try {
            const mapKey = (k: string) => {
                switch ((k || '').toLowerCase()) {
                    case 'hp': return 'HP';
                    case 'at': return 'Atk';
                    case 'df': return 'Def';
                    case 'sa': return 'SpA';
                    case 'sd': return 'SpD';
                    case 'sp': return 'Spe';
                    default: return k;
                }
            };

            const toEVs = (obj: any): { [key: string]: number } => {
                const out: { [key: string]: number } = {
                    HP: 0,
                    Atk: 0,
                    Def: 0,
                    SpA: 0,
                    SpD: 0,
                    Spe: 0
                };

                if (!obj) return out;

                for (const k of Object.keys(obj)) {
                    const mapped = mapKey(k);

                    if (mapped in out) {
                        out[mapped] = obj[k];
                    }
                }

                return out;
            };

            const toIVs = (obj: any): { [key: string]: number } => {
                const out: { [key: string]: number } = {
                    HP: 31,
                    Atk: 31,
                    Def: 31,
                    SpA: 31,
                    SpD: 31,
                    Spe: 31
                };

                if (!obj) return out;

                for (const k of Object.keys(obj)) {
                    const mapped = mapKey(k);

                    if (mapped in out) {
                        out[mapped] = obj[k];
                    }
                }

                return out;
            };

            const sets: Pokemon[] = [];

            for (const tier of this.tiers) {
                try {
                    const resp = await fetch('assets/sets/' + tier + '.js');
                    const text = await resp.text();

                    const fn = new Function(
                        text +
                        '\nreturn typeof SETDEX !== "undefined" ? SETDEX : null;'
                    );

                    const data: any = fn();

                    if (!data) {
                        console.warn(`${tier} did not expose SETDEX`);
                        continue;
                    }

                    for (const species of Object.keys(data)) {
                        const speciesSets = data[species];
                        if (!speciesSets) continue;

                        for (const setName of Object.keys(speciesSets)) {
                            const s = speciesSets[setName];
                            const p = new Pokemon();

                            p.name = species;
                            p.ability = s.ability || '';
                            p.nature = s.nature || '';
                            p.level = 50;
                            p.evs = toEVs(s.evs);
                            p.ivs = toIVs(s.ivs);

                            const speciesId = toID(species);
                            const speciesData = this.gen.species.get(speciesId as ID);

                            if (speciesData) {
                                p.baseStats = {
                                    HP: speciesData.baseStats.hp,
                                    Atk: speciesData.baseStats.atk,
                                    Def: speciesData.baseStats.def,
                                    SpA: speciesData.baseStats.spa,
                                    SpD: speciesData.baseStats.spd,
                                    Spe: speciesData.baseStats.spe,
                                };
                            }

                            const rawItem = s.item || '';
                            p.heldItem = rawItem;

                            if (s.ivs) {
                                const ivObj = toIVs(s.ivs);

                                for (const k of Object.keys(ivObj)) {
                                    p.ivs[k] = ivObj[k] !== 0 ? ivObj[k] : 0;
                                }
                            }

                            p.moves = Array.isArray(s.moves)
                                ? s.moves.slice(0, 4)
                                : [];

                            p.imageUrl = `https://play.pokemonshowdown.com/sprites/gen5/${species.toLocaleLowerCase()}.png`

                            sets.push(p);
                        }
                    }
                } catch (e) {
                    console.error(`Failed to load set file: ${tier}`, e);
                }
            }

            this.sets = sets;
        } catch (e) {
            console.error('Failed to load sets', e);
        }
    }

    // ---------------------------------------------------------------------------
    // Matchup calculation
    // ---------------------------------------------------------------------------

    async calculateMatchups(pokemon: Pokemon): Promise<PokemonMatchups> {
        await this.waitForSetsLoaded()
        const safePokemon = Object.assign(new Pokemon(), pokemon);
        const pokemonMatchups = new PokemonMatchups(safePokemon);

        if (!this.sets || this.sets.length === 0) {
            return pokemonMatchups;
        }

        this.sets.forEach((setPokemon: Pokemon) => {
            const offensiveMoves = pokemon.moves
                .filter((move) => !!move)
                .map((move) => ({
                    move,
                    damage: this.damagesFromMove(move, pokemon, setPokemon),
                }));

            const defensiveMoves = setPokemon.moves
                .filter((move) => !!move)
                .map((move) => ({
                    move,
                    damage: this.damagesFromMove(move, setPokemon, pokemon),
                }));

            const matchup = new Matchup(
                this.selectBestMove(offensiveMoves),
                this.selectBestMove(defensiveMoves)
            );

            pokemonMatchups.addMatchup(setPokemon, matchup);
        });

        return pokemonMatchups;
    }


    private selectBestMove(
        moves: { move: string; damage: [number, number] }[]
    ): { move: string; damage: [number, number] } {
        if (moves.length === 0) {
            return { move: '', damage: [0, 0] };
        }
        return moves.reduce((best, current) =>
            current.damage[1] > best.damage[1] ? current : best
            , moves[0]);
    }

    private damagesFromMove(move: string, attacker: Pokemon, defender: Pokemon): [number, number] {
        const gen = this.gen;
        const level = 50;

        const resolveItem = (item: string): string | undefined =>
            (item?.trim()) || undefined;

        try {
            const smogonAttacker = new SmogonPokemon(gen, attacker.name, {
                level,
                item: resolveItem(attacker.heldItem),
                nature: attacker.nature,
                evs: attacker.evs,
                ivs: attacker.ivs,
            });

            const smogonDefender = new SmogonPokemon(gen, defender.name, {
                level,
                item: resolveItem(defender.heldItem),
                nature: defender.nature,
                evs: defender.evs,
                ivs: defender.ivs,
            });

            // Apply PokeMMO Gen5 types (undoes Fairy retyping from Gen6)
            this.applyPokeMMOTypes(smogonAttacker, attacker.name);
            this.applyPokeMMOTypes(smogonDefender, defender.name);

            const smogonMove = new Move(gen, move);

            // Status moves deal no direct damage
            if (smogonMove.category === 'Status') {
                return [0, 0];
            }

            const result = calculate(gen, smogonAttacker, smogonDefender, smogonMove);

            const defenderHp = smogonDefender.stats.hp;
            const damageValues = (() => {
                const damage = result.damage;
                if (typeof damage === 'number') return [damage];
                if (Array.isArray(damage)) return damage.flat(Infinity) as number[];
                return [];
            })();

            if (damageValues.length === 0) return [0, 0];

            const damagePercentages = damageValues.map(
                (damage) => Math.round((damage / defenderHp) * 1000) / 10
            );

            return [Math.min(...damagePercentages), Math.max(...damagePercentages)];

        } catch (e) {
            console.warn(`Failed to calc move "${move}" (${attacker.name} → ${defender.name}):`, e);
            return [0, 0];
        }
    }

    async teamsWorstMatchups(team: Pokemon[]): Promise<TeamWorstMatchup[]> {
        await this.waitForSetsLoaded();

        if (!this.sets || this.sets.length === 0 || !team || team.length === 0) {
            return [];
        }

        const safeTeam = team.map((p) => Object.assign(new Pokemon(), p));
        const results: TeamWorstMatchup[] = [];

        this.sets.forEach((threat: Pokemon) => {

            const teamMatchups: TeamWorstMatchup['teamMatchups'] = safeTeam
                .map((member) => ({
                    pokemon: member,
                    matchup: this.buildMatchup(member, threat)
                }))
                .sort(
                    (a, b) =>
                        (a.matchup.matchupScore ?? 100) -
                        (b.matchup.matchupScore ?? 100)
                );

            results.push({
                threat,
                teamMatchups
            });
        });

        return results.sort(
            (a, b) =>
                (b.teamMatchups[0]?.matchup.matchupScore ?? 100) -
                (a.teamMatchups[0]?.matchup.matchupScore ?? 100)
        );
    }

    private buildMatchup(pokemon: Pokemon, opponent: Pokemon): Matchup {
        const offensiveMoves = pokemon.moves
            .filter((move) => !!move)
            .map((move) => ({
                move,
                damage: this.damagesFromMove(move, pokemon, opponent),
            }));

        const defensiveMoves = opponent.moves
            .filter((move) => !!move)
            .map((move) => ({
                move,
                damage: this.damagesFromMove(move, opponent, pokemon),
            }));

        const matchup = new Matchup(
            this.selectBestMove(offensiveMoves),
            this.selectBestMove(defensiveMoves)
        );

        matchup.calculateMatchupScore(
            opponent.getEffectiveSpeed() > pokemon.getEffectiveSpeed()
        );

        return matchup;
    }

}