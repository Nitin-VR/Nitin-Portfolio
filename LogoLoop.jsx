'use client';

import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  SiPython,
  SiJavascript,
  SiHtml5,
  SiCss3,
  SiGit,
  SiGithub,
  SiLangchain,
  SiCplusplus,
  SiTensorflow,
  SiScikitlearn,
  SiPandas,
  SiNumpy,
  SiStreamlit,
  SiHuggingface
} from 'react-icons/si';
import './LogoLoop.css';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Matplotlib SVG Icon Component
 */
export const MatplotlibIcon = ({ size = '1em', ...props }) => (
  <svg
    role="img"
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="currentColor"
    {...props}
  >
    <title>Matplotlib</title>
    <path d="M63.975 125.09c-16.317 0-31.658-6.355-43.197-17.893S2.885 80.318 2.885 64 9.24 32.341 20.778 20.803 47.657 2.91 63.975 2.91s31.659 6.355 43.198 17.893S125.065 47.682 125.065 64s-6.355 31.659-17.893 43.198-26.879 17.892-43.197 17.892z" />
  </svg>
);

/**
 * Unsloth SVG Icon Component
 */
export const UnslothIcon = ({ size = '1em', ...props }) => (
  <svg
    role="img"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="currentColor"
    {...props}
  >
    <title>Unsloth</title>
    <path d="m17.404 16.57-.044.046a.15.15 0 0 1-.074.042 9.6 9.6 0 0 0-1.756.62.13.13 0 0 1-.074.012l-.081-.01c-.326-.201-.734-.336-1.189-.356a.14.14 0 0 1-.071-.027 10 10 0 0 0-1.742-.716.15.15 0 0 1-.067-.047l-.045-.049a.14.14 0 0 1-.02-.069v-.063a9.8 9.8 0 0 0-.294-1.84.14.14 0 0 1 .006-.076l.015-.051a3.6 3.6 0 0 1 .918-1.574.15.15 0 0 1 .063-.042 9.8 9.8 0 0 0 1.748-.687.14.14 0 0 1 .074-.015l.081.01a4 4 0 0 1 1.201.353.14.14 0 0 1 .071.028 9.7 9.7 0 0 0 1.742.716.14.14 0 0 1 .066.046l.046.05a.14.14 0 0 1 .02.069v.063c-.027.632-.132 1.248-.3 1.838a.14.14 0 0 1-.005.076l-.016.051a3.5 3.5 0 0 1-.918 1.575.14.14 0 0 1-.064.042M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0" />
  </svg>
);

/**
 * 1. Default Core Technology Stack Logos (First Loop)
 */
export const TECH_LOGOS = [
  {
    title: 'Python',
    href: 'https://www.python.org/',
    hoverColor: '#3776AB',
    node: <SiPython aria-label="Python" />
  },
  {
    title: 'JavaScript',
    href: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    hoverColor: '#F7DF1E',
    node: <SiJavascript aria-label="JavaScript" />
  },
  {
    title: 'HTML5',
    href: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
    hoverColor: '#E34F26',
    node: <SiHtml5 aria-label="HTML5" />
  },
  {
    title: 'CSS3',
    href: 'https://developer.mozilla.org/en-US/docs/Web/CSS',
    hoverColor: '#1572B6',
    node: <SiCss3 aria-label="CSS3" />
  },
  {
    title: 'Git',
    href: 'https://git-scm.com/',
    hoverColor: '#F05032',
    node: <SiGit aria-label="Git" />
  },
  {
    title: 'GitHub',
    href: 'https://github.com/Nitin-VR',
    hoverColor: '#181717',
    node: <SiGithub aria-label="GitHub" />
  },
  {
    title: 'LangChain',
    href: 'https://www.langchain.com/',
    hoverColor: '#1C3C3C',
    node: <SiLangchain aria-label="LangChain" />
  },
  {
    title: 'C++',
    href: 'https://isocpp.org/',
    hoverColor: '#00599C',
    node: <SiCplusplus aria-label="C++" />
  }
];

/**
 * 2. AI/ML & Data Science Stack Logos (Second Loop)
 */
