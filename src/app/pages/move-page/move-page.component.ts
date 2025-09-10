import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

import { PokeAPIService } from '../../services/poke-api.service';
import { TypesRelationsService } from '../../services/types-relations.service';
import { Type } from '../../models/types.model';
import { Move } from '../../models/move.model';

@Component({
  selector: 'app-move-page',
  imports: [CommonModule],
  templateUrl: './move-page.component.html',
  styleUrl: './move-page.component.scss'
})
export class MovePageComponent {
  move?: Move;
  typeMultipliers: Map<Type, number> = new Map();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly pokeApiService: PokeAPIService,
    private readonly typesRelationsService: TypesRelationsService
  ) {}

  ngOnInit(): void {
    const moveName = this.route.snapshot.paramMap.get('name')!;
    this.pokeApiService.getMoveInfo(moveName).pipe(take(1)).subscribe({
      next: data => {
      this.move = new Move(data);

      const moveType = this.move.type.name as Type;
      if (this.move.damage_class.name !== 'status') {
        this.typeMultipliers = this.typesRelationsService.calculateAttackMultipliers(moveType);
      }
      },
      error: err => {
      if (err.status === 404) {
        window.location.href = '/';
      }
      }
    });
  }
}
