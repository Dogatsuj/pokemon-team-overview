import { Pokemon } from "./pokemon.model";

export class PokemonMatchups {
    pokemon: Pokemon;
    matchups: Map<Pokemon, Matchup>;


    constructor(pokemon: Pokemon) {
        this.pokemon = pokemon;
        this.matchups = new Map<Pokemon, Matchup>();
    }

    addMatchup(opponent: Pokemon, matchup: Matchup) {
        matchup.calculateMatchupScore(this.pokemon, opponent);
        this.matchups.set(opponent, matchup);
    }

    getBestMatchups(numberOfMatchups: number = 20): PokemonMatchups {

        const sortedEntries = Array.from(this.matchups.entries())
            .map(([opponent, matchup]) => {
                if (matchup.matchupScore === undefined) {
                    matchup.calculateMatchupScore(this.pokemon, opponent);
                }

                return { opponent, matchup };
            })
            .sort((a, b) => {
                return (a.matchup.matchupScore ?? 0) - (b.matchup.matchupScore ?? 0);
            })
            .slice(0, numberOfMatchups);

        const result = new PokemonMatchups(this.pokemon);

        for (const { opponent, matchup } of sortedEntries) {
            result.matchups.set(opponent, matchup);
        }

        return result;
    }

    getWorstMatchups(numberOfMatchups: number = 20): PokemonMatchups {

        const sortedEntries = Array.from(this.matchups.entries())
            .map(([opponent, matchup]) => {
                if (matchup.matchupScore === undefined) {
                    matchup.calculateMatchupScore(this.pokemon, opponent);
                }

                return { opponent, matchup };
            })
            .sort((a, b) => {
                return (b.matchup.matchupScore ?? 0) - (a.matchup.matchupScore ?? 0);
            })
            .slice(0, numberOfMatchups);

        const result = new PokemonMatchups(this.pokemon);

        for (const { opponent, matchup } of sortedEntries) {
            result.matchups.set(opponent, matchup);
        }

        return result;
    }


}

export class Matchup {

    bestMoveAgainst: { move: string, damage: [number, number] };
    bestMoveFrom: { move: string, damage: [number, number] };
    matchupScore?: number;


    constructor(bestMoveAgainst: { move: string, damage: [number, number] }, bestMoveFrom: { move: string, damage: [number, number] }) {
        this.bestMoveAgainst = bestMoveAgainst;
        this.bestMoveFrom = bestMoveFrom;
    }

