import { Component, EventEmitter, Output, signal } from '@angular/core';

const GUIDES = [
  { id: 'collision', title: 'How to create collision for Gaussian Splat' },
  { id: 'install', title: 'Install SplatTransform and PlayCanvas tools' },
] as const;

type GuideId = (typeof GUIDES)[number]['id'];

@Component({
  selector: 'app-guides-dialog',
  templateUrl: './guides-dialog.html',
  styleUrl: './guides-dialog.scss',
})
export class GuidesDialog {
  @Output() readonly close = new EventEmitter<void>();

  readonly guides = GUIDES;
  readonly selectedGuide = signal<GuideId | null>(null);

  toggleGuide(guide: GuideId): void {
    this.selectedGuide.update((selected) => (selected === guide ? null : guide));
  }
}
