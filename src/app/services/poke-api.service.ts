import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Pokemon } from '../models/pokemon.model';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PokeAPIService {

  private apiUrl: string = 'https://pokeapi.co/api/v2/pokemon/';

  constructor(private http: HttpClient) {}


  setInfosOnPokemon(pokemon: Pokemon): Promise<void> {
    let pokemonName = pokemon.name.toLocaleLowerCase() === "jellicent"? "jellicent": pokemon.name;
    return new Promise((resolve, reject) => {
      this.http.get('https://pokeapi.co/api/v2/pokemon/' + pokemonName).subscribe(
        (response: any) => {
          pokemon.imageUrl = response.sprites.front_default;
            pokemon.baseStats = {
            HP: response.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0,
            Atk: response.stats.find((s: any) => s.stat.name === 'attack')?.base_stat || 0,
            Def: response.stats.find((s: any) => s.stat.name === 'defense')?.base_stat || 0,
            SpA: response.stats.find((s: any) => s.stat.name === 'special-attack')?.base_stat || 0,
            SpD: response.stats.find((s: any) => s.stat.name === 'special-defense')?.base_stat || 0,
            Spe: response.stats.find((s: any) => s.stat.name === 'speed')?.base_stat || 0
            };

            pokemon.types = response.types.map((t: any) => t.type.name);
            resolve();
        },
        error => {
          reject('');
        }
      );
    });
  }
  

  setPokemonImageUrl(response: any, pokemon : Pokemon) {
    try{
      const imageUrl: string = response?.sprites?.front_default;
      pokemon.imageUrl = imageUrl;
    } catch(err){
      console.error(err)
    }
   }

   getMoveInfo(moveName: string): Observable<any> {
  // Vérifie si le nom suit le format "hidden-power-[type]"
  const hiddenPowerMatch = moveName.match(/^hidden-power-\[([a-z]+)\]$/i);
  const apiName = hiddenPowerMatch ? 'hidden-power' : moveName.replace(/\s+/g, '-').toLowerCase();

  return this.http.get('https://pokeapi.co/api/v2/move/' + apiName).pipe(
    map((response: any) => {
      if (hiddenPowerMatch) {
        const forcedType = hiddenPowerMatch[1].toLowerCase();
        return {
          ...response,
          type: {
            ...response.type,
            name: forcedType
          },
          is_hidden_power: true // optionnel, utile pour debug ou logique annexe
        };
      }
      return response;
    })
  );
}



  getMovesType(moves: string[]): Record<string, string>{

    const movesAndTypes: Record<string, string> = {};
    moves.forEach(move => {
        const hiddenPowerMatch = move.match(/^Hidden Power \[([^\]]+)\]$/i);
        if (hiddenPowerMatch) {
          const type = hiddenPowerMatch[1].toLowerCase();
          movesAndTypes[move] = type;
        } else {
          this.http.get('https://pokeapi.co/api/v2/move/' + move.replace(/\s+/g, '-')).subscribe(
          (response: any) => {
            const moveType = response?.type?.name;
            movesAndTypes[move] = moveType;
          });
        }
    });
    return movesAndTypes;
  }
  
}
