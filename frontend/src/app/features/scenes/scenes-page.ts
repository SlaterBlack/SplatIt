import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SceneCatalogService } from './scene-catalog';

@Component({
  selector: 'app-scenes-page',
  imports: [RouterLink],
  templateUrl: './scenes-page.html',
  styleUrl: './scenes-page.scss',
})
export class ScenesPage implements OnInit {
  constructor(readonly catalog: SceneCatalogService) {}

  ngOnInit(): void {
    void this.catalog.loadScenes();
  }

  retry(): void {
    void this.catalog.loadScenes();
  }
}