export const AIML_LOGOS = [
  {
    title: 'TensorFlow',
    href: 'https://www.tensorflow.org/',
    hoverColor: '#FF6F00',
    node: <SiTensorflow aria-label="TensorFlow" />
  },
  {
    title: 'scikit-learn',
    href: 'https://scikit-learn.org/',
    hoverColor: '#F7931E',
    node: <SiScikitlearn aria-label="scikit-learn" />
  },
  {
    title: 'pandas',
    href: 'https://pandas.pydata.org/',
    hoverColor: '#150458',
    node: <SiPandas aria-label="pandas" />
  },
  {
    title: 'NumPy',
    href: 'https://numpy.org/',
    hoverColor: '#4DABCF',
    node: <SiNumpy aria-label="NumPy" />
  },
  {
    title: 'Matplotlib',
    href: 'https://matplotlib.org/',
    hoverColor: '#11557C',
    node: <MatplotlibIcon aria-label="Matplotlib" />
  },
  {
    title: 'Streamlit',
    href: 'https://streamlit.io/',
    hoverColor: '#FF4B4B',
    node: <SiStreamlit aria-label="Streamlit" />
  },
  {
    title: 'Hugging Face',
    href: 'https://huggingface.co/',
    hoverColor: '#FFD21E',
    node: <SiHuggingface aria-label="Hugging Face" />
  },
  {
    title: 'Unsloth',
    href: 'https://unsloth.ai/',
    hoverColor: '#FF6600',
    node: <UnslothIcon aria-label="Unsloth" />
  }
];

