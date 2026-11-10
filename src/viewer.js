const DEFAULT_CAMERA = {
    position: [0, 0, 3],
    target: [0, 0, 0],
    fov: 50
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
    container.style.setProperty('--splat-accent', config.accentColor ?? '#84d8bd');
    container.style.background = config.background ?? '#111820';

    let destroyed = false;
    let initialized = false;
    let renderFrame = 0;
    let hideStatusTimer = 0;
    let renderer;
    let scene;
    let camera;
    let sparkRenderer;
    let splatMesh;
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
            fov: view.fov ?? camera?.fov ?? initialCamera.fov ?? DEFAULT_CAMERA.fov
        };
        if (!camera) {
            return;
        }
        camera.position.fromArray(pendingView.position);
        camera.fov = pendingView.fov;
        camera.lookAt(...pendingView.target);
        camera.updateProjectionMatrix();
        requestRender();
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
        let decodedSplats;
        status.message.textContent = 'Preparing 3D viewer…';
        status.progress.hidden = false;
        status.progress.removeAttribute('value');

        try {
            const [THREE, spark] = await Promise.all([import('three'), import('@sparkjsdev/spark')]);
            if (destroyed) {
                return;
            }

            const gradientBackground = /gradient\(/i.test(config.background ?? '');
            renderer = new THREE.WebGLRenderer({
                antialias: false,
                alpha: gradientBackground
            });
            renderer.domElement.setAttribute('aria-hidden', 'true');
            container.prepend(renderer.domElement);
            scene = new THREE.Scene();
            if (gradientBackground) {
                renderer.setClearColor(0x000000, 0);
            } else {
                scene.background = new THREE.Color(config.background ?? '#111820');
            }

            camera = new THREE.PerspectiveCamera(pendingView.fov ?? DEFAULT_CAMERA.fov, 1, 0.01, 1000);
            applyView(pendingView);
            sparkRenderer = new spark.SparkRenderer({ renderer, onDirty: requestRender });
            scene.add(sparkRenderer);
            resize();

            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(container);
            window.addEventListener('resize', resize);

            const loader = new spark.SplatLoader();
            decodedSplats = await loader.loadAsync(config.splatUrl, updateProgress);
            if (destroyed) {
                decodedSplats.dispose();
                return;
            }

            splatMesh =
                decodedSplats instanceof spark.ExtSplats
                    ? new spark.SplatMesh({ extSplats: decodedSplats })
                    : new spark.SplatMesh({ packedSplats: decodedSplats });
            await splatMesh.initialized;
            if (destroyed) {
                splatMesh.dispose();
                splatMesh = undefined;
                return;
            }

            if (config.splatTransform?.position) {
                splatMesh.position.fromArray(config.splatTransform.position);
            }
            if (config.splatTransform?.quaternion) {
                splatMesh.quaternion.fromArray(config.splatTransform.quaternion);
            }
            scene.add(splatMesh);
            status.progress.value = 100;
            status.message.textContent = 'Scene loaded.';
            requestRender();
            hideStatusTimer = window.setTimeout(() => {
                status.panel.hidden = true;
            }, 1200);
        } catch (error) {
            if (!destroyed) {
                if (splatMesh) {
                    scene?.remove(splatMesh);
                    splatMesh.dispose();
                    splatMesh = undefined;
                } else {
                    decodedSplats?.dispose();
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
            { rootMargin: '200px' }
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
            window.removeEventListener('resize', resize);
            window.clearTimeout(hideStatusTimer);
            if (renderFrame) {
                cancelAnimationFrame(renderFrame);
            }
            if (splatMesh) {
                scene?.remove(splatMesh);
                splatMesh.dispose();
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
        }
    };
}
