import { Component } from '@angular/core';
import { Pokemon } from '../../models/pokemon.model';
import { Router, RouterLink } from '@angular/router';
import { BestAndWorstMatchupsForAPokemon, TeamAnalysisService } from '../../services/team-analysis.service';

@Component({
  selector: 'app-team-analysis-page',
  imports: [],
  templateUrl: './team-analysis-page.component.html',
  styleUrl: './team-analysis-page.component.scss'
})
export class TeamAnalysisPageComponent {

  private team?: Pokemon[];
  bestAndWorstMatchupsForEachPokemon: BestAndWorstMatchupsForAPokemon[] = [];

  constructor(private router: Router, private teamAnalysisService: TeamAnalysisService) { 
    this.team = history.state.team as Pokemon[] | undefined;
    if(!this.team) this.router.navigateByUrl('');
    teamAnalysisService.getBestAndWorstMatchups(this.team!).then((result) => { this.bestAndWorstMatchupsForEachPokemon = result; });
  }

}
