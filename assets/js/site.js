const header = document.querySelector('[data-header]');
const navToggle = document.querySelector('[data-nav-toggle]');
const nav = document.querySelector('[data-nav]');

const closeNav = () => {
  if (!navToggle || !nav) return;
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.querySelector('.sr-only').textContent = 'Open navigation';
  nav.classList.remove('is-open');
  document.body.classList.remove('nav-open');
};

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isOpen));
    navToggle.querySelector('.sr-only').textContent = isOpen ? 'Open navigation' : 'Close navigation';
    nav.classList.toggle('is-open', !isOpen);
    document.body.classList.toggle('nav-open', !isOpen);
  });
  nav.addEventListener('click', (event) => { if (event.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeNav(); });
}

const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });
document.querySelectorAll('[data-year]').forEach((element) => { element.textContent = new Date().getFullYear(); });

const rotatingPhrase = document.querySelector('[data-rotating-phrase]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const phrases = rotatingPhrase?.dataset.phrases?.split('|').filter(Boolean) ?? [];
document.querySelectorAll('[data-hero-video]').forEach((heroVideo) => {
  const videoHero = heroVideo.closest('[data-home-hero], [data-video-hero]');
  if (!videoHero) return;
  let heroIsVisible = true;
  const heroPlaybackRate = Number(heroVideo.dataset.playbackRate) || 0.7;
  const loopFrame = videoHero.querySelector('[data-hero-loop-frame]');
  const loopMist = videoHero.querySelector('[data-hero-loop-mist]');
  let loopAnimations = [];
  let loopVersion = 0;
  let restartingLoop = false;

  const resetLoopTransition = () => {
    loopVersion += 1;
    loopAnimations.forEach((animation) => animation.cancel());
    loopAnimations = [];
    restartingLoop = false;
    if (loopFrame) loopFrame.hidden = true;
  };
  const restartLoop = () => {
    if (restartingLoop || reduceMotion.matches || !heroIsVisible || document.hidden) return;
    const context = loopFrame?.getContext('2d', { alpha: false });
    if (context && heroVideo.readyState >= 2) {
      loopFrame.width = Math.min(960, heroVideo.videoWidth);
      loopFrame.height = Math.round(loopFrame.width * heroVideo.videoHeight / heroVideo.videoWidth);
      context.drawImage(heroVideo, 0, 0, loopFrame.width, loopFrame.height);
      loopFrame.hidden = false;
      restartingLoop = true;
      const version = loopVersion;
      const timing = { duration: 2200, easing: 'ease-in-out', fill: 'forwards' };
      loopAnimations = [
        heroVideo.animate([{ opacity: 0 }, { opacity: .85 }], timing),
        loopFrame.animate([
          { opacity: .85, filter: 'saturate(.7) contrast(1.08) brightness(.82) blur(0px)' },
          { opacity: 0, filter: 'saturate(.7) contrast(1.08) brightness(.82) blur(12px)' }
        ], timing)
      ];
      if (loopMist) loopAnimations.push(loopMist.animate([
        { opacity: 0 }, { opacity: .12, offset: .45 }, { opacity: 0 }
      ], timing));
      Promise.all(loopAnimations.map((animation) => animation.finished)).then(() => {
        if (version === loopVersion) resetLoopTransition();
      }).catch(() => {});
    }
    heroVideo.currentTime = 0;
    heroVideo.play().catch(() => {});
  };

  heroVideo.defaultPlaybackRate = heroPlaybackRate;
  heroVideo.playbackRate = heroPlaybackRate;
  const revealVideo = () => heroVideo.classList.add('is-ready');
  const pauseVideo = () => {
    heroVideo.pause();
    loopAnimations.forEach((animation) => animation.pause());
  };
  const playVideo = () => {
    if (reduceMotion.matches || !heroIsVisible || document.hidden) return;
    loopAnimations.forEach((animation) => animation.play());
    if (loopFrame && heroVideo.ended) {
      restartLoop();
      return;
    }
    heroVideo.play().catch(() => {});
  };
  const showStaticFrame = () => {
    resetLoopTransition();
    pauseVideo();

    const seekToPosterFrame = () => {
      const posterTime = Number.isFinite(heroVideo.duration)
        ? Math.min(4.6, Math.max(0, heroVideo.duration - 0.15))
        : 0;

      if (Math.abs(heroVideo.currentTime - posterTime) < 0.05) {
        revealVideo();
        return;
      }

      heroVideo.addEventListener('seeked', revealVideo, { once: true });
      heroVideo.currentTime = posterTime;
    };

    if (heroVideo.readyState >= 1) seekToPosterFrame();
    else heroVideo.addEventListener('loadedmetadata', seekToPosterFrame, { once: true });
  };
  const updateMotionPreference = () => {
    if (reduceMotion.matches) showStaticFrame();
    else playVideo();
  };

  heroVideo.addEventListener('loadeddata', revealVideo, { once: true });
  if (loopFrame) heroVideo.addEventListener('ended', restartLoop);

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(([entry]) => {
      heroIsVisible = entry.isIntersecting && entry.intersectionRatio >= 0.12;
      if (heroIsVisible) playVideo();
      else pauseVideo();
    }, { threshold: [0, 0.12, 0.5] });
    videoObserver.observe(videoHero);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseVideo();
    else playVideo();
  });

  reduceMotion.addEventListener?.('change', updateMotionPreference);
  updateMotionPreference();
});

