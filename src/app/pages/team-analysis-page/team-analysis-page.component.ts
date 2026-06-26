import { Component } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { Router } from '@angular/router';
import { BestAndWorstMatchupsForAPokemon, TeamAnalysisService } from '../../services/team-analysis.service';
import { CommonModule } from '@angular/common';
import { SinglePokemonAnalysisComponent } from "./single-pokemon-analysis/single-pokemon-analysis.component";
import { PokemonMatchups } from '../../models/pokemon-matchup';

@Component({
  selector: 'app-team-analysis-page',
  imports: [CommonModule, SinglePokemonAnalysisComponent],
  templateUrl: './team-analysis-page.component.html',
  styleUrl: './team-analysis-page.component.scss'
})
export class TeamAnalysisPageComponent {

  team?: Pokemon[];
  selectedTab: number = 0;
  tabs: string[] = [];
  matchupsForEachPokemon: PokemonMatchups[] = [];

  constructor(private router: Router, private teamAnalysisService: TeamAnalysisService) { 
    this.team = history.state.team as Pokemon[] | undefined;
    if(!this.team) this.router.navigateByUrl('');

    this.team?.forEach(async pokemon => {
      this.tabs.push(pokemon.name)
      this.matchupsForEachPokemon.push(await teamAnalysisService.calculateMatchups(pokemon));
    })
    console.log(this.matchupsForEachPokemon)
  }

}
