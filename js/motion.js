/**
 * Memory Hook — Device Motion abstraction
 *
 * Web / Capacitor shared entry for physical shake detection.
 * Desktop without sensors must no-op gracefully.
 *
 * Public API (also via MemoryHookMotion.createMotionController()):
 *   startMotionTracking(options?)
 *   stopMotionTracking()
 *   onShake(callback) → unsubscribe
 *   requestPermission()
 *   isSupported()
 *   needsPermission()
 */
(function (root) {
  "use strict";

  var SHAKE_THRESHOLD = 22;
  var SHAKE_COOLDOWN_MS = 1100;

  var listeners = [];
  var started = false;
  var lastShakeAt = 0;
  var boundMotion = null;

  function isSupported() {
    return typeof DeviceMotionEvent !== "undefined";
  }

  function needsPermission() {
    return (
      isSupported() &&
      typeof DeviceMotionEvent.requestPermission === "function"
    );
  }

  function requestPermission() {
    if (!needsPermission()) {
      return Promise.resolve("granted");
    }
    return DeviceMotionEvent.requestPermission()
      .then(function (res) {
        return res || "denied";
      })
      .catch(function () {
        return "denied";
      });
  }

  function onShake(callback) {
    if (typeof callback !== "function") {
      return function () {};
    }
    listeners.push(callback);
    return function unsubscribe() {
      var i = listeners.indexOf(callback);
      if (i >= 0) listeners.splice(i, 1);
    };
  }

  function emitShake(payload) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](payload);
      } catch (_err) {
        /* never break the host app */
      }
    }
  }

  function handleDeviceMotion(e) {
    var a = (e && (e.accelerationIncludingGravity || e.acceleration)) || null;
    if (!a) return;
    var ax = a.x || 0;
    var ay = a.y || 0;
    var az = a.z || 0;
    var mag = Math.sqrt(ax * ax + ay * ay + az * az);
    var now = Date.now();
    if (mag > SHAKE_THRESHOLD && now - lastShakeAt > SHAKE_COOLDOWN_MS) {
      lastShakeAt = now;
      emitShake({
        ax: ax,
        ay: ay,
        az: az,
        magnitude: mag,
        at: now,
        source: "device-motion",
      });
    }
  }

  /**
   * @param {{ requestPermission?: boolean }} [options]
   * @returns {Promise<{ ok: boolean, reason?: string }>}
   */
  function startMotionTracking(options) {
    var opts = options || {};
    if (started) {
      return Promise.resolve({ ok: true, reason: "already-started" });
    }
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
      return Promise.resolve({ ok: false, reason: "no-window" });
    }
    if (!isSupported()) {
      return Promise.resolve({ ok: false, reason: "unsupported" });
    }

    var gate =
      opts.requestPermission === false
        ? Promise.resolve("granted")
        : requestPermission();

    return gate.then(function (permission) {
      if (permission !== "granted") {
        return { ok: false, reason: "permission-denied" };
      }
      boundMotion = handleDeviceMotion;
      window.addEventListener("devicemotion", boundMotion, { passive: true });
      started = true;
      return { ok: true };
    });
  }

  function stopMotionTracking() {
    if (boundMotion && typeof window !== "undefined" && window.removeEventListener) {
      window.removeEventListener("devicemotion", boundMotion);
    }
    boundMotion = null;
    started = false;
  }

  function createMotionController() {
    return {
      startMotionTracking: startMotionTracking,
      stopMotionTracking: stopMotionTracking,
      onShake: onShake,
      requestPermission: requestPermission,
      isSupported: isSupported,
      needsPermission: needsPermission,
    };
  }

  root.MemoryHookMotion = {
    startMotionTracking: startMotionTracking,
    stopMotionTracking: stopMotionTracking,
    onShake: onShake,
    requestPermission: requestPermission,
    isSupported: isSupported,
    needsPermission: needsPermission,
    createMotionController: createMotionController,
  };
})(typeof window !== "undefined" ? window : globalThis);