const SMOOTH_TAU = 0.25;
const GLIDE_TAU = 0.8;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createEngine = (root, track, config, setLayout) => {
  const query =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

  const st = {
    offset: config.current.initialOffset || 0,
    velocity: 0,
    period: 0,
    length: 0,
    box: [0, 0],
    items: [],
    snaps: [],
    pitch: 0,
    crossMax: 0,
    sizeMax: 0,
    tipMax: 0,
    geo: null,
    layout: { copies: 2, primary: 0 },
    hovered: false,
    focused: false,
    drag: null,
    glide: false,
    startTime: performance.now(),
    visible: typeof IntersectionObserver === 'undefined',
    raf: 0,
    last: 0,
    reduced: !!query?.matches,
    destroyed: false
  };

  const collect = () => {
    const items = [];
    Array.from(track.children).forEach((list, copy) => {
      Array.from(list.children).forEach((el, index) => {
        items.push({
          el,
          copy,
          index,
          content: el.children[0] || null,
          tip: el.children[1] || null,
          center: 0,
          size: 0,
          cross: 0
        });
      });
    });
    st.items = items;
  };

  const geometry = () => {
    const cfg = config.current;
    const L = st.length;
    const P = st.period;
    const hc = st.crossMax;
    const w = st.sizeMax;
    const geo = {
      mode: cfg.layout,
      shift: 0,
      uMin: -L / 2 - w,
      uMax: L / 2 + w,
      lead: 0
    };
    let pad = cfg.scaleOnHover ? hc * 0.1 : 0;
    const extra = cfg.links ? 2 : 0;
    geo.lead = (Math.max(0, Math.ceil((-geo.uMin - L / 2) / P)) + extra) * P;
    const copies = Math.max(2, Math.ceil((geo.uMax + L / 2 + geo.lead) / P) + 2 + (extra ? 1 : 0));
    const primary = Math.min(copies - 1, Math.floor((geo.lead + L / 2) / P));
    st.geo = geo;
    root.style.setProperty('--logoloop-pad', `${Math.ceil(pad)}px`);
    if (copies !== st.layout.copies || primary !== st.layout.primary) {
      st.layout = { copies, primary };
      setLayout(st.layout);
    }
  };

  const measure = () => {
    const cfg = config.current;
    const lists = track.children;
    if (!lists.length || !st.items.length) {
      st.period = 0;
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const k = root.offsetWidth ? rootRect.width / root.offsetWidth || 1 : 1;
    const trackRect = track.getBoundingClientRect();
    const origin = cfg.vertical ? trackRect.top : trackRect.left;
    let crossMax = 0;
    let sizeMax = 0;
    for (const it of st.items) {
      const r = it.el.getBoundingClientRect();
      it.center = ((cfg.vertical ? r.top + r.height / 2 : r.left + r.width / 2) - origin) / k;
      it.size = (cfg.vertical ? r.height : r.width) / k;
      it.cross = (cfg.vertical ? r.width : r.height) / k;
      crossMax = Math.max(crossMax, it.cross);
      sizeMax = Math.max(sizeMax, it.size);
    }
    const a = lists[0].getBoundingClientRect();
    const b = lists[1] ? lists[1].getBoundingClientRect() : null;
    st.period = (b ? (cfg.vertical ? b.top - a.top : b.left - a.left) : cfg.vertical ? a.height : a.width) / k;
    const cs = getComputedStyle(root);
    st.box = [root.offsetWidth, root.offsetHeight];
    st.length = cfg.vertical
      ? root.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      : root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    st.crossMax = crossMax;
    st.sizeMax = sizeMax;
    if (st.period <= 0) return;
    geometry();
  };

  const render = () => {
    const cfg = config.current;
    const geo = st.geo;
    if (!geo) return;
    const T = -st.offset - geo.lead;
    const lineT = cfg.vertical
      ? `translate3d(0px, ${T.toFixed(2)}px, 0px)`
      : `translate3d(${T.toFixed(2)}px, 0px, 0px)`;
    track.style.transform = lineT;
  };

  const frame = now => {
    st.raf = 0;
    if (st.destroyed || !st.geo || st.period <= 0) return;
    const cfg = config.current;
    const dt = st.last ? clamp((now - st.last) / 1000, 0, 0.1) : 0;
    st.last = now;
    const P = st.period;

    // Honor startDelay before starting movement
    const elapsed = (now - st.startTime) / 1000;
    if (elapsed < (cfg.startDelay || 0)) {
      render();
      st.raf = requestAnimationFrame(frame);
      return;
    }

    let busy = false;
    const travel = Math.sign(cfg.speed) || 1;
    const paused = st.focused || (st.hovered && cfg.hoverValue !== undefined);
    const pausedSpeed = st.focused ? 0 : (cfg.hoverValue ?? 0);
    const target = st.reduced ? 0 : paused ? pausedSpeed * travel * cfg.dirSign : cfg.speed * cfg.dirSign;

    const tau = st.glide ? GLIDE_TAU : SMOOTH_TAU;
    st.velocity += (target - st.velocity) * (1 - Math.exp(-dt / tau));
    if (st.glide && Math.abs(st.velocity - target) < 2) st.glide = false;
    if (Math.abs(st.velocity - target) < 0.01) st.velocity = target;
    st.offset += st.velocity * dt;
    if (st.velocity !== 0 || target !== 0) busy = true;

    if (!st.focused) {
      const wrapped = ((st.offset % P) + P) % P;
      st.offset = wrapped;
    }

    render();
    if (busy && st.visible && !st.destroyed) st.raf = requestAnimationFrame(frame);
  };

  const wake = () => {
    if (st.raf || st.destroyed || !st.visible) return;
    st.last = 0;
    st.raf = requestAnimationFrame(frame);
  };

  root.addEventListener('mouseenter', () => { st.hovered = true; wake(); });
  root.addEventListener('mouseleave', () => { st.hovered = false; wake(); });

  const refresh = () => {
    collect();
    measure();
    st.last = 0;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
    if (st.geo && st.period > 0) frame(performance.now());
  };

  window.addEventListener('resize', refresh);

  const destroy = () => {
    st.destroyed = true;
    if (st.raf) cancelAnimationFrame(st.raf);
    window.removeEventListener('resize', refresh);
  };

  return { refresh, wake, destroy, state: st };
};

export const LogoLoop = memo(
  ({
    logos = TECH_LOGOS,
    speed = 50,
    direction = 'left',
    startDelay = 0,
    initialOffset = 0,
    width = '100%',
    logoHeight = 30,
    gap = 36,
    pauseOnHover = true,
    hoverSpeed = 0,
    scaleOnHover = true,
    layout = 'line',
    labels = 'inline',
    ariaLabel = 'Technology stack',
    className = '',
    style
  }) => {
    const rootRef = useRef(null);
    const trackRef = useRef(null);
    const engineRef = useRef(null);
    const [{ copies, primary }, setLayout] = useState({ copies: 3, primary: 1 });

    const vertical = direction === 'up' || direction === 'down';
    const config = useRef(null);
    config.current = {
      speed,
      startDelay,
      initialOffset,
      dirSign: (vertical ? direction === 'up' : direction !== 'right') ? 1 : -1,
      hoverValue: hoverSpeed !== undefined ? hoverSpeed : pauseOnHover ? 0 : undefined,
      vertical,
      layout,
      scaleOnHover,
      labels,
      links: logos.some(item => item.href)
    };

    useIsomorphicLayoutEffect(() => {
      const engine = createEngine(rootRef.current, trackRef.current, config, setLayout);
      engineRef.current = engine;
      return () => {
        engine.destroy();
        engineRef.current = null;
      };
    }, []);

    useIsomorphicLayoutEffect(() => {
      engineRef.current?.refresh();
    }, [copies, primary, logos, vertical, logoHeight, gap, labels, scaleOnHover]);

    useEffect(() => {
      engineRef.current?.wake();
    });

    const lists = useMemo(
      () =>
        Array.from({ length: copies }, (_, copyIndex) => {
          const isPrimary = copyIndex === primary;
          return (
            <ul
              className="logoloop__list"
              key={copyIndex}
              role="list"
              aria-hidden={isPrimary ? undefined : true}
            >
              {logos.map((item, itemIndex) => {
                const key = `${copyIndex}-${itemIndex}`;
                const visual = (
                  <span className="logoloop__node" aria-hidden="true">
                    {item.node}
                  </span>
                );

                const text = (labels === 'inline' || labels === 'below') && item.title ? item.title : null;
                const inner = (
                  <>
                    {visual}
                    {text && <span className="logoloop__label">{text}</span>}
                  </>
                );

                return (
                  <li
                    className="logoloop__item"
                    key={key}
                    role="listitem"
                    data-tech={item.title?.toLowerCase().replace(/[^a-z0-9]/g, '')}
                    data-color={item.hoverColor ? '' : undefined}
                    style={{
                      '--logoloop-item-color': item.hoverColor
                    }}
                  >
                    {item.href ? (
                      <a
                        className="logoloop__content"
                        href={item.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={item.title}
                        tabIndex={isPrimary ? undefined : -1}
                      >
                        {inner}
                      </a>
                    ) : (
                      <div className="logoloop__content">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          );
        }),
      [copies, primary, logos, labels]
    );

    return (
      <div
        ref={rootRef}
        className={`logoloop logoloop--horizontal ${scaleOnHover ? 'logoloop--scale-hover' : ''} ${className}`.trim()}
        role="region"
        aria-label={ariaLabel}
        style={{
          width,
          '--logoloop-gap': `${gap}px`,
          '--logoloop-logoHeight': `${logoHeight}px`,
          ...style
        }}
      >
        <div ref={trackRef} className="logoloop__track">
          {lists}
        </div>
      </div>
    );
  }
);

/**
 * 3. Preconfigured AI/ML & Data Science LogoLoop (Second Loop)
 */
export const AIMLLogoLoop = memo((props) => (
  <LogoLoop
    logos={AIML_LOGOS}
    speed={42}
    direction="right"
    startDelay={1.2}
    initialOffset={140}
    ariaLabel="AI, ML & Data Science Stack"
    {...props}
  />
));

/**
 * 4. Dual Stack LogoLoop Component (Core Tech + AI/ML Stack Desynchronized)
 */
export const DualLogoLoop = memo(({ className = '', style, ...props }) => (
  <div className={`dualloop-wrapper ${className}`.trim()} style={style}>
    <LogoLoop
      logos={TECH_LOGOS}
      speed={48}
      direction="left"
      startDelay={0}
      initialOffset={0}
      ariaLabel="Core Technology Stack"
      {...props}
    />
    <LogoLoop
      logos={AIML_LOGOS}
      speed={42}
      direction="right"
      startDelay={1.2}
      initialOffset={140}
      ariaLabel="AI, ML & Data Science Stack"
      style={{ marginTop: '16px' }}
      {...props}
    />
  </div>
));

export default LogoLoop;
