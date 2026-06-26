import { Component, input } from '@angular/core';
import { TeamWorstMatchup } from '../../../services/team-analysis.service';
import { PokemonCardComponent } from "../../../pokemon-card/pokemon-card.component";
import { SlicePipe } from '@angular/common';

@Component({
  selector: 'app-team-analysis',
  imports: [PokemonCardComponent, SlicePipe],
  templateUrl: './team-analysis.component.html',
  styleUrl: './team-analysis.component.scss'
})
export class TeamAnalysisComponent {

  readonly worstMatchups = input<TeamWorstMatchup[]>();
  nbMatchups: number = 10;

}
