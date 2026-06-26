import { Routes } from '@angular/router';
import { HomepageComponent } from './pages/homepage/homepage.component';
import { MovePageComponent } from './pages/move-page/move-page.component';
import { MyTeamsComponent } from './pages/my-teams/my-teams.component';
import { PokepasteComponent } from './pages/pokepaste/pokepaste-component';
import { PokemonPageComponent } from './pages/pokemon-page/pokemon-page.component';
import { AnalysisPageComponent } from './pages/analysis-page/analysis-page.component';


export const routes: Routes = [
    {path: '', component: HomepageComponent},
    {path: 'team-overview', component: PokepasteComponent},
    {path: 'my-teams', component: MyTeamsComponent},
    {path: 'pokemon', component: PokemonPageComponent},
    { path: 'move/:name', component: MovePageComponent },
    {path: 'team-analysis', component: AnalysisPageComponent}
];
