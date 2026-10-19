'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SplitFlapText } from './SplitFlapText';
import './IntroAnimation.css';

const SESSION_STORAGE_KEY = 'portfolio_intro_seen';

/**
 * Check if intro should be skipped based on session storage and dev query parameters.
 */
const shouldSkipIntro = (forceProp) => {
  if (typeof window === 'undefined') return true;

  // Always show if forced via prop
  if (forceProp === true) return false;

  // Always show if URL contains ?intro=true or ?forceIntro=true
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('intro') === 'true' || urlParams.get('forceIntro') === 'true') {
      return false;
    }
  } catch (e) {
    // Ignore URL parsing errors in non-standard environments
  }

  // Check session storage
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
  } catch (e) {
    return false;
  }
};

/**
 * Mark intro as seen in sessionStorage
 */
const markIntroSeen = () => {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
  } catch (e) {
    // Handle disabled storage or private mode
  }
};

/**
 * IntroAnimation — Crystal Black & White Portfolio Opening Sequence
 * 
 * Features:
 * - Mechanical vertical flip departure board for "NITIN VR"
 * - Deep crystal black background (#000000) with subtle polished reflections
 * - Subtitle gentle fade-in: "DEVELOPER · CREATOR · ENGINEER"
 * - Smooth fade-out reveal of the existing personal portfolio website
 * - Respects prefers-reduced-motion and session storage
 */
export const IntroAnimation = ({
  name = 'NITIN VR',
  subtitle = 'DEVELOPER · CREATOR · ENGINEER',
  force = false,
  flipDuration = 0.12,
  stagger = 0.08,
  charset = 'alphanumeric',
  flipsPerChar = 8,
  tileColor = '#080808',
  textColor = '#FFFFFF',
  glare = 0.12,
  depth = 0.7,
  tileRadius = 5,
  gap = 6,
  fontSize = 56,
  padTo = 8,
  holdDuration = 1200,
  onComplete,
  className = '',
  style = {}
}) => {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const transitionTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const safetyTimerRef = useRef(null);

  // Client hydration & session check
  useEffect(() => {
    setMounted(true);
    const skip = shouldSkipIntro(force);
    if (skip) {
      setIsCompleted(true);
      if (typeof onComplete === 'function') onComplete();
    } else {
      setShouldRender(true);
    }
  }, [force, onComplete]);

  // Clean transition out
  const handleTransitionOut = useCallback(() => {
    if (isFading || isCompleted) return;
    setIsFading(true);
    markIntroSeen();

    // Fade-out transition duration matches CSS (750ms)
    finishTimerRef.current = setTimeout(() => {
      setIsCompleted(true);
      setShouldRender(false);
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 780);
  }, [isFading, isCompleted, onComplete]);

  // Called when SplitFlapText finishes flipping
  const handleFlipComplete = useCallback(() => {
    // Show subtitle after name flip finishes
    setShowSubtitle(true);

    // Brief hold before fading out into the homepage
    transitionTimerRef.current = setTimeout(() => {
      handleTransitionOut();
    }, holdDuration);
  }, [holdDuration, handleTransitionOut]);

  // Fallback safety timer: guarantees the portfolio always opens even on slow devices
  useEffect(() => {
    if (!shouldRender || isCompleted) return;

    // Total estimated duration: (8 chars * stagger 0.08s) + (8 flips * 0.12s) + hold 1.2s + fade 0.8s ~ 3.5s
    const maxSafetyTime = 5000;
    safetyTimerRef.current = setTimeout(() => {
      handleTransitionOut();
    }, maxSafetyTime);

    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [shouldRender, isCompleted, handleTransitionOut]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, []);

  // Allow clicking anywhere to skip immediately during dev/inspection
  const handleOverlayClick = useCallback(() => {
    handleTransitionOut();
  }, [handleTransitionOut]);

  if (!mounted || !shouldRender || isCompleted) {
    return null;
  }

  return (
    <aside
      className={`portfolio-intro ${isFading ? 'portfolio-intro--fading' : ''} ${className}`}
      style={style}
      role="region"
      aria-label="Portfolio Introduction"
      aria-hidden={isFading}
      onClick={handleOverlayClick}
    >
      {/* Subtle Polished Glass Reflection */}
      <div className="portfolio-intro__reflection" aria-hidden="true" />

      {/* Main Content Stage */}
      <div className="portfolio-intro__content">
        <div className="portfolio-intro__splitflap-wrap">
          <SplitFlapText
            text={name}
            flipDuration={flipDuration}
            stagger={stagger}
            charset={charset}
            flipsPerChar={flipsPerChar}
            order="left"
            align="center"
            tileStyle="board"
            tileColor={tileColor}
            textColor={textColor}
            glare={glare}
            depth={depth}
            tileRadius={tileRadius}
            gap={gap}
            fontSize={fontSize}
            intro={true}
            loop={false}
            padTo={padTo}
            onComplete={handleFlipComplete}
          />
        </div>

        {/* Gentle Subtitle Fade-in */}
        {subtitle && (
          <p
            className={`portfolio-intro__subtitle ${
              showSubtitle ? 'portfolio-intro__subtitle--visible' : ''
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Discreet click to skip indicator */}
      <div className="portfolio-intro__hint" aria-hidden="true">
        Click to skip
      </div>
    </aside>
  );
};

export default IntroAnimation;
