import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';

import { CommonModule } from '@angular/common';
import { Pokemon } from '../../models/pokemon.model';
import { PokemonCardComponent } from '../../pokemon-card/pokemon-card.component';
import { InterpretPokepasteService } from '../../services/interpret-pokepaste.service';
import { SaveTeamsService } from '../../services/save-teams.service';
import { SharePokepasteService } from '../../services/share-pokepaste.service';

@Component({
  selector: 'app-pokepaste',
  standalone: true,
  imports: [PokemonCardComponent, CommonModule],
  templateUrl: './pokepaste-component.html',
  styleUrls: ['./pokepaste-component.scss']
})
export class PokepasteComponent implements OnInit {
  pokepaste!: string;
  team!: Pokemon[];

  averageRelations: Map<string, number> = new Map<string, number>();

  constructor(
    private sharePokpasteService: SharePokepasteService,
    private interpretPokepasteService: InterpretPokepasteService,
    private saveTeamsService: SaveTeamsService,
    private router: Router
  ) { }

  async ngOnInit() {
    if (this.sharePokpasteService.isPokepasteShared()) {
      this.pokepaste = this.sharePokpasteService.getPaste();
      this.team = await this.interpretPokepasteService.interpretPokepaste(this.pokepaste);

      const imagesTable: string[] = [];
      this.team.forEach(p => {
        if (p.imageUrl) {
          imagesTable.push(p.imageUrl!);
        }
      });
      this.saveTeamsService.saveTeam(this.pokepaste, imagesTable);

      this.setAverageRelations();

    } else {
      this.router.navigateByUrl('');
    }


  }

  copyPokepaste() {
    navigator.clipboard.writeText(this.pokepaste);
  }

  setAverageRelations() {

    const relationSums: Map<string, number> = new Map();
    const relationCounts: Map<string, number> = new Map();

    this.team.forEach(pokemon => {
      if (pokemon.typesRelations && typeof pokemon.typesRelations === 'object') {
        let entries: [string, number | string][] = [];
        if (pokemon.typesRelations instanceof Map) {
          entries = Array.from(pokemon.typesRelations.entries());
        } else {
          entries = Object.entries(pokemon.typesRelations);
        }
        entries.forEach(([type, value]) => {

          const numValue = typeof value === 'number' ? value : Number(value);
          if (!isNaN(numValue)) {
            relationSums.set(type, (relationSums.get(type) || 0) + numValue);
            relationCounts.set(type, (relationCounts.get(type) || 0) + 1);
          }
        });
      }
    });

    this.averageRelations.clear();
    relationSums.forEach((sum, type) => {
      const count = relationCounts.get(type) || 1;
      this.averageRelations.set(type, sum / count);
    });
  }

  teamAnalysis(team: Pokemon[]) {
    this.router.navigate(['/team-analysis'], { state: { team } });
  }
}