const constructionHero = document.querySelector('.construction-hero');
const constructionVideo = document.querySelector('[data-construction-hero-video]');
const constructionCanvas = document.querySelector('[data-construction-hero-canvas]');

if (constructionHero && constructionVideo && constructionCanvas) {
  const trimStart = .72;
  const trimEndPadding = .85;
  const handoffDuration = 640;
  const outputContext = constructionCanvas.getContext('2d', { alpha: false, desynchronized: true });
  const frames = [];
  let captureRequest = 0;
  let playbackTimer = 0;
  let lastCapturedTime = -1;
  let frameIndex = 0;
  let frameDirection = 1;
  let frameStart = 0;
  let frameEnd = 0;
  let captureComplete = false;
  let handoffComplete = false;
  let capturePrepared = false;
  let preparingCapture = false;
  let captureEnd = Number.POSITIVE_INFINITY;
  let heroIsVisible = true;

  const stopCanvasPlayback = () => {
    if (!playbackTimer) return;
    window.clearInterval(playbackTimer);
    playbackTimer = 0;
  };

  const renderFrame = (index) => {
    const frame = frames[index];
    if (!frame || !outputContext) return;
    outputContext.drawImage(frame, 0, 0, constructionCanvas.width, constructionCanvas.height);
  };

  const drawFrame = () => {
    renderFrame(frameIndex);
    frameIndex += frameDirection;

    if (frameIndex >= frameEnd) {
      frameIndex = frameEnd;
      frameDirection = -1;
    } else if (frameIndex <= frameStart) {
      frameIndex = frameStart;
      frameDirection = 1;
    }
  };

  const startCanvasPlayback = () => {
    if (!handoffComplete || reduceMotion.matches || !heroIsVisible || document.hidden || playbackTimer || frames.length < 2) return;
    drawFrame();
    playbackTimer = window.setInterval(drawFrame, 1000 / 30);
  };

  const captureCurrentFrame = () => {
    if (constructionVideo.readyState < 2 || constructionVideo.currentTime === lastCapturedTime) return;

    const captureWidth = Math.min(960, constructionVideo.videoWidth);
    const captureHeight = Math.round(captureWidth * (constructionVideo.videoHeight / constructionVideo.videoWidth));
    if (!captureWidth || !captureHeight) return;

    const frame = document.createElement('canvas');
    frame.width = captureWidth;
    frame.height = captureHeight;
    frame.getContext('2d', { alpha: false })?.drawImage(constructionVideo, 0, 0, captureWidth, captureHeight);
    frames.push(frame);
    lastCapturedTime = constructionVideo.currentTime;
  };

  const captureWithVideoFrames = () => {
    if (constructionVideo.currentTime >= captureEnd - .045) {
      finishCapture();
      return;
    }
    captureCurrentFrame();
    if (!captureComplete && !constructionVideo.ended) {
      captureRequest = constructionVideo.requestVideoFrameCallback(captureWithVideoFrames);
    }
  };

  const captureWithAnimationFrames = () => {
    if (constructionVideo.currentTime >= captureEnd - .045) {
      finishCapture();
      return;
    }
    captureCurrentFrame();
    if (!captureComplete && !constructionVideo.ended) {
      captureRequest = window.requestAnimationFrame(captureWithAnimationFrames);
    }
  };

  const stopCaptureLoop = () => {
    if (!captureRequest) return;
    if ('cancelVideoFrameCallback' in constructionVideo) constructionVideo.cancelVideoFrameCallback(captureRequest);
    else window.cancelAnimationFrame(captureRequest);
    captureRequest = 0;
  };

  const finishCapture = () => {
    if (captureComplete) return;
    captureComplete = true;
    constructionVideo.pause();
    stopCaptureLoop();
    if (frames.length < 2 || !outputContext) return;

    constructionCanvas.width = frames[0].width;
    constructionCanvas.height = frames[0].height;
    const loopInset = Math.min(3, Math.max(1, Math.floor(frames.length * .015)));
    frameStart = loopInset;
    frameEnd = Math.max(frameStart + 1, frames.length - 1 - loopInset);
    frameIndex = frameEnd;
    frameDirection = -1;
    renderFrame(frameIndex);
    constructionCanvas.classList.add('is-active');
    constructionVideo.classList.add('is-fading-out');
    window.setTimeout(() => {
      constructionVideo.style.display = 'none';
      handoffComplete = true;
      frameIndex = Math.max(frameStart, frameEnd - 1);
      startCanvasPlayback();
    }, handoffDuration);
    constructionHero.dataset.boomerangFrames = String(frames.length);
    constructionHero.dataset.boomerangMemoryMb = String(Math.round((frames.length * frames[0].width * frames[0].height * 4) / 1048576));
  };

  const playCaptureVideo = () => {
    if (reduceMotion.matches || !heroIsVisible || document.hidden || captureComplete) return;
    constructionVideo.play().catch(() => {});
  };

  const showReducedMotionFrame = () => {
    stopCanvasPlayback();
    constructionVideo.pause();

    if (captureComplete && frames.length) {
      constructionCanvas.classList.add('is-active');
      return;
    }

    const seekToStill = () => {
      const stillTime = Number.isFinite(constructionVideo.duration)
        ? Math.min(1.8, Math.max(0, constructionVideo.duration * .42))
        : 0;
      constructionVideo.currentTime = stillTime;
      constructionVideo.classList.add('is-ready');
    };

    if (constructionVideo.readyState >= 1) seekToStill();
    else constructionVideo.addEventListener('loadedmetadata', seekToStill, { once: true });
  };

  const startCapture = () => {
    if (reduceMotion.matches || captureComplete || !capturePrepared) return;
    if (!captureRequest) {
      if ('requestVideoFrameCallback' in constructionVideo) {
        captureRequest = constructionVideo.requestVideoFrameCallback(captureWithVideoFrames);
      } else {
        captureRequest = window.requestAnimationFrame(captureWithAnimationFrames);
      }
    }
    playCaptureVideo();
  };

  const prepareCapture = () => {
    if (reduceMotion.matches || captureComplete || capturePrepared || preparingCapture) return;
    preparingCapture = true;

    const seekToTrimmedStart = () => {
      captureEnd = Number.isFinite(constructionVideo.duration)
        ? Math.max(trimStart + .5, constructionVideo.duration - trimEndPadding)
        : Number.POSITIVE_INFINITY;

      const beginCapture = () => {
        preparingCapture = false;
        capturePrepared = true;
        constructionVideo.classList.add('is-ready');
        startCapture();
      };

      if (Math.abs(constructionVideo.currentTime - trimStart) < .03) beginCapture();
      else {
        constructionVideo.addEventListener('seeked', beginCapture, { once: true });
        constructionVideo.currentTime = trimStart;
      }
    };

    if (constructionVideo.readyState >= 1) seekToTrimmedStart();
    else constructionVideo.addEventListener('loadedmetadata', seekToTrimmedStart, { once: true });
  };

  const updateConstructionMotion = () => {
    if (reduceMotion.matches) {
      showReducedMotionFrame();
      return;
    }

    if (captureComplete) startCanvasPlayback();
    else if (capturePrepared) startCapture();
    else prepareCapture();
  };

  constructionVideo.addEventListener('loadeddata', () => {
    updateConstructionMotion();
  }, { once: true });
  constructionVideo.addEventListener('ended', finishCapture, { once: true });

  if ('IntersectionObserver' in window) {
    const constructionVideoObserver = new IntersectionObserver(([entry]) => {
      heroIsVisible = entry.isIntersecting && entry.intersectionRatio >= .12;
      if (!heroIsVisible) {
        constructionVideo.pause();
        stopCanvasPlayback();
      } else {
        updateConstructionMotion();
      }
    }, { threshold: [0, .12, .5] });
    constructionVideoObserver.observe(constructionHero);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      constructionVideo.pause();
      stopCanvasPlayback();
    } else {
      updateConstructionMotion();
    }
  });

  reduceMotion.addEventListener?.('change', updateConstructionMotion);
  if (constructionVideo.readyState >= 2) {
    updateConstructionMotion();
  } else if (reduceMotion.matches) {
    showReducedMotionFrame();
  }
}

