import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { Appearance, ViewerBackgroundColor } from '../../../core/services/appearance';

interface BackgroundMenuPosition {
  top: number;
  left: number;
  width: number;
}

@Component({
  selector: 'app-appearance-dialog',
  templateUrl: './appearance-dialog.html',
  styleUrl: './appearance-dialog.scss',
})
export class AppearanceDialog {
  @Output() readonly close = new EventEmitter<void>();

  readonly appearance = inject(Appearance);
  readonly isBackgroundMenuOpen = signal(false);
  readonly backgroundMenuPosition = signal<BackgroundMenuPosition>({ top: 0, left: 0, width: 0 });

  toggleBackgroundMenu(event: MouseEvent): void {
    if (this.isBackgroundMenuOpen()) {
      this.isBackgroundMenuOpen.set(false);
      return;
    }

    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      throw new Error('The background menu trigger is not an HTML element.');
    }

    const trigger = target.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(trigger.width, window.innerWidth - 2 * margin);
    const menuHeight = 160;
    const belowSpace = window.innerHeight - trigger.bottom - margin;
    const top =
      belowSpace >= menuHeight
        ? trigger.bottom + 8
        : Math.max(margin, trigger.top - menuHeight - 8);
    const left = Math.max(margin, Math.min(trigger.left, window.innerWidth - width - margin));

    this.backgroundMenuPosition.set({ top, left, width });
    this.isBackgroundMenuOpen.set(true);
  }

  selectViewerBackground(color: ViewerBackgroundColor): void {
    this.appearance.setViewerBackgroundColor(color);
    this.isBackgroundMenuOpen.set(false);
  }
}
