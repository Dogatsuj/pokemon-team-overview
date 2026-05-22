import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {


  darkThemeEnabled: boolean = false;

  ngAfterViewInit() {
    if (localStorage.getItem('dark-theme') && localStorage.getItem('dark-theme') === 'true') {
      this.enableDarkTheme();
    }
  }

  toggleTheme() {

    if (!document.body.classList.contains('dark')) {
      document.body.classList.add('dark');
      localStorage.setItem('dark-theme', 'true');
    } else { 
      document.body.classList.remove('dark');
      localStorage.setItem('dark-theme', 'false');
    }

    this.darkThemeEnabled = !this.darkThemeEnabled;
  }

  enableDarkTheme() {
    if (!document.body.classList.contains('dark')) {
      document.body.classList.add('dark');
      localStorage.setItem('dark-theme', 'true');
    }
    this.darkThemeEnabled = true;
  }
}
