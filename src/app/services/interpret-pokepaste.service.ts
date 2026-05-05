import { Injectable } from '@angular/core';
import { Pokemon } from '../models/pokemon.model'
import { PokeAPIService } from './poke-api.service';
import { TypesRelationsService } from './types-relations.service';
import { Router } from '@angular/router';
import { Type } from '../models/types.model';



@Injectable({
  providedIn: 'root',
})
export class InterpretPokepasteService {

  constructor(private readonly pokepasteAPI: PokeAPIService, private readonly typesRelations: TypesRelationsService, private readonly router: Router) { }

  private immunityAbilities: Map<string, Type> = new Map([
    ['Levitate', 'ground'],
    ['Water Absorb', 'water'],
    ['Volt Absorb', 'electric'],
    ['Flash Fire', 'fire'],
    ['Sap Sipper', 'grass'],
    ['Storm Drain', 'water'],
    ['Dry Skin', 'water'],
    ['Motor Drive', 'electric'],
    ['Lightning Rod', 'electric'],
    ['Earth Eater', 'ground'],
    ['Wind Rider', 'flying'],
    ['Well-Baked Body', 'fire'],
    ['Thermal Exchange', 'fire'],
    ['Purifying Salt', 'ghost'],
  ]);

  async interpretPokepaste(pokepaste: String): Promise<Pokemon[]> {
    try {
      const team: Pokemon[] = [];

      const pokepasteTable: String[][] = this.getPokepasteTable(pokepaste);

      if (pokepasteTable.length === 0) {
        throw new Error('Invalid Poképaste: no Pokémon detected.');
      }

      pokepasteTable.forEach(pokemonPaste => {
        const pokemon: Pokemon = new Pokemon();

        this.firstLineProcess(pokemonPaste.shift()!, pokemon);

        pokemonPaste.forEach(lineOfThePaste => {
          if (this.isKeyValueLine(lineOfThePaste)) {
            const keyValue = lineOfThePaste.split(':');

            if (keyValue.length === 2) {
              const key = keyValue[0].trim();
              const value = keyValue[1].trim();
              this.bindKeyValue(key, value, pokemon);
            }
          } else if (this.isAttack(lineOfThePaste)) {
            this.bindAttack(lineOfThePaste, pokemon);
          } else if (this.isNature(lineOfThePaste)) {
            this.bindNature(lineOfThePaste, pokemon);
          }
        });

        team.push(pokemon);
      });

      await this.setInfosOnPokemon(team);
      return team;

    } catch (error) {
      alert('pokepaste invalide');
      this.router.navigateByUrl('');
      return [];
    }
  }



  /**
   * 
   * @param pokepaste a pokepaste String
   * @returns a table of Strings tables, where each table is a pokemon's paste
   */
  private getPokepasteTable(pokepaste: String): String[][] {

    var pokepasteTable: String[][] = [];

    var pokepasteLines = pokepaste.split('\n');

    var currentPokemon: String[] = [];

    var currentLine: String;

    for (const line of pokepasteLines) {
      if (line === '') {
        if (currentPokemon.length > 0) {
          pokepasteTable.push(currentPokemon);
        }
        currentPokemon = [];
      } else {
        currentPokemon.push(line);
      }
    }

    return pokepasteTable

  }



  /**
  * Process the first line of the pokemon paste to extract the nickname, name and held item
  * @param firstLine the first line of the pokemon paste
  * @param pokemon the pokemon object to fill with the data
  */
  private firstLineProcess(firstLine: String, pokemon: Pokemon): void {

    var theFirstLine = firstLine;

    if (this.pokemonHeldingAnItem(firstLine)) {
      var firstLineParts = firstLine.split('@');

      if (firstLineParts) {
        pokemon.heldItem = firstLineParts[1].trim();


      }

      theFirstLine = firstLineParts[0];

    }

    if (this.pokemonHasNickname(theFirstLine)) {
      var nicknameAndName = theFirstLine.split('(');

      pokemon.nickname = nicknameAndName[0].trim();
      pokemon.name = nicknameAndName[1].trim().slice(0, -1);

    } else {
      pokemon.name = theFirstLine.trim();
      pokemon.nickname = "";
    }
  }


  /**
   * 
   * @param firstLine the first line of the pokemon paste
   * @returns true if the pokemon is holding an item, false otherwise
   */
  private pokemonHeldingAnItem(firstLine: String): boolean {
    return firstLine.includes('@');
  }

  private pokemonHasNickname(pokemonName: String): boolean {
    return pokemonName.includes('(');
  }

  /**
   * binds a attribute to a pokemon, note that the we doesnt check if the line is a key-value line
   * @param pasteLine a line of the pokemon paste
   */
  private bindKeyValue(key: String, value: String, pokemon: Pokemon): void {
    switch (key) {
      case 'Ability':
        pokemon.ability = value.trim();
        break;
      case 'Level':
        pokemon.level = parseInt(value.trim());
        break;
      case 'Shiny':
        pokemon.shiny = value.trim() === 'Yes' ? true : false;
        break;
      case 'Tera Type':
        pokemon.teraType = value.trim();
        break;
      case 'EVs':
        this.bindEvs(value, pokemon);
        break;
      case 'IVs':
        this.bindIvs(value, pokemon);
    }
  }

  /**
   * binds the Ivs to a pokemon
   * @param value a line of the pokemon paste
   * @param pokemon the pokemon to bind the ivs to
   */
  private bindIvs(value: String, pokemon: Pokemon): void {
    var ivs = value.split('/');

    ivs.forEach(iv => {
      var ivParts = iv.trim().split(' ');
      pokemon.ivs[ivParts[1].trim()] = parseInt(ivParts[0].trim());
    });

  }

  /**
   * binds the Evs to a pokemon
   * @param value a line of the pokemon paste
   * @param pokemon the pokemon to bind the evs to
   */
  private bindEvs(value: String, pokemon: Pokemon): void {
    var evs = value.split('/');

    evs.forEach(ev => {
      var evParts = ev.trim().split(' ');
      pokemon.evs[evParts[1].trim()] = parseInt(evParts[0].trim());
    });

  }


  isKeyValueLine(lineOfThePaste: String) {
    return lineOfThePaste.includes(':');
  }

  isNature(lineOfThePaste: String): boolean {
    return lineOfThePaste.includes('Nature');
  }

  /**
   * 
   * @param lineOfThePaste a line of the pokemon paste that contains the nature
   * @param pokemon the pokemon to bind the nature to
   */
  bindNature(lineOfThePaste: String, pokemon: Pokemon): void {
    var nature = lineOfThePaste.split(' ')[0].trim();
    pokemon.nature = nature;
  }

  bindAttack(lineOfThePaste: String, pokemon: Pokemon): void {
    pokemon.moves.push(lineOfThePaste.substring(1).trim());
  }

  isAttack(lineOfThePaste: String): boolean {
    return lineOfThePaste.startsWith("-");
  }

  async setInfosOnPokemon(team: Pokemon[]): Promise<void> {
    for (const pokemon of team) {
      await this.pokepasteAPI.setInfosOnPokemon(pokemon).then(() => {
        const immunities = this.immunityAbilities.get(pokemon.ability) ? [this.immunityAbilities.get(pokemon.ability)!] : undefined;
        pokemon.typesRelations = this.typesRelations.calculateTypeMultipliers(pokemon.types, immunities);

      });
    }
  }


}
