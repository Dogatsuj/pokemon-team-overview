import { Pokemon } from "./pokemon.model";

export class PokemonMatchups {
    pokemon: Pokemon;
    matchups: Map<Pokemon, Matchup>;


    constructor(pokemon: Pokemon) {
        this.pokemon = pokemon;
        this.matchups = new Map<Pokemon, Matchup>();
    }

    addMatchup(opponent: Pokemon, matchup: Matchup) {
        matchup.calculateMatchupScore(opponent.getEffectiveSpeed() > this.pokemon.getEffectiveSpeed());
        this.matchups.set(opponent, matchup);
    }

    getBestMatchups(numberOfMatchups: number = 20): PokemonMatchups {

        const sortedEntries = Array.from(this.matchups.entries())
            .map(([opponent, matchup]) => {
                if (matchup.matchupScore === undefined) {
                    matchup.calculateMatchupScore(
                        opponent.getEffectiveSpeed() > this.pokemon.getEffectiveSpeed()
                    );
                }

                return { opponent, matchup };
            })
            .sort((a, b) => {
                const scoreA = a.matchup.matchupScore ?? 0;
                const scoreB = b.matchup.matchupScore ?? 0;

                return scoreB - scoreA;
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
                    matchup.calculateMatchupScore(
                        opponent.getEffectiveSpeed() > this.pokemon.getEffectiveSpeed()
                    );
                }

                return { opponent, matchup };
            })
            .sort((a, b) => {
                const scoreA = a.matchup.matchupScore ?? 0;
                const scoreB = b.matchup.matchupScore ?? 0;
                return scoreA - scoreB; // worst first
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

    calculateMatchupScore(
    isOpponentFaster: boolean,
    types?: {
        ours: string[];
        opponent: string[];
        hasImmunity: boolean;        // our Pokémon is immune to the opponent's attack
        isOpponentImmune: boolean;   // the opponent is immune to our best attack
    },
    stats?: {
        ourHP: number;               // 1–255
        ourDef: number;              // effective stat (after EVs/nature)
        ourSpDef: number;
        opponentDef: number;
        opponentSpDef: number;
    }
): number {
    const avg = (range: [number, number]) => (range[0] + range[1]) / 2;

    // ─── 0. RAW DAMAGE INPUTS ────────────────────────────────────────────────
    // Damage is expressed as a percentage of max HP per hit.
    let dmgWeDeal = avg(this.bestMoveFrom.damage);
    let dmgWeTake = avg(this.bestMoveAgainst.damage);

    // A type immunity nullifies the move entirely, regardless of the
    // "average damage" figure (which assumes neutral/super effective hits).
    if (types?.isOpponentImmune) dmgWeDeal = 0;
    if (types?.hasImmunity) dmgWeTake = 0;

    // ─── 1. HITS-TO-KO ───────────────────────────────────────────────────────
    // The core unit of a Pokémon fight isn't "damage %", it's "how many hits
    // does it take to KO", because damage is applied in discrete turns.
    // A move dealing 51% and one dealing 99% both "2HKO", but they are NOT
    // equally threatening — that nuance is recovered later (step 4).
    const MAX_HITS = 8; // beyond this, treat the matchup as a non-issue (stall)
    const hitsToKillThem = dmgWeDeal > 0 ? Math.min(MAX_HITS, Math.ceil(100 / dmgWeDeal)) : Infinity;
    const hitsToKillUs = dmgWeTake > 0 ? Math.min(MAX_HITS, Math.ceil(100 / dmgWeTake)) : Infinity;

    // ─── 2. TURN-ORDER SIMULATION ────────────────────────────────────────────
    // Simulate the actual exchange of blows given who moves first.
    // This replaces independent "speed/offense/defense" sub-scores with the
    // single thing that actually decides a 1v1: who faints first.
    type Outcome = 'us' | 'them' | 'stall';
    let outcome: Outcome = 'stall';
    let roundsToDecide = MAX_HITS; // lower = faster/cleaner resolution

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
        // If neither threshold is reached within MAX_HITS, outcome stays 'stall':
        // neither side can realistically KO the other (e.g. double immunity,
        // both walls, or chip damage only).
    }

    // ─── 3. BASE SCORE FROM THE SIMULATED OUTCOME ───────────────────────────
    // Winning fast (1-2 rounds) is much safer than winning in 5 rounds, since
    // every extra round is a chance for crits, status, miracle rolls, or a
    // switch from the opponent. Same logic applies symmetrically to losing.
    let baseScore: number;
    if (outcome === 'us') {
        // 100 for an instant kill, decaying toward ~65 for a slow grind win.
        baseScore = 100 - (roundsToDecide - 1) * 7;
    } else if (outcome === 'them') {
        // 0 for an instant death, rising toward ~35 for a slow loss
        // (still a loss, but one that does some damage / buys time).
        baseScore = 0 + (roundsToDecide - 1) * 7;
    } else {
        // Stalemate: neither side threatens a KO. Genuinely neutral.
        baseScore = 50;
    }
    baseScore = Math.max(0, Math.min(100, baseScore));

    // ─── 4. FINE-GRAINED DAMAGE ADJUSTMENT ──────────────────────────────────
    // Hits-to-KO is a coarse, ceil()'d bucket (51% and 99% both "2HKO").
    // Use the *exact* damage ratio to nudge the score within its bucket,
    // rewarding matchups that are closer to the next KO threshold down.
    const continuousHitsThem = dmgWeDeal > 0 ? 100 / dmgWeDeal : MAX_HITS;
    const continuousHitsUs = dmgWeTake > 0 ? 100 / dmgWeTake : MAX_HITS;
    // Positive when we kill relatively faster than we die; small weight (±6 max).
    const fineDiff = continuousHitsUs - continuousHitsThem;
    const fineAdjustment = Math.max(-6, Math.min(6, fineDiff * 2));

    // ─── 5. BULK TIE-BREAKER ─────────────────────────────────────────────────
    // Only matters as a minor nudge — mostly relevant in stall/close matchups
    // where raw damage numbers don't clearly separate the two Pokémon.
    let bulkAdjustment = 0;
    if (stats) {
        const ourBulk = stats.ourHP * (stats.ourDef + stats.ourSpDef);
        const theirBulkProxy = stats.opponentDef + stats.opponentSpDef; // no opponent HP available
        const bulkRatio = ourBulk / (ourBulk + theirBulkProxy * 100); // normalize to ~[0,1]
        bulkAdjustment = (bulkRatio - 0.5) * 8; // ±4 max
    }

    // ─── 6. FINAL SCORE ──────────────────────────────────────────────────────
    // Convention: 100 = excellent matchup for us, 0 = we get crushed,
    // 50 = neutral/no clear KO threat either way.
    this.matchupScore = Math.round(
        Math.max(0, Math.min(100, baseScore + fineAdjustment + bulkAdjustment))
    );
    return this.matchupScore;
}
}