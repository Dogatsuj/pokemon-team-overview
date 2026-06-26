import { Component, signal } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PokemonMatchups } from '../../models/pokemon-matchup';
import { SinglePokemonAnalysisComponent } from './single-pokemon-analysis/single-pokemon-analysis.component';
import { TeamAnalysisService } from '../../services/team-analysis.service';
import { TierSelectorComponent } from "./tier-selector/tier-selector.component";

@Component({
  selector: 'app-team-analysis-page',
  imports: [CommonModule, SinglePokemonAnalysisComponent, TierSelectorComponent],
  templateUrl: './team-analysis-page.component.html',
  styleUrl: './team-analysis-page.component.scss'
})
export class TeamAnalysisPageComponent {

  team?: Pokemon[];
  selectedTab: number = 0;
  tabs: string[] = [];
  matchupsForEachPokemon: PokemonMatchups[] = [];

  constructor(private router: Router, private readonly teamAnalysisService: TeamAnalysisService) {
    this.team = history.state.team as Pokemon[] | undefined;
    if (!this.team) this.router.navigateByUrl('');
    this.loadMatchups()
  }
  
  loadMatchups() {
    this.matchupsForEachPokemon = [];
    this.tabs = [];
    this.team?.forEach(async pokemon => {
      this.tabs.push(pokemon.name)
      this.matchupsForEachPokemon.push(await this.teamAnalysisService.calculateMatchups(pokemon));
    })
  }

}