if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  const revealSelectors = [
    '.split-heading',
    '.problem-grid > article',
    '.process-grid > li',
    '.assessment-outcome-copy',
    '.map-cell',
    '.service-grid > article',
    '.about-grid > *',
    '.booking-grid > *',
    '.construction-audit-grid > *',
    '.implementation-statement',
    '.about-compact-grid > *',
    '.closing-cta-grid > *'
  ];
  const revealItems = document.querySelectorAll(revealSelectors.join(','));
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  revealItems.forEach((element) => {
    const siblings = Array.from(element.parentElement?.children ?? []);
    const siblingIndex = Math.max(0, siblings.indexOf(element));
    element.classList.add('reveal-item');
    element.style.setProperty('--reveal-delay', `${Math.min(siblingIndex, 3) * 80}ms`);
    revealObserver.observe(element);
  });

  const progressionItems = document.querySelectorAll('.process-grid, .audit-detail-list');
  const progressionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-progress-visible');
      progressionObserver.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  progressionItems.forEach((element) => progressionObserver.observe(element));
  document.body.classList.add('motion-ready');
}

if (rotatingPhrase && phrases.length > 1 && !reduceMotion.matches) {
  let phraseIndex = 0;

  window.setInterval(() => {
    rotatingPhrase.classList.add('is-changing');

    window.setTimeout(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      rotatingPhrase.textContent = phrases[phraseIndex];
      rotatingPhrase.classList.remove('is-changing');
    }, 380);
  }, 4800);
}
