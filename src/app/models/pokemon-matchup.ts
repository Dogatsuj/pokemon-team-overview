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

    getBestMatchups(numberOfMatchups: number = 10): PokemonMatchups {

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

    getWorstMatchups(numberOfMatchups: number = 10): PokemonMatchups {

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
            hasImmunity: boolean;        // notre Pokémon est immunisé à l'attaque adverse
            isOpponentImmune: boolean;   // l'adversaire est immunisé à notre meilleure attaque
        },
        stats?: {
            ourHP: number;               // 1–255
            ourDef: number;              // valeur effective (après EVs/nature)
            ourSpDef: number;
            opponentDef: number;
            opponentSpDef: number;
        }
    ): number {
        const avg = (range: [number, number]) => (range[0] + range[1]) / 2;
        const againstDamage = avg(this.bestMoveAgainst.damage); // dégâts reçus (%)
        const fromDamage = avg(this.bestMoveFrom.damage);    // dégâts infligés (%)

        // ─── 1. SCORE DÉFENSIF (0–1) ────────────────────────────────────────────
        // Basé sur les dégâts reçus normalisés.
        // 0% reçu → 1.0 | 50% reçu → ~0.5 | 100%+ reçu → ~0.0
        // Courbe linéaire clampée, plus honnête que des paliers.
        let defensiveScore = Math.max(0, 1 - againstDamage / 100);

        // Bonus immunité totale (ex : immunité type Normal vs Fantôme)
        if (types?.hasImmunity) {
            defensiveScore = Math.min(1, defensiveScore + 0.35);
        }

        // Bonus bulk : si nos HP × Déf effective sont élevés,
        // on résiste mieux aux calculs moyens qu'un sweeper frêle.
        if (stats) {
            const bulkFactor = Math.min(1, (stats.ourHP * ((stats.ourDef + stats.ourSpDef) / 2)) / 25000);
            defensiveScore = Math.min(1, defensiveScore + bulkFactor * 0.15);
        }

        // ─── 2. SCORE OFFENSIF (0–1) ────────────────────────────────────────────
        // 0% infligé → 0.0 | 50% infligé → 0.5 | 100%+ infligé → 1.0
        let offensiveScore = Math.min(1, fromDamage / 100);

        // Pénalité si l'adversaire est immunisé à notre meilleure attaque
        if (types?.isOpponentImmune) {
            offensiveScore *= 0.4; // notre menace offensive s'effondre
        }

        // ─── 3. SCORE DE VITESSE (0–1) ──────────────────────────────────────────
        // La vitesse n'est avantageuse QUE si on peut exploiter l'offensive,
        // ou désavantageuse si on est fragile face aux dégâts reçus.
        let speedScore = 0.5; // neutre par défaut

        if (isOpponentFaster) {
            // On subit le coup avant d'agir → amplifie la fragilité
            const fragility = Math.max(0, (againstDamage - 40) / 60); // 0 à 40% : neutre, au-delà : pénalité
            speedScore = 0.5 - fragility * 0.3;
        } else {
            // On frappe en premier → amplifie la puissance offensive
            const offensiveEdge = Math.max(0, (fromDamage - 40) / 60);
            speedScore = 0.5 + offensiveEdge * 0.25;
        }
        speedScore = Math.max(0, Math.min(1, speedScore));

        // ─── 4. BONUS SYNERGIE — COUNTER / CHECK (0–1) ─────────────────────────
        // Récompense les matchups "propres" : switch-in sûr + KO garanti.
        // Les deux conditions doivent être vraies simultanément.
        const isSafeSwitch = againstDamage <= 30;  // peut switcher sans risque majeur
        const threatenKO = fromDamage >= 80;  // menace le KO en 1 coup
        const isHardCounter = isSafeSwitch && threatenKO;

        // Bonus partiel : bon défensivement mais pas de KO (check passif)
        const isPassiveCheck = againstDamage <= 30 && fromDamage >= 40 && !isHardCounter;

        const synergyScore = isHardCounter ? 1.0
            : isPassiveCheck ? 0.6
                : 0.0;

        // ─── 5. AGRÉGATION PONDÉRÉE ─────────────────────────────────────────────
        // Les poids reflètent l'importance relative de chaque axe.
        // La synergie a un poids faible car c'est un bonus situationnel.
        const weights = {
            defensive: 0.35,
            offensive: 0.35,
            speed: 0.20,
            synergy: 0.10,
        };

        const rawScore =
            defensiveScore * weights.defensive +
            offensiveScore * weights.offensive +
            speedScore * weights.speed +
            synergyScore * weights.synergy;

        // ─── 6. MISE À L'ÉCHELLE 0–100 ──────────────────────────────────────────
        this.matchupScore =  100 - Math.round(rawScore * 100);
        return this.matchupScore;
    }
}