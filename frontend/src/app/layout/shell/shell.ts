import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { SceneSelectionService } from '../../features/scenes/scene-selection.service';
import { AppearanceDialog } from './appearance-dialog/appearance-dialog';
import { GuidesDialog } from './guides-dialog/guides-dialog';

@Component({
  selector: 'app-shell',
  imports: [AppearanceDialog, GuidesDialog, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly sceneSelection = inject(SceneSelectionService);
  readonly isAccountMenuOpen = signal(false);
  readonly isAppearanceOpen = signal(false);
  readonly isGuidesOpen = signal(false);

  get viewerLink(): string[] {
    const sceneId = this.sceneSelection.selectedSceneId();
    return sceneId ? ['/viewer', sceneId] : ['/viewer'];
  }

  logout(): void {
    this.closeAccountMenu();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  toggleAccountMenu(): void {
    this.isAccountMenuOpen.update((open) => !open);
  }

  closeAccountMenu(): void {
    this.isAccountMenuOpen.set(false);
  }

  openAppearance(): void {
    this.closeAccountMenu();
    this.closeGuides();
    this.isAppearanceOpen.set(true);
  }

  closeAppearance(): void {
    this.isAppearanceOpen.set(false);
  }

  openGuides(): void {
    this.closeAccountMenu();
    this.closeAppearance();
    this.isGuidesOpen.set(true);
  }

  closeGuides(): void {
    this.isGuidesOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (event.target instanceof Node && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeAccountMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAccountMenu();
    this.closeAppearance();
    this.closeGuides();
  }
}
