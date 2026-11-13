import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { routes } from './app.routes';
import { Appearance } from './core/services/appearance';
import { Auth } from './core/services/auth';
import { SceneCatalogService, SplatScene } from './features/scenes/scene-catalog';
import { SceneSelectionService } from './features/scenes/scene-selection.service';

describe('App', () => {
  let storedToken: string | null;

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
    storedToken = 'test-token';
    localStorage.removeItem('splatit_viewer_background');
    localStorage.removeItem('splatit_theme');
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Auth,
          useValue: {
            currentUser: signal({ id: 'user-1', name: 'Test User', email: 'test@example.com' }),
            getToken: () => storedToken,
            fetchCurrentUser: () =>
              of({ user: { id: 'user-1', name: 'Test User', email: 'test@example.com' } }),
            logout: () => {},
          },
        },
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

  it('shows links to other running services from StoreIt', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/scenes');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.service-switcher .navbar-brand').click();
    fixture.detectChanges();

    TestBed.inject(HttpTestingController)
      .expectOne('/api/services')
      .flush({
        services: [
          {
            id: 'splatit',
            name: 'SplatIt',
            url: 'https://splatit.ai3d.com.au/',
            logoUrl: 'https://splatit.ai3d.com.au/SplatItLogo_32.png',
          },
          {
            id: 'clockit',
            name: 'ClockIt',
            url: 'https://clockit.ai3d.com.au:2400/',
            logoUrl: 'https://clockit.ai3d.com.au:2400/ClockItLogo_32x32.png',
          },
        ],
      });
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.service-menu-item') as HTMLAnchorElement;
    expect(fixture.nativeElement.querySelectorAll('.service-menu-item')).toHaveLength(1);
    expect(link.href).toBe('https://clockit.ai3d.com.au:2400/');
    expect(link.textContent).toContain('ClockIt');
    expect(link.querySelector('img')?.src).toBe(
      'https://clockit.ai3d.com.au:2400/ClockItLogo_32x32.png',
    );
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

  it('redirects protected scene routes to login when no token is stored', async () => {
    storedToken = null;
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/viewer/WBH_BIR');
    await fixture.whenStable();

    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/viewer/WBH_BIR');
  });

  it('lets users choose a viewer background from the account menu', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/scenes');
    await fixture.whenStable();
    fixture.detectChanges();

    const appearance = TestBed.inject(Appearance);
    expect(appearance.viewerBackgroundColor()).toBe('#000000');
    expect(appearance.theme()).toBe('default');

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.account-menu-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('.account-menu-panel')?.textContent).toContain('Install App');
    expect(compiled.querySelector('a[routerLink="/profile"]')?.textContent).toContain('My account');
    (compiled.querySelector('[data-action="appearance"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('[data-theme-trigger]')?.textContent).toContain('Default');
    (compiled.querySelector('[data-theme-trigger]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('[data-theme-option="retro"]')?.textContent).toContain('Retro');
    (compiled.querySelector('[data-theme-option="retro"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(appearance.theme()).toBe('retro');
    expect(localStorage.getItem('splatit_theme')).toBe('retro');
    expect(document.documentElement.dataset['theme']).toBe('retro');

    (compiled.querySelector('.background-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelectorAll('.background-option')).toHaveLength(3);

    (compiled.querySelector('[aria-label="Light lavender"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(appearance.viewerBackgroundColor()).toBe('#9B8AC4');
    expect(localStorage.getItem('splatit_viewer_background')).toBe('#9B8AC4');

    (compiled.querySelector('.background-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    (compiled.querySelector('[aria-label="White"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(appearance.viewerBackgroundColor()).toBe('#FFFFFF');

    (compiled.querySelector('.background-select-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    (compiled.querySelector('[aria-label="Black"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(appearance.viewerBackgroundColor()).toBe('#000000');
  });

  it('opens the collision generation guide from the account menu', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/scenes');
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('.account-menu-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    (compiled.querySelector('[data-action="guides"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(compiled.querySelector('#guides-title')?.textContent).toContain('Guides');
    expect(compiled.querySelectorAll('.guide-title')).toHaveLength(2);
    (compiled.querySelector('[data-guide="collision"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('.guide-content pre')?.textContent).toContain(
      '--seed-pos "0,0,0"',
    );
    expect(compiled.querySelector('.guide-content pre')?.textContent).toContain(
      '".\\scene.voxel.json"',
    );
    expect(compiled.querySelector('.guide-content pre')?.textContent).toContain(
      '--voxel-external-fill --voxel-carve --collision-mesh smooth',
    );
    expect(compiled.querySelectorAll('.guide-content li')).toHaveLength(5);

    (compiled.querySelector('[data-guide="install"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(compiled.querySelector('#guide-content-install')?.textContent).toContain('Windows');
    expect(compiled.querySelector('#guide-content-install')?.textContent).toContain('macOS');
    expect(compiled.querySelector('#guide-content-install')?.textContent).toContain('Linux');
    expect(compiled.querySelector('#guide-content-install')?.textContent).toContain(
      'npm install --global @playcanvas/splat-transform',
    );
    expect(compiled.querySelector('.windows-policy-note')?.textContent).toContain(
      'Important for Windows PowerShell',
    );
    expect(compiled.querySelector('.windows-policy-note pre code')?.textContent).toContain(
      'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser',
    );
  });
});
