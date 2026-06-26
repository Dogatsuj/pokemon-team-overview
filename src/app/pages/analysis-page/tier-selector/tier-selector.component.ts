import { Component, output, signal } from '@angular/core';
import { TeamAnalysisService, Tier } from '../../../services/team-analysis.service';

@Component({
  selector: 'app-tier-selector',
  imports: [],
  templateUrl: './tier-selector.component.html',
  styleUrl: './tier-selector.component.scss'
})
export class TierSelectorComponent {

  tierChanged = output();

  readonly tiers = Object.values(Tier);

  readonly selectedTiers = signal<Tier[]>([Tier.OU]);

  constructor(private readonly teamAnalysisService: TeamAnalysisService) { }

  toggleTier(tier: Tier): void {
    this.selectedTiers.update(current =>
      current.includes(tier)
        ? current.filter(t => t !== tier)
        : [...current, tier]
    );
    this.teamAnalysisService.setTiers(this.selectedTiers());
    this.tierChanged.emit();
  }
}
