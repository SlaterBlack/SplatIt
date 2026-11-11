const DEFAULT_CAMERA = {
  position: [0, 0, 3],
  target: [0, 0, 0],
  fov: 50,
};

function makeStatus(container) {
  const panel = document.createElement('div');
  panel.className = 'splat-viewer-status';
  panel.setAttribute('role', 'status');
  panel.setAttribute('aria-live', 'polite');

  const message = document.createElement('span');
  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = 0;
  progress.hidden = true;

  panel.append(message, progress);
  container.append(panel);
  return { panel, message, progress };
}

function formatLoadedBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB loaded`;
}

/**
 * Create one lazy-loaded Gaussian splat viewer in an existing element.
 * The returned methods are safe to call before the viewer enters the viewport.
 */
export function createSplatViewer(config) {
  if (!(config?.container instanceof HTMLElement)) {
    throw new TypeError('createSplatViewer requires a container HTMLElement.');
  }
  if (typeof config.splatUrl !== 'string' || !config.splatUrl.trim()) {
    throw new TypeError('createSplatViewer requires a splatUrl.');
  }

  const container = config.container;
  const initialCamera = config.initialCamera ?? DEFAULT_CAMERA;
  const status = makeStatus(container);
  container.classList.add('splat-viewer');
  container.style.setProperty('--splat-accent', config.accentColor ?? '#5B497F');
  container.style.background = config.background ?? '#eee9f6';

  let destroyed = false;
  let initialized = false;
  let renderFrame = 0;
  let hideStatusTimer = 0;
  let fetchController;
  let renderer;
  let scene;
  let camera;
  let sparkRenderer;
  let splatMesh;
  let walkMarker;
  let controls;
  let ui;
  let sceneBounds;
  let resizeObserver;
  let intersectionObserver;
  let pendingView = initialCamera;

  const requestRender = () => {
    if (destroyed || !renderer || renderFrame) {
      return;
    }
    renderFrame = requestAnimationFrame(() => {
      renderFrame = 0;
      if (!destroyed) {
        renderer.render(scene, camera);
      }
    });
  };

  const applyView = (view) => {
    pendingView = {
      position: [...view.position],
      target: [...view.target],
      fov: view.fov ?? camera?.fov ?? initialCamera.fov ?? DEFAULT_CAMERA.fov,
    };
    if (!camera) {
      return;
    }
    if (controls) {
      controls.setView(pendingView);
    } else {
      camera.position.fromArray(pendingView.position);
      camera.fov = pendingView.fov;
      camera.lookAt(...pendingView.target);
      camera.updateProjectionMatrix();
      requestRender();
    }
  };

  const resize = () => {
    if (!renderer || !camera || destroyed) {
      return;
    }
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  };

  const showError = (error) => {
    console.error('Gaussian splat viewer failed to load.', error);
    status.progress.hidden = true;
    status.message.textContent =
      'We could not load this scene. Please refresh the page or try again later.';
    status.panel.classList.add('has-error');
  };

  const updateProgress = (event) => {
    if (!event.lengthComputable || event.total <= 0) {
      status.progress.removeAttribute('value');
      status.progress.hidden = false;
      status.message.textContent = `Loading scene… ${formatLoadedBytes(event.loaded)}`;
      return;
    }
    const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
    status.progress.value = percent;
    status.progress.hidden = false;
    status.message.textContent = `Loading scene… ${percent}%`;
  };

  const initialize = async () => {
    if (initialized || destroyed) {
      return;
    }
    initialized = true;
    let loadingSplatMesh;
    status.message.textContent = 'Preparing 3D viewer…';
    status.progress.hidden = false;
    status.progress.removeAttribute('value');

    try {
      const [THREE, spark, controlsModule, secureLoader, uiModule] = await Promise.all([
        import('three'),
        import('@sparkjsdev/spark'),
        import('./controls.js'),
        import('./secureLoader.js'),
        import('./ui.js'),
      ]);
      if (destroyed) {
        return;
      }

      const viewerBackground = config.background ?? '#eee9f6';
      const gradientBackground = /gradient\(/i.test(viewerBackground);
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: gradientBackground,
      });
      renderer.domElement.setAttribute(
        'aria-label',
        'Interactive 3D scene. Focus the viewer and press H for navigation controls.',
      );
      renderer.domElement.tabIndex = 0;
      container.prepend(renderer.domElement);
      scene = new THREE.Scene();
      if (gradientBackground) {
        renderer.setClearColor(0x000000, 0);
      } else {
        scene.background = new THREE.Color(viewerBackground);
      }

      camera = new THREE.PerspectiveCamera(pendingView.fov ?? DEFAULT_CAMERA.fov, 1, 0.01, 1000);
      applyView(pendingView);
      container.tabIndex = 0;
      sparkRenderer = new spark.SparkRenderer({ renderer, onDirty: requestRender });
      scene.add(sparkRenderer);
      resize();

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const setPointerRay = (clientX, clientY) => {
        const bounds = renderer.domElement.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) {
          return false;
        }
        pointer.set(
          ((clientX - bounds.left) / bounds.width) * 2 - 1,
          -((clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        return true;
      };
      const pickSplatPoint = (clientX, clientY) => {
        if (!splatMesh) {
          return null;
        }
        if (!setPointerRay(clientX, clientY)) {
          return null;
        }
        return raycaster.intersectObject(splatMesh, true)[0]?.point ?? null;
      };
      controls = controlsModule.createViewerControls({
        THREE,
        camera,
        container,
        element: renderer.domElement,
        initialCamera,
        minDistance: config.minDistance,
        maxDistance: config.maxDistance,
        requestRender,
        pickPoint: pickSplatPoint,
        getSceneBounds() {
          return sceneBounds;
        },
        onWalkHover(point) {
          if (!walkMarker || !point || !sceneBounds) {
            if (walkMarker?.visible) {
              walkMarker.visible = false;
              requestRender();
            }
            return;
          }
          const radius = THREE.MathUtils.clamp(sceneBounds.radius * 0.05, 0.2, 0.6);
          const lift = Math.max(radius * 0.01, 0.005);
          walkMarker.position.set(point.x, point.y + lift, point.z);
          walkMarker.scale.setScalar(radius);
          walkMarker.visible = true;
          requestRender();
        },
        onModeChange(mode) {
          renderer.domElement.classList.toggle('is-walk-mode', mode === 'walk');
          ui?.updateMode(mode);
        },
        onToggleControls() {
          ui?.toggleControls();
        },
        onToggleInfo() {
          ui?.toggleInfo();
        },
      });
      ui = uiModule.createViewerUI(container, {
        getMode: controls.getMode,
        resetView: controls.resetView,
        setColorAdjustments({ brightness, contrast, saturation }) {
          renderer.domElement.style.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        },
        setMode: controls.setMode,
      });

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      window.addEventListener('resize', resize);

      fetchController = new AbortController();
      const fileBytes = await secureLoader.fetchSecureSplat(
        config.splatUrl,
        updateProgress,
        fetchController.signal,
      );
      fetchController = undefined;
      if (destroyed) {
        return;
      }

      loadingSplatMesh = new spark.SplatMesh({
        fileBytes,
        fileName: config.splatFileName,
        onProgress: updateProgress,
        raycastable: true,
      });
      await loadingSplatMesh.initialized;
      if (destroyed) {
        loadingSplatMesh.dispose();
        return;
      }
      splatMesh = loadingSplatMesh;
      loadingSplatMesh = undefined;

      if (config.splatTransform?.position) {
        splatMesh.position.fromArray(config.splatTransform.position);
      }
      if (config.splatTransform?.quaternion) {
        splatMesh.quaternion.fromArray(config.splatTransform.quaternion);
      }
      scene.add(splatMesh);
      splatMesh.updateMatrixWorld(true);
      const worldBounds = splatMesh.getBoundingBox(false).applyMatrix4(splatMesh.matrixWorld);
      sceneBounds = worldBounds.getBoundingSphere(new THREE.Sphere());
      walkMarker = new THREE.Mesh(
        new THREE.RingGeometry(0.94, 1, 48),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          depthWrite: false,
          opacity: 0.9,
          side: THREE.DoubleSide,
          transparent: true,
        }),
      );
      walkMarker.rotation.x = -Math.PI / 2;
      walkMarker.renderOrder = 2;
      walkMarker.visible = false;
      scene.add(walkMarker);
      status.progress.value = 100;
      status.message.textContent = 'Scene loaded.';
      requestRender();
      hideStatusTimer = window.setTimeout(() => {
        status.panel.hidden = true;
      }, 1200);
    } catch (error) {
      loadingSplatMesh?.dispose();
      if (!destroyed) {
        if (splatMesh) {
          scene?.remove(splatMesh);
          splatMesh.dispose();
          splatMesh = undefined;
        }
        showError(error);
      }
    }
  };

  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          intersectionObserver.disconnect();
          void initialize();
        }
      },
      { rootMargin: '200px' },
    );
    intersectionObserver.observe(container);
  } else {
    void initialize();
  }

  return {
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      fetchController?.abort();
      controls?.destroy();
      ui?.destroy();
      window.removeEventListener('resize', resize);
      window.clearTimeout(hideStatusTimer);
      if (renderFrame) {
        cancelAnimationFrame(renderFrame);
      }
      if (splatMesh) {
        scene?.remove(splatMesh);
        splatMesh.dispose();
      }
      if (walkMarker) {
        scene?.remove(walkMarker);
        walkMarker.geometry.dispose();
        walkMarker.material.dispose();
      }
      if (sparkRenderer) {
        scene?.remove(sparkRenderer);
        sparkRenderer.dispose();
      }
      renderer?.dispose();
      renderer?.domElement.remove();
      status.panel.remove();
    },
    setView(view) {
      if (!view?.position || !view?.target) {
        throw new TypeError('setView requires position and target arrays.');
      }
      applyView(view);
    },
    resetView() {
      applyView(initialCamera);
    },
  };
}
