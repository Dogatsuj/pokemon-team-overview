import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pokemon } from '../models/pokemon.model';
import { PokeAPIService } from '../services/poke-api.service';
import { Router } from '@angular/router';
import { SharePokemonService } from '../services/share-pokemon.service';

@Component({
    selector: 'app-pokemon-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './pokemon-card.component.html',
    styleUrls: ['./pokemon-card.component.scss']
})
export class PokemonCardComponent implements OnInit {


    @Input() pokemon!: Pokemon;

    movesAndTypes!: Record<string, string>;

    constructor(private pokeAPIService: PokeAPIService, private sharePokemonService: SharePokemonService, private router: Router) { }


    ngOnInit(): void {
        this.pokemon.moves.forEach(async move => {
            this.movesAndTypes = this.pokeAPIService.getMovesType(this.pokemon.moves);
        });

    }

    openDetailedView() {
        this.sharePokemonService.changePokemon(this.pokemon)
        this.sharePokemonService.changeMovesAndTypes(this.movesAndTypes)
        this.router.navigateByUrl('pokemon');
    }

    openMoveDetails(moveName: string) {
        const moveUrlName = moveName.toLowerCase().replace(/\s+/g, '-');
        this.router.navigateByUrl('/move/' + moveUrlName);
    }

    formatItemName(name: string): string {
        return name.toLowerCase().replace(/\s+/g, '-');
    }
}
