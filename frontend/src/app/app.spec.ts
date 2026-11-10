import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { App } from './app';
import { routes } from './app.routes';
import { SceneCatalogService, SplatScene } from './features/scenes/scene-catalog';
import { SceneSelectionService } from './features/scenes/scene-selection.service';

describe('App', () => {
  const testScenes: SplatScene[] = [
    {
      id: 'courtyard-study',
      title: 'Courtyard study',
      description: 'Explore a project scene.',
      format: 'SPZ',
      sourceLabel: 'Bluey GaussianSplats',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: SceneCatalogService,
          useValue: {
            scenes: signal(testScenes),
            loading: signal(false),
            error: signal(null),
            loadScenes: async () => {},
            getSignedAssetUrl: async () => '/api/splatit/assets/courtyard-study',
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('shows scene cards and a separate viewer tab', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/scenes');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('SplatIt');
    expect(compiled.querySelector('.navbar-brand img')?.getAttribute('src')).toBe(
      '/SplatItLogo_32.png',
    );
    expect(compiled.querySelector('app-scenes-page h1')?.textContent).toContain('Scenes');
    expect(compiled.querySelector('.scene-grid .scene-option')).toBeTruthy();
    expect(compiled.querySelector('.scene-open-link')?.getAttribute('href')).toContain(
      '/viewer/courtyard-study',
    );
    expect(
      Array.from(compiled.querySelectorAll('.navbar-links a')).map((link) =>
        link.textContent?.trim(),
      ),
    ).toEqual(['Scenes', 'Viewer']);
    TestBed.inject(SceneSelectionService).select('courtyard-study');
    fixture.detectChanges();
    expect(compiled.querySelectorAll('.navbar-links a')[1].getAttribute('href')).toBe(
      '/viewer/courtyard-study',
    );
  });

  it('shows an empty state when the viewer tab has no selected scene', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/viewer');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.viewer-empty h1')?.textContent).toContain(
      'Choose a scene to view',
    );
  });
});
