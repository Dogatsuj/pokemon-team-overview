import { Component, effect, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonCardComponent } from '../../../pokemon-card/pokemon-card.component';
import { PokemonMatchups } from '../../../models/pokemon-matchup';

@Component({
  selector: 'app-single-pokemon-analysis',
  imports: [CommonModule, PokemonCardComponent],
  templateUrl: './single-pokemon-analysis.component.html',
  styleUrl: './single-pokemon-analysis.component.scss'
})
export class SinglePokemonAnalysisComponent {
  readonly matchups = input<PokemonMatchups>();
  nbMatchups: number = 10;
  constructor(){
    effect(()=>{
      this.matchups();
      this.nbMatchups = 10;
    })
  }
}