    calculateMatchupScore(currentPokemon: Pokemon, opposingPokemon: Pokemon): number {

        const avg = (range: [number, number]) => (range[0] + range[1]) / 2;

        // ─── 0. EFFECTIVE STATS ──────────────────────────────────────────────────
        // Same formula as getEffectiveSpeed(), generalized to HP/Def/SpD.
        const getEffectiveStat = (mon: Pokemon, stat: string): number => {
            const base = mon.baseStats[stat];
            const iv = mon.ivs[stat];
            const ev = mon.evs[stat];
            if (stat === "HP") {
                if (base === 1) return 1; // Shedinja-style 1 HP mons
                return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * mon.level) / 100) + mon.level + 10;
            }
            let value = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * mon.level) / 100) + 5;
            const boostNatures: { [key: string]: string } = {
                Def: "Bold,Impish,Lax,Relaxed",
                SpD: "Calm,Gentle,Careful,Sassy",
            };
            const cutNatures: { [key: string]: string } = {
                Def: "Lonely,Hasty,Gentle,Mild",
                SpD: "Naughty,Naive,Lax,Rash",
            };
            if (boostNatures[stat]?.includes(mon.nature)) value = Math.floor(value * 1.1);
            else if (cutNatures[stat]?.includes(mon.nature)) value = Math.floor(value * 0.9);
            return value;
        };

        const ourDef = getEffectiveStat(currentPokemon, "Def");
        const ourSpDef = getEffectiveStat(currentPokemon, "SpD");
        const theirDef = getEffectiveStat(opposingPokemon, "Def");
        const theirSpDef = getEffectiveStat(opposingPokemon, "SpD");

        const ourSpeed = currentPokemon.getEffectiveSpeed();
        const theirSpeed = opposingPokemon.getEffectiveSpeed();
        const isOpponentFaster = theirSpeed > ourSpeed; // ties resolved in our favor

        // ─── 1. DAMAGE ────────────────────────────────────────────────────────────
        // Immunities are already baked into these values (0 damage = immune),
        // no separate type-effectiveness lookup needed.
        const dmgWeDeal = avg(this.bestMoveFrom.damage);
        const dmgWeTake = avg(this.bestMoveAgainst.damage);

        // ─── 2. HITS-TO-KO ────────────────────────────────────────────────────────
        const MAX_HITS = 8;
        const hitsToKillThem = dmgWeDeal > 0 ? Math.min(MAX_HITS, Math.ceil(100 / dmgWeDeal)) : Infinity;
        const hitsToKillUs = dmgWeTake > 0 ? Math.min(MAX_HITS, Math.ceil(100 / dmgWeTake)) : Infinity;

        // ─── 3. TURN-ORDER SIMULATION ────────────────────────────────────────────
        // Simulate the actual exchange of blows given who moves first — this is
        // what really decides a 1v1, rather than independent weighted sub-scores.
        type Outcome = 'us' | 'them' | 'stall';
        let outcome: Outcome = 'stall';
        let roundsToDecide = MAX_HITS;

        {
            let ourHits = 0;
            let theirHits = 0;
            const weMoveFirst = !isOpponentFaster;

            for (let round = 1; round <= MAX_HITS; round++) {
                if (weMoveFirst) {
                    ourHits++;
                    if (ourHits >= hitsToKillThem) { outcome = 'us'; roundsToDecide = round; break; }
                    theirHits++;
                    if (theirHits >= hitsToKillUs) { outcome = 'them'; roundsToDecide = round; break; }
                } else {
                    theirHits++;
                    if (theirHits >= hitsToKillUs) { outcome = 'them'; roundsToDecide = round; break; }
                    ourHits++;
                    if (ourHits >= hitsToKillThem) { outcome = 'us'; roundsToDecide = round; break; }
                }
            }
            // If neither threshold is reached within MAX_HITS, outcome stays
            // 'stall': neither side can realistically KO the other.
        }

        // ─── 4. BASE SCORE FROM THE SIMULATED OUTCOME ───────────────────────────
        // Winning fast (1-2 rounds) is safer than grinding out a win over many
        // rounds (more exposure to crits/status/switches). Symmetric for losses.
        let baseScore: number;
        if (outcome === 'us') {
            baseScore = 100 - (roundsToDecide - 1) * 7;
        } else if (outcome === 'them') {
            baseScore = 0 + (roundsToDecide - 1) * 7;
        } else {
            baseScore = 50; // genuine stalemate
        }
        baseScore = Math.max(0, Math.min(100, baseScore));

        // ─── 5. FINE-GRAINED DAMAGE ADJUSTMENT ───────────────────────────────────
        // hits-to-KO is ceil()'d into coarse buckets (51% and 99% are both
        // "2HKO"); this nudges the score using the exact damage ratio.
        const continuousHitsThem = dmgWeDeal > 0 ? 100 / dmgWeDeal : MAX_HITS;
        const continuousHitsUs = dmgWeTake > 0 ? 100 / dmgWeTake : MAX_HITS;
        const fineDiff = continuousHitsUs - continuousHitsThem;
        const fineAdjustment = Math.max(-6, Math.min(6, fineDiff * 2));

        // ─── 6. DEFENSIVE STAT TIE-BREAKER ───────────────────────────────────────
        // Minor nudge (±4), mostly relevant for stalls/close calls.
        // HP is intentionally excluded: damage is already expressed as a % of
        // max HP, so its effect is already fully captured by dmgWeDeal/dmgWeTake
        // (and thus by hitsToKillThem/hitsToKillUs). Including HP again here
        // would double-count it. Only raw Def/SpD are used as a secondary signal.
        const ourBulk = ourDef + ourSpDef;
        const theirBulk = theirDef + theirSpDef;
        const bulkRatio = ourBulk / (ourBulk + theirBulk);
        const bulkAdjustment = (bulkRatio - 0.5) * 8;

        // ─── 7. FINAL SCORE ───────────────────────────────────────────────────────
        // Convention: 100 = excellent matchup for currentPokemon, 0 = it gets
        // crushed, 50 = neutral/no clear KO threat either way.
        this.matchupScore = Math.round(
            Math.max(0, Math.min(100, baseScore + fineAdjustment + bulkAdjustment))
        );
        return this.matchupScore;
    }
}