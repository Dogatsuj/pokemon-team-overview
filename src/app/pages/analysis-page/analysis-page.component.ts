import { Component, signal } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PokemonMatchups } from '../../models/pokemon-matchup';
import { SinglePokemonAnalysisComponent } from './single-pokemon-analysis/single-pokemon-analysis.component';
import { TeamAnalysisService, TeamWorstMatchup } from '../../services/team-analysis.service';
import { TierSelectorComponent } from "./tier-selector/tier-selector.component";
import { TeamAnalysisComponent } from "./team-analysis/team-analysis.component";

@Component({
  selector: 'analysis-page',
  imports: [CommonModule, SinglePokemonAnalysisComponent, TierSelectorComponent, TeamAnalysisComponent],
  templateUrl: './analysis-page.component.html',
  styleUrl: './analysis-page.component.scss'
})
export class AnalysisPageComponent {

  team: Pokemon[] = [];
  selectedTab: number = 0;
  tabs: string[] = [];
  matchupsForEachPokemon: PokemonMatchups[] = [];
  worstMatchups: TeamWorstMatchup[] = [];
  constructor(private router: Router, private readonly teamAnalysisService: TeamAnalysisService) {
    this.team = history.state.team as Pokemon[] | [];
    if (!this.team) this.router.navigateByUrl('');
    this.loadMatchups()
  }

  async loadMatchups() {
    this.matchupsForEachPokemon = [];
    this.tabs = [];
    this.team?.forEach(async pokemon => {
      this.tabs.push(pokemon.name)
      this.matchupsForEachPokemon.push(await this.teamAnalysisService.calculateMatchups(pokemon));
    })
    this.worstMatchups = await this.teamAnalysisService.teamsWorstMatchups(this.team);
    
    
  }

}
