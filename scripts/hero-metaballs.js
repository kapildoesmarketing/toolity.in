/* Designed by Kapil Pidhwani: Interactive 3D Raymarched Metaball Fluid Simulation for Toolity.in Hero */

import * as THREE from "https://esm.sh/three@0.178.0";

(function () {
  let scene, camera, renderer, material, mesh;
  let clock;
  let targetMousePosition = new THREE.Vector2(0.5, 0.5);
  let mousePosition = new THREE.Vector2(0.5, 0.5);
  let cursorSphere3D = new THREE.Vector3(0, 0, 0);
  let isVisible = true;
  let animFrameId = null;

  // Device & Performance Detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isLowPowerDevice = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

  // Theme Presets (Dark = Purple/Violet Holographic; Light = Ocean Cyan/Blue)
  const THEME_PRESETS = {
    dark: {
      sphereCount: isMobile ? 4 : 7,
      ambientIntensity: 0.08,
      diffuseIntensity: 1.0,
      specularIntensity: 2.2,
      specularPower: 4,
      fresnelPower: 0.9,
      backgroundColor: new THREE.Color(0x090a0c),
      sphereColor: new THREE.Color(0x060612),
      lightColor: new THREE.Color(0xccaaff),
      lightPosition: new THREE.Vector3(0.9, 0.9, 1.2),
      smoothness: 0.65,
      contrast: 1.8,
      fogDensity: 0.06,
      cursorGlowIntensity: 1.1,
      cursorGlowRadius: 2.0,
      cursorGlowColor: new THREE.Color(0xaa77ff)
    },
    light: {
      sphereCount: isMobile ? 4 : 7,
      ambientIntensity: 0.14,
      diffuseIntensity: 0.95,
      specularIntensity: 2.0,
      specularPower: 5,
      fresnelPower: 1.0,
      backgroundColor: new THREE.Color(0xffffff),
      sphereColor: new THREE.Color(0xf6f2ff),
      lightColor: new THREE.Color(0x7c3aed),
      lightPosition: new THREE.Vector3(0.8, 1.1, 0.9),
      smoothness: 0.60,
      contrast: 1.7,
      fogDensity: 0.03,
      cursorGlowIntensity: 0.5,
      cursorGlowRadius: 1.8,
      cursorGlowColor: new THREE.Color(0x9333ea)
    }
  };

  const currentSettings = {
    ...THEME_PRESETS.light,
    fixedTopLeftRadius: 0.75,
    fixedBottomRightRadius: 0.85,
    smallTopLeftRadius: 0.28,
    smallBottomRightRadius: 0.32,
    cursorRadiusMin: 0.08,
    cursorRadiusMax: 0.16,
    animationSpeed: 0.55,
    movementScale: 1.1,
    mouseSmoothness: 0.08,
    mergeDistance: 1.4,
    mouseProximityEffect: true,
    minMovementScale: 0.3,
    maxMovementScale: 0.95
  };

  function init() {
    const container = document.getElementById("hero-metaballs");
    if (!container) return;

    // Detect initial theme from document
    const activeTheme = document.documentElement.getAttribute("data-theme") || "light";
    Object.assign(currentSettings, THEME_PRESETS[activeTheme] || THEME_PRESETS.light);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    clock = new THREE.Clock();

    const rect = container.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight;

    renderer = new THREE.WebGLRenderer({
      antialias: !isMobile && !isLowPowerDevice,
      alpha: true,
      powerPreference: isMobile ? "default" : "high-performance",
      preserveDrawingBuffer: false,
      premultipliedAlpha: false
    });

    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = renderer.domElement;
    canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
    `;
    container.appendChild(canvas);

    material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(width, height) },
        uActualResolution: { value: new THREE.Vector2(width * pixelRatio, height * pixelRatio) },
        uPixelRatio: { value: pixelRatio },
        uMousePosition: { value: new THREE.Vector2(0.5, 0.5) },
        uCursorSphere: { value: new THREE.Vector3(0, 0, 0) },
        uCursorRadius: { value: currentSettings.cursorRadiusMin },
        uSphereCount: { value: currentSettings.sphereCount },
        uFixedTopLeftRadius: { value: currentSettings.fixedTopLeftRadius },
        uFixedBottomRightRadius: { value: currentSettings.fixedBottomRightRadius },
        uSmallTopLeftRadius: { value: currentSettings.smallTopLeftRadius },
        uSmallBottomRightRadius: { value: currentSettings.smallBottomRightRadius },
        uMergeDistance: { value: currentSettings.mergeDistance },
        uSmoothness: { value: currentSettings.smoothness },
        uAmbientIntensity: { value: currentSettings.ambientIntensity },
        uDiffuseIntensity: { value: currentSettings.diffuseIntensity },
        uSpecularIntensity: { value: currentSettings.specularIntensity },
        uSpecularPower: { value: currentSettings.specularPower },
        uFresnelPower: { value: currentSettings.fresnelPower },
        uBackgroundColor: { value: currentSettings.backgroundColor },
        uSphereColor: { value: currentSettings.sphereColor },
        uLightColor: { value: currentSettings.lightColor },
        uLightPosition: { value: currentSettings.lightPosition },
        uContrast: { value: currentSettings.contrast },
        uFogDensity: { value: currentSettings.fogDensity },
        uAnimationSpeed: { value: currentSettings.animationSpeed },
        uMovementScale: { value: currentSettings.movementScale },
        uMouseProximityEffect: { value: currentSettings.mouseProximityEffect },
        uMinMovementScale: { value: currentSettings.minMovementScale },
        uMaxMovementScale: { value: currentSettings.maxMovementScale },
        uCursorGlowIntensity: { value: currentSettings.cursorGlowIntensity },
        uCursorGlowRadius: { value: currentSettings.cursorGlowRadius },
        uCursorGlowColor: { value: currentSettings.cursorGlowColor },
        uIsSafari: { value: isSafari ? 1.0 : 0.0 },
        uIsMobile: { value: isMobile ? 1.0 : 0.0 },
        uIsLowPower: { value: isLowPowerDevice ? 1.0 : 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        ${isMobile || isSafari || isLowPowerDevice ? "precision mediump float;" : "precision highp float;"}

        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uActualResolution;
        uniform float uPixelRatio;
        uniform vec2 uMousePosition;
        uniform vec3 uCursorSphere;
        uniform float uCursorRadius;
        uniform int uSphereCount;
        uniform float uFixedTopLeftRadius;
        uniform float uFixedBottomRightRadius;
        uniform float uSmallTopLeftRadius;
        uniform float uSmallBottomRightRadius;
        uniform float uMergeDistance;
        uniform float uSmoothness;
        uniform float uAmbientIntensity;
        uniform float uDiffuseIntensity;
        uniform float uSpecularIntensity;
        uniform float uSpecularPower;
        uniform float uFresnelPower;
        uniform vec3 uBackgroundColor;
        uniform vec3 uSphereColor;
        uniform vec3 uLightColor;
        uniform vec3 uLightPosition;
        uniform float uContrast;
        uniform float uFogDensity;
        uniform float uAnimationSpeed;
        uniform float uMovementScale;
        uniform bool uMouseProximityEffect;
        uniform float uMinMovementScale;
        uniform float uMaxMovementScale;
        uniform float uCursorGlowIntensity;
        uniform float uCursorGlowRadius;
        uniform vec3 uCursorGlowColor;
        uniform float uIsSafari;
        uniform float uIsMobile;
        uniform float uIsLowPower;

        varying vec2 vUv;

        const float PI = 3.14159265359;
        const float EPSILON = 0.001;
        const float MAX_DIST = 100.0;

        float smin(float a, float b, float k) {
          float h = max(k - abs(a - b), 0.0) / k;
          return min(a, b) - h * h * k * 0.25;
        }

        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        vec3 screenToWorld(vec2 normalizedPos) {
          vec2 uv = normalizedPos * 2.0 - 1.0;
          uv.x *= uResolution.x / uResolution.y;
          return vec3(uv * 2.0, 0.0);
        }

        float getDistanceToCenter(vec2 pos) {
          float dist = length(pos - vec2(0.5, 0.5)) * 2.0;
          return smoothstep(0.0, 1.0, dist);
        }

        float sceneSDF(vec3 pos) {
          float result = MAX_DIST;

          vec3 topLeftPos = screenToWorld(vec2(0.08, 0.92));
          float topLeft = sdSphere(pos - topLeftPos, uFixedTopLeftRadius);

          vec3 smallTopLeftPos = screenToWorld(vec2(0.25, 0.72));
          float smallTopLeft = sdSphere(pos - smallTopLeftPos, uSmallTopLeftRadius);

          vec3 bottomRightPos = screenToWorld(vec2(0.92, 0.08));
          float bottomRight = sdSphere(pos - bottomRightPos, uFixedBottomRightRadius);

          vec3 smallBottomRightPos = screenToWorld(vec2(0.72, 0.25));
          float smallBottomRight = sdSphere(pos - smallBottomRightPos, uSmallBottomRightRadius);

          float t = uTime * uAnimationSpeed;

          float dynamicMovementScale = uMovementScale;
          if (uMouseProximityEffect) {
            float distToCenter = getDistanceToCenter(uMousePosition);
            float mixFactor = smoothstep(0.0, 1.0, distToCenter);
            dynamicMovementScale = mix(uMinMovementScale, uMaxMovementScale, mixFactor);
          }

          int maxIter = uIsMobile > 0.5 ? 4 : (uIsLowPower > 0.5 ? 5 : min(uSphereCount, 8));
          for (int i = 0; i < 8; i++) {
            if (i >= uSphereCount || i >= maxIter) break;

            float fi = float(i);
            float speed = 0.4 + fi * 0.12;
            float radius = 0.12 + mod(fi, 3.0) * 0.06;
            float orbitRadius = (0.3 + mod(fi, 3.0) * 0.15) * dynamicMovementScale;
            float phaseOffset = fi * PI * 0.35;

            float distToCursor = length(vec3(0.0) - uCursorSphere);
            float proximityScale = 1.0 + (1.0 - smoothstep(0.0, 1.0, distToCursor)) * 0.5;
            orbitRadius *= proximityScale;

            vec3 offset;
            if (i == 0) {
              offset = vec3(
                sin(t * speed) * orbitRadius * 0.7,
                sin(t * 0.5) * orbitRadius,
                cos(t * speed * 0.7) * orbitRadius * 0.5
              );
            } else if (i == 1) {
              offset = vec3(
                sin(t * speed + PI) * orbitRadius * 0.5,
                -sin(t * 0.5) * orbitRadius,
                cos(t * speed * 0.7 + PI) * orbitRadius * 0.5
              );
            } else {
              offset = vec3(
                sin(t * speed + phaseOffset) * orbitRadius * 0.8,
                cos(t * speed * 0.85 + phaseOffset * 1.3) * orbitRadius * 0.6,
                sin(t * speed * 0.5 + phaseOffset) * 0.3
              );
            }

            vec3 toCursor = uCursorSphere - offset;
            float cursorDist = length(toCursor);
            if (cursorDist < uMergeDistance && cursorDist > 0.0) {
              float attraction = (1.0 - cursorDist / uMergeDistance) * 0.3;
              offset += normalize(toCursor) * attraction;
            }

            float movingSphere = sdSphere(pos - offset, radius);

            float blend = 0.05;
            if (cursorDist < uMergeDistance) {
              float influence = 1.0 - (cursorDist / uMergeDistance);
              blend = mix(0.05, uSmoothness, influence * influence * influence);
            }

            result = smin(result, movingSphere, blend);
          }

          float cursorBall = sdSphere(pos - uCursorSphere, uCursorRadius);
          float topLeftGroup = smin(topLeft, smallTopLeft, 0.4);
          float bottomRightGroup = smin(bottomRight, smallBottomRight, 0.4);

          result = smin(result, topLeftGroup, 0.3);
          result = smin(result, bottomRightGroup, 0.3);
          result = smin(result, cursorBall, uSmoothness);

          return result;
        }

        vec3 calcNormal(vec3 p) {
          float eps = uIsLowPower > 0.5 ? 0.002 : 0.001;
          return normalize(vec3(
            sceneSDF(p + vec3(eps, 0, 0)) - sceneSDF(p - vec3(eps, 0, 0)),
            sceneSDF(p + vec3(0, eps, 0)) - sceneSDF(p - vec3(0, eps, 0)),
            sceneSDF(p + vec3(0, 0, eps)) - sceneSDF(p - vec3(0, 0, eps))
          ));
        }

        float ambientOcclusion(vec3 p, vec3 n) {
          if (uIsLowPower > 0.5) {
            float h1 = sceneSDF(p + n * 0.03);
            float h2 = sceneSDF(p + n * 0.06);
            float occ = (0.03 - h1) + (0.06 - h2) * 0.5;
            return clamp(1.0 - occ * 2.0, 0.0, 1.0);
          } else {
            float occ = 0.0;
            float weight = 1.0;
            for (int i = 0; i < 5; i++) {
              float dist = 0.01 + 0.015 * float(i * i);
              float h = sceneSDF(p + n * dist);
              occ += (dist - h) * weight;
              weight *= 0.85;
            }
            return clamp(1.0 - occ, 0.0, 1.0);
          }
        }

        float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
          if (uIsLowPower > 0.5) {
            float result = 1.0;
            float t = mint;
            for (int i = 0; i < 3; i++) {
              t += 0.3;
              if (t >= maxt) break;
              float h = sceneSDF(ro + rd * t);
              if (h < EPSILON) return 0.0;
              result = min(result, k * h / t);
            }
            return result;
          } else {
            float result = 1.0;
            float t = mint;
            for (int i = 0; i < 16; i++) {
              if (t >= maxt) break;
              float h = sceneSDF(ro + rd * t);
              if (h < EPSILON) return 0.0;
              result = min(result, k * h / t);
              t += h;
            }
            return result;
          }
        }

        float rayMarch(vec3 ro, vec3 rd) {
          float t = 0.0;
          int maxSteps = uIsMobile > 0.5 ? 16 : (uIsSafari > 0.5 ? 18 : 42);

          for (int i = 0; i < 42; i++) {
            if (i >= maxSteps) break;

            vec3 p = ro + rd * t;
            float d = sceneSDF(p);

            if (d < EPSILON) return t;
            if (t > 5.0) break;

            t += d * (uIsLowPower > 0.5 ? 1.2 : 0.9);
          }

          return -1.0;
        }

        vec3 lighting(vec3 p, vec3 rd, float t) {
          if (t < 0.0) return vec3(0.0);

          vec3 normal = calcNormal(p);
          vec3 viewDir = -rd;
          vec3 baseColor = uSphereColor;
          float ao = ambientOcclusion(p, normal);

          vec3 ambient = uLightColor * uAmbientIntensity * ao;
          vec3 lightDir = normalize(uLightPosition);
          float diff = max(dot(normal, lightDir), 0.0);
          float shadow = softShadow(p, lightDir, 0.01, 10.0, 20.0);
          vec3 diffuse = uLightColor * diff * uDiffuseIntensity * shadow;

          vec3 reflectDir = reflect(-lightDir, normal);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), uSpecularPower);
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uFresnelPower);
          vec3 specular = uLightColor * spec * uSpecularIntensity * fresnel;
          vec3 fresnelRim = uLightColor * fresnel * 0.4;

          float distToCursor = length(p - uCursorSphere);
          if (distToCursor < uCursorRadius + 0.4) {
            float highlight = 1.0 - smoothstep(0.0, uCursorRadius + 0.4, distToCursor);
            specular += uLightColor * highlight * 0.2;
            float glow = exp(-distToCursor * 3.0) * 0.15;
            ambient += uLightColor * glow * 0.5;
          }

          vec3 color = (baseColor + ambient + diffuse + specular + fresnelRim) * ao;
          color = pow(color, vec3(uContrast * 0.9));
          color = color / (color + vec3(0.8));

          return color;
        }

        float calculateCursorGlow(vec3 worldPos) {
          float dist = length(worldPos.xy - uCursorSphere.xy);
          float glow = 1.0 - smoothstep(0.0, uCursorGlowRadius, dist);
          glow = pow(glow, 2.0);
          return glow * uCursorGlowIntensity;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy * 2.0 - uActualResolution.xy) / uActualResolution.xy;
          uv.x *= uResolution.x / uResolution.y;

          vec3 ro = vec3(uv * 2.0, -1.0);
          vec3 rd = vec3(0.0, 0.0, 1.0);

          float t = rayMarch(ro, rd);
          vec3 p = ro + rd * t;
          vec3 color = lighting(p, rd, t);

          float cursorGlow = calculateCursorGlow(ro);
          vec3 glowContribution = uCursorGlowColor * cursorGlow;

          if (t > 0.0) {
            float fogAmount = 1.0 - exp(-t * uFogDensity);
            color = mix(color, uBackgroundColor.rgb, fogAmount * 0.3);
            color += glowContribution * 0.3;
            gl_FragColor = vec4(color, 1.0);
          } else {
            if (cursorGlow > 0.01) {
              gl_FragColor = vec4(glowContribution, cursorGlow * 0.7);
            } else {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            }
          }
        }
      `,
      transparent: true
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    setupEventListeners(container);
    setupVisibilityObserver(container);
    animate();
  }

  function screenToWorldJS(normalizedX, normalizedY) {
    const uv_x = normalizedX * 2.0 - 1.0;
    const uv_y = normalizedY * 2.0 - 1.0;
    const aspect = window.innerWidth / window.innerHeight;
    return new THREE.Vector3(uv_x * aspect * 2.0, uv_y * 2.0, 0.0);
  }

  function onPointerMove(clientX, clientY) {
    targetMousePosition.x = clientX / window.innerWidth;
    targetMousePosition.y = 1.0 - clientY / window.innerHeight;

    const worldPos = screenToWorldJS(targetMousePosition.x, targetMousePosition.y);
    cursorSphere3D.copy(worldPos);

    let closestDistance = 1000.0;
    const fixedPositions = [
      screenToWorldJS(0.08, 0.92),
      screenToWorldJS(0.25, 0.72),
      screenToWorldJS(0.92, 0.08),
      screenToWorldJS(0.72, 0.25)
    ];

    fixedPositions.forEach((pos) => {
      const dist = cursorSphere3D.distanceTo(pos);
      closestDistance = Math.min(closestDistance, dist);
    });

    const proximityFactor = Math.max(0, 1.0 - closestDistance / currentSettings.mergeDistance);
    const smoothFactor = proximityFactor * proximityFactor * (3.0 - 2.0 * proximityFactor);
    const dynamicRadius = currentSettings.cursorRadiusMin + (currentSettings.cursorRadiusMax - currentSettings.cursorRadiusMin) * smoothFactor;

    if (material) {
      material.uniforms.uCursorSphere.value.copy(cursorSphere3D);
      material.uniforms.uCursorRadius.value = dynamicRadius;
    }
  }

  function setupEventListeners(container) {
    window.addEventListener("mousemove", (e) => {
      onPointerMove(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (!container || !renderer || !material) return;
      const rect = container.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;

      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(pixelRatio);

      material.uniforms.uResolution.value.set(width, height);
      material.uniforms.uActualResolution.value.set(width * pixelRatio, height * pixelRatio);
      material.uniforms.uPixelRatio.value = pixelRatio;
    }, { passive: true });
  }

  function setupVisibilityObserver(container) {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !animFrameId) {
          clock.start();
          animate();
        }
      });
    }, { threshold: 0.05 });

    observer.observe(container);
  }

  function animate() {
    if (!isVisible) {
      animFrameId = null;
      return;
    }

    animFrameId = requestAnimationFrame(animate);

    mousePosition.x += (targetMousePosition.x - mousePosition.x) * currentSettings.mouseSmoothness;
    mousePosition.y += (targetMousePosition.y - mousePosition.y) * currentSettings.mouseSmoothness;

    if (material) {
      material.uniforms.uTime.value = clock.getElapsedTime();
      material.uniforms.uMousePosition.value = mousePosition;
    }

    renderer.render(scene, camera);
  }

  /**
   * Public Theme Switcher Method
   */
  function setTheme(themeName) {
    const preset = THEME_PRESETS[themeName] || THEME_PRESETS.light;
    if (!material) return;

    material.uniforms.uAmbientIntensity.value = preset.ambientIntensity;
    material.uniforms.uDiffuseIntensity.value = preset.diffuseIntensity;
    material.uniforms.uSpecularIntensity.value = preset.specularIntensity;
    material.uniforms.uSpecularPower.value = preset.specularPower;
    material.uniforms.uFresnelPower.value = preset.fresnelPower;
    material.uniforms.uBackgroundColor.value.copy(preset.backgroundColor);
    material.uniforms.uSphereColor.value.copy(preset.sphereColor);
    material.uniforms.uLightColor.value.copy(preset.lightColor);
    material.uniforms.uLightPosition.value.copy(preset.lightPosition);
    material.uniforms.uSmoothness.value = preset.smoothness;
    material.uniforms.uContrast.value = preset.contrast;
    material.uniforms.uFogDensity.value = preset.fogDensity;
    material.uniforms.uCursorGlowIntensity.value = preset.cursorGlowIntensity;
    material.uniforms.uCursorGlowRadius.value = preset.cursorGlowRadius;
    material.uniforms.uCursorGlowColor.value.copy(preset.cursorGlowColor);
  }

  // Expose to window for global access from theme toggles
  window.HeroMetaballs = {
    setTheme
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
