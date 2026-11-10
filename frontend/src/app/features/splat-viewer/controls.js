const DEFAULT_MIN_DISTANCE = 0.15;
const DEFAULT_MAX_DISTANCE = 100;
const DAMPING = 12;

export function createViewerControls({
  THREE,
  camera,
  container,
  element,
  initialCamera,
  minDistance = DEFAULT_MIN_DISTANCE,
  maxDistance = DEFAULT_MAX_DISTANCE,
  requestRender,
  pickPoint,
  getSceneBounds,
  onModeChange,
  onToggleControls,
  onToggleInfo,
  onSpeedChange,
  onWalkHover,
}) {
  const minZoom =
    Number.isFinite(minDistance) && minDistance > 0 ? minDistance : DEFAULT_MIN_DISTANCE;
  const maxZoom =
    Number.isFinite(maxDistance) && maxDistance > minZoom ? maxDistance : DEFAULT_MAX_DISTANCE;
  const initialTarget = new THREE.Vector3(...initialCamera.target);
  const currentTarget = initialTarget.clone();
  const targetTarget = initialTarget.clone();
  const currentSpherical = new THREE.Spherical().setFromVector3(
    new THREE.Vector3(...initialCamera.position).sub(initialTarget),
  );
  const targetSpherical = currentSpherical.clone();
  const pointerPositions = new Map();
  const pressedKeys = new Set();
  const movement = new THREE.Vector3();
  const flyVelocity = new THREE.Vector3();
  const walkDestination = new THREE.Vector3();
  const walkStep = new THREE.Vector3();
  const walkDirection = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const lastCentroid = new THREE.Vector2();
  let lastPointer = new THREE.Vector2();
  let lastPinchDistance = 0;
  let dragMode = 'orbit';
  let mode = 'orbit';
  let moveSpeed = 2.5;
  let walkingTo = false;
  let walkClickTimer = 0;
  let pendingWalkPoint;
  let currentYaw = 0;
  let targetYaw = 0;
  let currentPitch = 0;
  let targetPitch = 0;
  let animationFrame = 0;
  let previousFrameTime = 0;
  let destroyed = false;

  function moveWalk(displacement) {
    camera.position.add(displacement);
    return displacement.lengthSq() > 1e-8;
  }

  currentSpherical.radius = THREE.MathUtils.clamp(currentSpherical.radius, minZoom, maxZoom);
  targetSpherical.radius = currentSpherical.radius;
  currentSpherical.phi = THREE.MathUtils.clamp(currentSpherical.phi, 0.02, Math.PI - 0.02);
  targetSpherical.phi = currentSpherical.phi;
  camera.up.set(0, 1, 0);

  function scheduleUpdate() {
    if (!animationFrame && !destroyed) {
      animationFrame = requestAnimationFrame(update);
    }
  }

  function update(time) {
    animationFrame = 0;
    if (destroyed) {
      return;
    }
    const delta = previousFrameTime ? Math.min((time - previousFrameTime) / 1000, 0.05) : 1 / 60;
    previousFrameTime = time;
    const amount = 1 - Math.exp(-DAMPING * delta);
    let moving = false;

    if (mode === 'orbit') {
      currentTarget.lerp(targetTarget, amount);
      currentSpherical.radius += (targetSpherical.radius - currentSpherical.radius) * amount;
      currentSpherical.phi += (targetSpherical.phi - currentSpherical.phi) * amount;
      currentSpherical.theta +=
        shortestAngle(targetSpherical.theta - currentSpherical.theta) * amount;
      currentSpherical.makeSafe();
      camera.position
        .copy(currentTarget)
        .add(new THREE.Vector3().setFromSpherical(currentSpherical));
      camera.lookAt(currentTarget);
      moving =
        currentTarget.distanceToSquared(targetTarget) > 1e-8 ||
        Math.abs(currentSpherical.radius - targetSpherical.radius) > 1e-5 ||
        Math.abs(currentSpherical.phi - targetSpherical.phi) > 1e-5 ||
        Math.abs(shortestAngle(targetSpherical.theta - currentSpherical.theta)) > 1e-5;
    } else {
      currentYaw += shortestAngle(targetYaw - currentYaw) * amount;
      currentPitch += (targetPitch - currentPitch) * amount;
      camera.rotation.order = 'YXZ';
      camera.rotation.set(currentPitch, currentYaw, 0, 'YXZ');

      movement.set(0, 0, 0);
      camera.getWorldDirection(forward);
      if (mode === 'walk') {
        forward.y = 0;
        if (forward.lengthSq() < 1e-8) {
          forward.set(Math.sin(currentYaw), 0, -Math.cos(currentYaw));
        }
        forward.normalize();
      }
      right.crossVectors(forward, mode === 'walk' ? up : camera.up).normalize();
      if (pressedKeys.has('w')) movement.add(forward);
      if (pressedKeys.has('s')) movement.sub(forward);
      if (pressedKeys.has('d')) movement.add(right);
      if (pressedKeys.has('a')) movement.sub(right);
      if (mode === 'fly') {
        if (pressedKeys.has('e')) movement.add(up);
        if (pressedKeys.has('q')) movement.sub(up);
      }

      if (movement.lengthSq() > 0) {
        const speed = moveSpeed * (pressedKeys.has('shift') ? 3 : 1);
        const scaledSpeed =
          pressedKeys.has('control') || pressedKeys.has('alt') ? speed * 0.35 : speed;
        movement.normalize().multiplyScalar(scaledSpeed);
      }
      if (mode === 'walk') {
        if (walkingTo && movement.lengthSq() === 0) {
          walkDirection.copy(walkDestination).sub(camera.position);
          walkDirection.y = 0;
          if (walkDirection.length() <= moveSpeed * delta) {
            walkingTo = false;
          } else {
            movement.copy(walkDirection.normalize()).multiplyScalar(moveSpeed);
          }
        }
        flyVelocity.lerp(movement, amount);
        walkStep.copy(flyVelocity).multiplyScalar(delta);
        moving = moveWalk(walkStep);
        if (!moving && !walkingTo && movement.lengthSq() > 0) {
          flyVelocity.set(0, 0, 0);
        }
        moving ||= walkingTo || movement.lengthSq() > 0;
      } else {
        flyVelocity.lerp(movement, amount);
        if (flyVelocity.lengthSq() > 1e-5) {
          camera.position.addScaledVector(flyVelocity, delta);
          moving = true;
        } else {
          flyVelocity.set(0, 0, 0);
        }
      }
      moving ||=
        Math.abs(shortestAngle(targetYaw - currentYaw)) > 1e-5 ||
        Math.abs(targetPitch - currentPitch) > 1e-5;
    }

    requestRender();
    if (moving) {
      scheduleUpdate();
    } else {
      previousFrameTime = 0;
    }
  }

  function panBy(deltaX, deltaY) {
    camera.updateMatrixWorld();
    const distance = targetSpherical.radius;
    const scale =
      (distance * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) /
      Math.max(1, container.clientHeight);
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    targetTarget.addScaledVector(right, -deltaX * scale);
    targetTarget.addScaledVector(cameraUp, deltaY * scale);
    scheduleUpdate();
  }

  function rotateBy(deltaX, deltaY) {
    targetSpherical.theta -= (2 * Math.PI * deltaX) / Math.max(1, container.clientHeight);
    targetSpherical.phi = THREE.MathUtils.clamp(
      targetSpherical.phi - (2 * Math.PI * deltaY) / Math.max(1, container.clientHeight),
      0.02,
      Math.PI - 0.02,
    );
    scheduleUpdate();
  }

  function zoomBy(factor) {
    targetSpherical.radius = THREE.MathUtils.clamp(
      targetSpherical.radius * factor,
      minZoom,
      maxZoom,
    );
    scheduleUpdate();
  }

  function setView(view) {
    if (!view?.position || !view?.target) {
      throw new TypeError('setView requires position and target arrays.');
    }
    if (mode !== 'orbit') {
      setMode('orbit');
    }
    const nextPosition = new THREE.Vector3(...view.position);
    targetTarget.fromArray(view.target);
    targetSpherical.setFromVector3(nextPosition.sub(targetTarget));
    targetSpherical.radius = THREE.MathUtils.clamp(targetSpherical.radius, minZoom, maxZoom);
    targetSpherical.phi = THREE.MathUtils.clamp(targetSpherical.phi, 0.02, Math.PI - 0.02);
    if (view.fov && Number.isFinite(view.fov)) {
      camera.fov = view.fov;
      camera.updateProjectionMatrix();
    }
    scheduleUpdate();
  }

  function resetView() {
    if (mode !== 'orbit') {
      setMode('orbit');
    }
    setView(initialCamera);
  }

  function frameScene() {
    if (mode !== 'orbit') {
      setMode('orbit');
    }
    const bounds = getSceneBounds?.();
    targetTarget.copy(bounds?.center ?? initialTarget);
    if (bounds?.radius > 0) {
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const limitingFov = Math.min(verticalFov, horizontalFov);
      targetSpherical.radius = THREE.MathUtils.clamp(
        (bounds.radius / Math.sin(limitingFov / 2)) * 1.12,
        minZoom,
        maxZoom,
      );
    }
    scheduleUpdate();
  }

  function focus(point, flyTo = false) {
    if (!point?.isVector3) {
      return;
    }
    if (mode !== 'orbit') {
      setMode('orbit');
    }
    targetTarget.copy(point);
    if (flyTo) {
      targetSpherical.radius = Math.max(minZoom, Math.min(targetSpherical.radius, 2));
    }
    scheduleUpdate();
  }

  function setMode(nextMode) {
    if (!['orbit', 'fly', 'walk'].includes(nextMode) || nextMode === mode) {
      return;
    }
    window.clearTimeout(walkClickTimer);
    walkClickTimer = 0;
    pendingWalkPoint = undefined;
    onWalkHover?.(null);
    camera.updateMatrixWorld();
    camera.getWorldDirection(forward);
    if (nextMode !== 'orbit') {
      currentYaw = targetYaw = Math.atan2(-forward.x, -forward.z);
      currentPitch = targetPitch = Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1));
    } else {
      const radius = targetSpherical.radius;
      targetTarget.copy(camera.position).addScaledVector(forward, radius);
      currentTarget.copy(targetTarget);
      targetSpherical.setFromVector3(camera.position.clone().sub(targetTarget));
      targetSpherical.radius = THREE.MathUtils.clamp(targetSpherical.radius, minZoom, maxZoom);
      currentSpherical.copy(targetSpherical);
    }
    mode = nextMode;
    pressedKeys.clear();
    flyVelocity.set(0, 0, 0);
    walkingTo = false;
    scheduleUpdate();
    onModeChange?.(mode);
  }

  function walkTo(point) {
    if (mode !== 'walk' || !point?.isVector3) {
      return;
    }
    walkDestination.copy(point);
    walkingTo = true;
    scheduleUpdate();
  }

  function handleWalkClick(point) {
    if (walkClickTimer) {
      window.clearTimeout(walkClickTimer);
      walkClickTimer = 0;
      pendingWalkPoint = undefined;
      focus(point, true);
      return;
    }

    pendingWalkPoint = point.clone();
    walkClickTimer = window.setTimeout(() => {
      walkClickTimer = 0;
      const destination = pendingWalkPoint;
      pendingWalkPoint = undefined;
      if (destination) {
        walkTo(destination);
      }
    }, 250);
  }

  function handlePointerDown(event) {
    if (
      event.pointerType === 'mouse' &&
      event.button !== 0 &&
      event.button !== 1 &&
      event.button !== 2
    ) {
      return;
    }
    if (mode === 'walk') {
      onWalkHover?.(null);
    }
    element.focus({ preventScroll: true });
    element.setPointerCapture?.(event.pointerId);
    pointerPositions.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      button: event.button,
    });
    if (pointerPositions.size === 1) {
      lastPointer.set(event.clientX, event.clientY);
      dragMode =
        mode !== 'orbit'
          ? 'look'
          : event.pointerType === 'touch' || (event.button === 0 && !event.shiftKey)
            ? 'orbit'
            : 'pan';
    } else if (pointerPositions.size === 2) {
      const [first, second] = [...pointerPositions.values()];
      lastCentroid.set((first.x + second.x) / 2, (first.y + second.y) / 2);
      lastPinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
    }
    event.preventDefault();
  }

  function handlePointerMove(event) {
    const current = pointerPositions.get(event.pointerId);
    if (!current) {
      if (mode === 'walk' && event.pointerType !== 'touch') {
        onWalkHover?.(pickPoint?.(event.clientX, event.clientY) ?? null);
      }
      return;
    }
    if (mode === 'walk') {
      onWalkHover?.(null);
    }
    current.x = event.clientX;
    current.y = event.clientY;

    if (pointerPositions.size >= 2 && mode === 'orbit') {
      const [first, second] = [...pointerPositions.values()];
      const centroidX = (first.x + second.x) / 2;
      const centroidY = (first.y + second.y) / 2;
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      panBy(centroidX - lastCentroid.x, centroidY - lastCentroid.y);
      if (lastPinchDistance > 0 && distance > 0) {
        zoomBy(lastPinchDistance / distance);
      }
      lastCentroid.set(centroidX, centroidY);
      lastPinchDistance = distance;
    } else {
      const deltaX = event.clientX - lastPointer.x;
      const deltaY = event.clientY - lastPointer.y;
      if (mode !== 'orbit') {
        targetYaw -= deltaX * 0.004;
        targetPitch = THREE.MathUtils.clamp(targetPitch - deltaY * 0.004, -1.55, 1.55);
        scheduleUpdate();
      } else if (dragMode === 'pan') {
        panBy(deltaX, deltaY);
      } else {
        rotateBy(deltaX, deltaY);
      }
      lastPointer.set(event.clientX, event.clientY);
    }
    event.preventDefault();
  }

  function handlePointerUp(event) {
    const pointer = pointerPositions.get(event.pointerId);
    if (
      mode === 'walk' &&
      pointer?.button === 0 &&
      Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) < 5
    ) {
      const point = pickPoint?.(event.clientX, event.clientY);
      if (point) {
        handleWalkClick(point);
      }
    }
    pointerPositions.delete(event.pointerId);
    if (mode === 'walk' && event.pointerType !== 'touch' && pointerPositions.size === 0) {
      onWalkHover?.(pickPoint?.(event.clientX, event.clientY) ?? null);
    }
    if (pointerPositions.size === 1) {
      const remaining = [...pointerPositions.values()][0];
      lastPointer.set(remaining.x, remaining.y);
    }
    lastPinchDistance = 0;
  }

  function handleWheel(event) {
    event.preventDefault();
    if (mode === 'orbit') {
      zoomBy(Math.exp(event.deltaY * 0.001));
    } else {
      moveSpeed = THREE.MathUtils.clamp(moveSpeed * Math.exp(-event.deltaY * 0.001), 0.1, 20);
      onSpeedChange?.(moveSpeed);
    }
  }

  function handleDoubleClick(event) {
    if (!pickPoint || mode === 'walk') {
      return;
    }
    const point = pickPoint(event.clientX, event.clientY);
    if (point) {
      focus(point, mode === 'fly');
    }
  }

  function handleKeyDown(event) {
    if (isEditableTarget(event.target)) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'h') {
      event.preventDefault();
      if (event.shiftKey) onToggleInfo?.();
      else onToggleControls?.();
    } else if (key === 'v') {
      event.preventDefault();
      setMode(mode === 'orbit' ? 'fly' : 'orbit');
    } else if (key === 'escape' && mode === 'walk') {
      event.preventDefault();
      setMode('orbit');
    } else if (key === 'r') {
      event.preventDefault();
      resetView();
    } else if (key === 'f') {
      event.preventDefault();
      frameScene();
    } else if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'control', 'alt'].includes(key)) {
      pressedKeys.add(key);
      if (mode === 'walk' && ['w', 'a', 's', 'd'].includes(key)) {
        walkingTo = false;
      }
      if (mode !== 'orbit') scheduleUpdate();
    }
  }

  function handleKeyUp(event) {
    pressedKeys.delete(event.key.toLowerCase());
  }

  function handleBlur() {
    pressedKeys.clear();
    pointerPositions.clear();
    walkingTo = false;
    onWalkHover?.(null);
    window.clearTimeout(walkClickTimer);
    walkClickTimer = 0;
    pendingWalkPoint = undefined;
  }

  function handlePointerLeave() {
    if (pointerPositions.size === 0) {
      onWalkHover?.(null);
    }
  }

  element.addEventListener('pointerdown', handlePointerDown);
  element.addEventListener('pointermove', handlePointerMove);
  element.addEventListener('pointerup', handlePointerUp);
  element.addEventListener('pointercancel', handlePointerUp);
  element.addEventListener('pointerleave', handlePointerLeave);
  element.addEventListener('wheel', handleWheel, { passive: false });
  element.addEventListener('dblclick', handleDoubleClick);
  element.addEventListener('contextmenu', preventContextMenu);
  container.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', handleBlur);

  return {
    destroy() {
      destroyed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      window.clearTimeout(walkClickTimer);
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerUp);
      element.removeEventListener('pointerleave', handlePointerLeave);
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('dblclick', handleDoubleClick);
      element.removeEventListener('contextmenu', preventContextMenu);
      container.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    },
    frameScene,
    focus,
    getMode: () => mode,
    resetView,
    setMode,
    setView,
  };
}

function isEditableTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function preventContextMenu(event) {
  event.preventDefault();
}

function shortestAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
