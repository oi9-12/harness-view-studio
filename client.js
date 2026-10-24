/**
 * View Studio — browser half.
 *
 * Registers a sidebar panel icon and the matching main panel (the sidebar owns
 * the button and dispatches the `main` key that equals the list id), then
 * applies the chosen appearance to the whole page through:
 *
 *   - a package-owned stylesheet (background layer, control styling),
 *   - CSS custom properties on <html> (image, blur, brightness, dim, scale),
 *   - `ctx.theme.overrideTokens` (accent color, surface transparency).
 *
 * Every resource is registered in `apply` and removed by its disposer.
 *
 * This file is a classic script: no import/export. `id` must equal the
 * package name so the module loader can address the factory.
 */
(function () {
  const MODULE_ID = 'dsh-view-studio';
  const STORAGE_KEY = 'dsh.view-studio.v1';
  /** Raw files above this are refused before any decoding happens. */
  const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
  /** Video files live in IndexedDB, which tolerates much larger payloads. */
  const MAX_VIDEO_BYTES = 120 * 1024 * 1024;
  /** Longest edge kept after downscaling; keeps the stored preference small. */
  const MAX_EDGE = 2000;

  const DEFAULTS = Object.freeze({
    bg: '',
    brightness: 100,
    blur: 0,
    dim: 0,
    glass: 60,
    accent: '',
    saturate: 100,
    fit: 'cover',
    pos: 'center',
    video: 'none',
    videoUrl: '',
  });

  const PRESETS = {
    default: '',
    dusk: 'linear-gradient(155deg, #0a1020 0%, #16244a 48%, #2a1b45 100%)',
    aurora:
      'radial-gradient(120% 120% at 15% 8%, #06251f 0%, #0b3a33 38%, #10324d 72%, #071726 100%)',
    sakura: 'linear-gradient(150deg, #1a1020 0%, #3a1f33 45%, #5b2f47 100%)',
    paper: 'linear-gradient(150deg, #f6f2ea 0%, #e9e1d3 55%, #dcd2c0 100%)',
  };

  const EN = {
    nav: 'View Studio',
    title: 'View Studio',
    subtitle:
      'Tune the backdrop of the whole interface. Changes apply live and stay in this browser.',
    preview: 'Preview',
    liveOn: 'Live on the interface',
    liveFallback: 'Fallback layer',
    bgTitle: 'Background',
    bgFromUrl: 'Image address',
    bgUrlPlaceholder: 'https://… or any image URL',
    apply: 'Apply',
    pickFile: 'Choose a local image',
    clearBg: 'Clear background',
    current: 'Current',
    image: 'Image',
    gradient: 'Gradient',
    none: 'None',
    presets: 'Presets',
    presetDefault: 'Default',
    presetDusk: 'Dusk',
    presetAurora: 'Aurora',
    presetSakura: 'Sakura',
    presetPaper: 'Paper',
    fitTitle: 'Fit',
    fitCover: 'Fill',
    fitContain: 'Whole image',
    posTitle: 'Align',
    posCenter: 'Center',
    posTop: 'Top',
    posBottom: 'Bottom',
    pasteHint: 'Tip: press Ctrl+V to paste an image from the clipboard.',
    videoHint:
      'Video wallpaper plays muted and loops. MP4 / WebM up to 120 MB, kept on this device.',
    pickVideo: 'Choose a local video',
    clearVideo: 'Clear video',
    videoUrlPlaceholder: 'https://… .mp4 or .webm',
    videoStored: 'Stored locally',
    notVideo: 'That file is not a video.',
    videoTooLarge: 'That video is too large (120 MB max).',
    processingVideo: 'Storing the video…',
    appliedVideo: 'Video applied',
    saturate: 'Saturation',
    saturateHint: 'Pushes the backdrop towards grey (0%) or richer color (200%).',
    effectTitle: 'Backdrop effects',
    blur: 'Blur',
    blurHint: 'Softens the backdrop; text stays sharp.',
    brightness: 'Brightness',
    brightnessHint: 'Brightens or darkens the backdrop so text stays readable.',
    dim: 'Dim',
    dimHint: 'Adds a dark scrim; 20%–40% works well with bright images.',
    colorTitle: 'Colors',
    accent: 'Accent',
    accentHint:
      'Colors buttons, links and selections; slightly adjusted for the dark theme.',
    followTheme: 'Theme default',
    glassTitle: 'Surfaces',
    glass: 'Interface transparency',
    glassHint:
      'Strength of the single veil over the wallpaper: 0% hides it, 100% shows it fully.',
    resetAll: 'Reset everything',
    autosave: 'Changes are saved on this device.',
    surfaces: 'Unified blocks',
    tooLarge: 'That file is too large (40 MB max).',
    notImage: 'That file is not an image.',
    readFailed: 'Could not read that image, please try again.',
    processing: 'Processing the image…',
    appliedImage: 'Applied',
  };

  const ZH = {
    nav: '视图工作室',
    title: '视图工作室',
    subtitle: '调整整个界面的背景外观。改动实时生效，并保存在本机浏览器。',
    preview: '预览',
    liveOn: '已应用到界面',
    liveFallback: '回退层（未找到外壳）',
    bgTitle: '背景',
    bgFromUrl: '图片地址',
    bgUrlPlaceholder: 'https://… 或任意图片链接',
    apply: '应用',
    pickFile: '选择本地图片',
    clearBg: '清除背景',
    current: '当前',
    image: '图片',
    gradient: '渐变',
    none: '无',
    presets: '预设',
    presetDefault: '默认',
    presetDusk: '夜幕',
    presetAurora: '极光',
    presetSakura: '樱夜',
    presetPaper: '宣纸',
    fitTitle: '填充',
    fitCover: '铺满',
    fitContain: '完整显示',
    posTitle: '对齐',
    posCenter: '居中',
    posTop: '顶部',
    posBottom: '底部',
    pasteHint: '提示：按 Ctrl+V 可直接粘贴剪贴板里的图片。',
    videoHint: '视频壁纸会静音循环播放。MP4 / WebM，最大 120 MB，保存在本机。',
    pickVideo: '选择本地视频',
    clearVideo: '清除视频',
    videoUrlPlaceholder: 'https://… .mp4 或 .webm',
    videoStored: '已存本机',
    notVideo: '这不是视频文件。',
    videoTooLarge: '视频太大（上限 120 MB）。',
    processingVideo: '正在保存视频…',
    appliedVideo: '视频已应用',
    saturate: '饱和度',
    saturateHint: '0% 接近灰白，100% 原色，200% 更浓。',
    effectTitle: '背景效果',
    blur: '模糊',
    blurHint: '让背景更柔和，文字保持清晰。',
    brightness: '亮度',
    brightnessHint: '调整背景明暗，保证浅色图片上的文字也看得清。',
    dim: '暗化',
    dimHint: '在背景上叠一层深色遮罩；图片很亮时推荐 20%–40%。',
    colorTitle: '配色',
    accent: '强调色',
    accentHint: '用于按钮、链接与选中态；深色主题下会自动微调。',
    followTheme: '跟随主题',
    glassTitle: '界面质感',
    glass: '界面透明度',
    glassHint: '壁纸上方那层统一遮罩的浓度：0% 完全遮住壁纸，100% 完全透出。',
    resetAll: '全部重置',
    autosave: '更改会自动保存在本机。',
    surfaces: '已统一块数',
    tooLarge: '文件太大（上限 40 MB）。',
    notImage: '这不是图片文件。',
    readFailed: '读取图片失败，请重试。',
    processing: '正在处理图片…',
    appliedImage: '已应用',
  };

  const CSS_TEXT = `
/* The shell frame paints an opaque background of its own, so the wallpaper
   lives on the frame: its ::before sits above the frame background and below
   the in-flow columns, which is exactly the layer a wallpaper belongs in. */
[data-dsvs-frame] {
  position: relative;
  isolation: isolate;
  background-color: transparent !important;
}
/* The titlebar strip is the frame's padding area: without a fill it shows the
   bare wallpaper and reads as a brighter band. When the marked element is the
   shell's own frame that strip already has a ::before, so only its fill is
   replaced; when the marked element is an outer wrapper the strip is its
   padding area and this rule owns the box as well. Either way the fill is
   rebuilt from the two surfaces below it — sidebar fill on the left, base
   surface on the right, split at the measured sidebar width. */
[data-dsvs-frame="own"]::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: var(--dsh-vs-titlebar-h, 0px);
  z-index: -1;
  pointer-events: none;
}
/* The shell's own frame, when the wallpaper sits on an outer wrapper: its
   opaque background would hide the wrapper's strip fill, and its own titlebar
   pseudo would paint the sidebar tint across the whole strip. Neutralise both
   and take the fill over. */
[data-dsvs-shell] {
  background-color: transparent !important;
}
[data-dsvs-frame="own"]::before,
[data-dsvs-frame="shell"]::before,
[data-dsvs-shell]::before {
  background:
    linear-gradient(
      90deg,
      var(--dsw-specific-sidebar-fill) 0,
      var(--dsw-specific-sidebar-fill) var(--dsh-vs-sidebar-w, 0px),
      var(--dsw-alias-bg-base) var(--dsh-vs-sidebar-w, 0px),
      var(--dsw-alias-bg-base) 100%
    ) !important;
}
[data-dsvs-frame]::after {
  content: "";
  position: absolute;
  /* Grow past the frame just enough for the blurred edge's transparent feather
     to fall outside the window; the image itself is never scaled. */
  inset: calc(-2px - var(--dsh-vs-blur, 0px) * 1.2);
  z-index: -2;
  pointer-events: none;
  background-image:
    linear-gradient(var(--dsh-vs-veil, rgba(0, 0, 0, 0)), var(--dsh-vs-veil, rgba(0, 0, 0, 0))),
    linear-gradient(rgba(6, 8, 12, var(--dsh-vs-dim, 0)), rgba(6, 8, 12, var(--dsh-vs-dim, 0))),
    var(--dsh-vs-image, none);
  background-position: center, center, var(--dsh-vs-pos, center);
  background-size: cover, cover, var(--dsh-vs-fit, cover);
  background-repeat: no-repeat, no-repeat, no-repeat;
  filter: brightness(var(--dsh-vs-brightness, 1)) saturate(var(--dsh-vs-saturate, 1))
    blur(var(--dsh-vs-blur, 0px));
  will-change: filter;
}

/* Video wallpaper: CSS backgrounds cannot play video, so this is a real
   <video> element placed in the same layer, with the same geometry and
   filters as the image layer. */
[data-dsvs-video] {
  position: absolute;
  inset: calc(-2px - var(--dsh-vs-blur, 0px) * 1.2);
  z-index: -2;
  width: auto;
  height: auto;
  object-fit: var(--dsh-vs-fit, cover);
  object-position: var(--dsh-vs-pos, center);
  pointer-events: none;
  background: #000;
  filter: brightness(var(--dsh-vs-brightness, 1)) saturate(var(--dsh-vs-saturate, 1))
    blur(var(--dsh-vs-blur, 0px));
}

/* Fallback for pages without a recognisable frame element. */
html.dsh-vs-active body {
  background: transparent !important;
}
html.dsh-vs-active body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    linear-gradient(var(--dsh-vs-veil, rgba(0, 0, 0, 0)), var(--dsh-vs-veil, rgba(0, 0, 0, 0))),
    linear-gradient(rgba(6, 8, 12, var(--dsh-vs-dim, 0)), rgba(6, 8, 12, var(--dsh-vs-dim, 0))),
    var(--dsh-vs-image, none);
  background-position: center, center, var(--dsh-vs-pos, center);
  background-size: cover, cover, var(--dsh-vs-fit, cover);
  background-repeat: no-repeat, no-repeat, no-repeat;
  filter: brightness(var(--dsh-vs-brightness, 1)) saturate(var(--dsh-vs-saturate, 1))
    blur(var(--dsh-vs-blur, 0px));
}

.dsh-vs-root {
  box-sizing: border-box;
  height: 100%;
  min-height: 100%;
  overflow: auto;
  padding: 28px 32px 56px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.5;
}
.dsh-vs-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 780px;
  margin: 0 auto;
}
.dsh-vs-header h1 {
  margin: 0 0 4px;
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
}
.dsh-vs-header p {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-vs-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsh-vs-card, var(--dsw-alias-bg-layer-1));
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}
.dsh-vs-card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}
.dsh-vs-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dsh-vs-field-head {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
}
.dsh-vs-label {
  font-size: 13px;
}
.dsh-vs-value {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.dsh-vs-hint {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-vs-range {
  width: 100%;
  height: 20px;
  margin: 0;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dsh-vs-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.dsh-vs-input {
  flex: 1 1 220px;
  min-width: 0;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  outline: none;
  background: var(--dsh-vs-card, var(--dsw-alias-bg-layer-2));
  color: inherit;
  font: inherit;
}
.dsh-vs-input:focus {
  border-color: var(--dsw-alias-brand-primary);
}
.dsh-vs-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsh-vs-card, var(--dsw-alias-bg-layer-2));
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.dsh-vs-btn-file {
  position: relative;
  overflow: hidden;
}
.dsh-vs-file {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.dsh-vs-status {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-state-success-primary);
}
.dsh-vs-btn:hover {
  background: var(--dsh-vs-card, var(--dsw-alias-bg-layer-1));
  border-color: var(--dsw-alias-border-l2);
}
.dsh-vs-btn-primary {
  border-color: transparent;
  background: var(--dsw-alias-brand-primary);
  color: #fff;
}
.dsh-vs-btn-primary:hover {
  background: var(--dsw-alias-brand-primary);
  filter: brightness(1.06);
  border-color: transparent;
}
.dsh-vs-chip {
  height: 26px;
  padding: 0 11px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dsh-vs-chip:hover {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-border-l2);
}
.dsh-vs-chip[data-active="true"] {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
}
.dsh-vs-color {
  width: 44px;
  height: 30px;
  padding: 2px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsh-vs-card, var(--dsw-alias-bg-layer-2));
  cursor: pointer;
}
.dsh-vs-preview {
  position: relative;
  height: 120px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  overflow: hidden;
  background: var(--dsh-vs-card, var(--dsw-alias-bg-layer-2));
  isolation: isolate;
}
.dsh-vs-preview-bg {
  position: absolute;
  inset: -16px;
  background-position: center;
  background-size: cover;
}
.dsh-vs-preview-dim {
  position: absolute;
  inset: 0;
  background: rgba(6, 8, 12, var(--dsh-vs-dim, 0));
}
.dsh-vs-preview-tag {
  position: absolute;
  left: 12px;
  bottom: 9px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.86);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}
.dsh-vs-footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 2px 2px 0;
}
.dsh-vs-notice {
  font-size: 12px;
  color: var(--dsw-alias-state-warn-primary);
}
`;

  function clampNumber(value, fallback, min, max) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  function normalize(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      bg: typeof source.bg === 'string' ? source.bg : DEFAULTS.bg,
      brightness: Math.round(clampNumber(source.brightness, DEFAULTS.brightness, 40, 160)),
      blur: Math.round(clampNumber(source.blur, DEFAULTS.blur, 0, 40)),
      dim: Math.round(clampNumber(source.dim, DEFAULTS.dim, 0, 70)),
      glass: Math.round(clampNumber(source.glass, DEFAULTS.glass, 0, 100)),
      accent: typeof source.accent === 'string' ? source.accent : DEFAULTS.accent,
      saturate: Math.round(clampNumber(source.saturate, DEFAULTS.saturate, 0, 200)),
      fit: source.fit === 'contain' ? 'contain' : 'cover',
      pos:
        source.pos === 'top' || source.pos === 'bottom' ? source.pos : 'center',
      video:
        source.video === 'stored' || source.video === 'url' ? source.video : 'none',
      videoUrl: typeof source.videoUrl === 'string' ? source.videoUrl : '',
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return normalize(DEFAULTS);
      return normalize(JSON.parse(raw));
    } catch (error) {
      return normalize(DEFAULTS);
    }
  }

  /** Assigned by the factory below; the components only render after `apply`. */
  let React = null;

  let state = loadState();
  let lang = 'en';
  let themeLayerDispose = null;
  let applyHook = null;
  let frameEl = null;
  let frameAttached = false;
  let frameMode = '';
  let titlebarHeight = 0;
  let sidebarWidthPx = 0;
  let saveTimer = null;
  let videoEl = null;
  let videoObjectUrl = null;
  let videoLoadedFor = '';
  const listeners = new Set();

  function notify() {
    listeners.forEach(function (fn) {
      try {
        fn();
      } catch (error) {
        console.error('[view-studio] listener failed', error);
      }
    });
  }

  function tr(key) {
    const dict = String(lang).indexOf('zh') === 0 ? ZH : EN;
    return dict[key] != null ? dict[key] : key;
  }

  function getState() {
    return state;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return function () {
      listeners.delete(fn);
    };
  }

  function persistSoon() {
    if (saveTimer != null) return;
    saveTimer = window.setTimeout(function () {
      saveTimer = null;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        /* quota or privacy mode: keep the live state only */
      }
    }, 200);
  }

  function setState(patch) {
    state = normalize(Object.assign({}, state, patch));
    persistSoon();
    notify();
    if (applyHook) applyHook();
  }

  function mixWithWhite(color, ratio) {
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color));
    if (!match) return color;
    let hex = match[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map(function (ch) {
          return ch + ch;
        })
        .join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lift = function (v) {
      return Math.round(v + (255 - v) * ratio);
    };
    return 'rgb(' + lift(r) + ', ' + lift(g) + ', ' + lift(b) + ')';
  }

  function buildTokens() {
    const tokens = {};
    if (state.accent) {
      tokens['--dsw-alias-brand-primary'] = {
        light: state.accent,
        dark: mixWithWhite(state.accent, 0.28),
      };
    }
    if (state.bg || videoKey()) {
      // Every chrome box carries its own base fill (sidebar, centre column,
      // titlebar, cards, composer). Different fills can never line up at their
      // seams, so with a wallpaper active they all become transparent and one
      // uniform veil is painted over the wallpaper instead.
      tokens['--dsw-alias-bg-base'] = { light: 'transparent', dark: 'transparent' };
      tokens['--dsw-alias-bg-layer-1'] = {
        light: 'transparent',
        dark: 'transparent',
      };
      tokens['--dsw-alias-bg-layer-2'] = {
        light: 'transparent',
        dark: 'transparent',
      };
      tokens['--dsw-specific-sidebar-fill'] = {
        light: 'transparent',
        dark: 'transparent',
      };
      const alpha = Math.round((1 - state.glass / 100) * 100) / 100;
      tokens['--dsh-vs-veil'] = {
        light: 'rgba(250, 250, 252, ' + alpha + ')',
        dark: 'rgba(20, 22, 26, ' + alpha + ')',
      };
      // The studio's own controls stay legible on top of the moving backdrop.
      tokens['--dsh-vs-card'] = {
        light: 'rgba(250, 250, 252, 0.74)',
        dark: 'rgba(18, 20, 24, 0.58)',
      };
    }
    return tokens;
  }

  function videoKey() {
    if (state.video === 'stored') return 'stored';
    if (state.video === 'url' && state.videoUrl) return 'url:' + state.videoUrl;
    return '';
  }

  /**
   * Video wallpapers are blobs far beyond the localStorage quota, so the file
   * body lives in IndexedDB and only the mode is kept in the preference.
   */
  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('indexedDB unavailable'));
        return;
      }
      const request = window.indexedDB.open('dsh-view-studio', 1);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function idbPut(key, value) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(value, key);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function idbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('files', 'readonly');
        const request = tx.objectStore('files').get(key);
        request.onsuccess = function () {
          resolve(request.result);
        };
        request.onerror = function () {
          reject(request.error);
        };
      });
    });
  }

  function idbDelete(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').delete(key);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function ensureVideoElement(frame) {
    if (!videoEl || !videoEl.isConnected) {
      videoEl = document.createElement('video');
      videoEl.setAttribute('data-dsvs-video', '');
      videoEl.setAttribute('aria-hidden', 'true');
      videoEl.loop = true;
      videoEl.muted = true;
      videoEl.autoplay = true;
      videoEl.setAttribute('playsinline', '');
      frame.insertBefore(videoEl, frame.firstChild);
    }
    return videoEl;
  }

  function detachVideo() {
    if (videoEl) {
      try {
        videoEl.pause();
      } catch (error) {
        /* already detached */
      }
      videoEl.remove();
      videoEl = null;
    }
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
      videoObjectUrl = null;
    }
    videoLoadedFor = '';
  }

  function syncVideo(frame) {
    const key = videoKey();
    if (!key || !frame) {
      detachVideo();
      return;
    }
    const element = ensureVideoElement(frame);
    if (videoLoadedFor === key) {
      if (element.paused) element.play().catch(function () {});
      return;
    }
    videoLoadedFor = key;
    if (state.video === 'stored') {
      idbGet('video')
        .then(function (blob) {
          if (!blob || videoLoadedFor !== key) return;
          if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
          videoObjectUrl = URL.createObjectURL(blob);
          element.src = videoObjectUrl;
          element.play().catch(function () {});
        })
        .catch(function (error) {
          console.error('[view-studio] stored video could not be read', error);
          videoLoadedFor = '';
        });
    } else {
      element.src = state.videoUrl;
      element.play().catch(function () {});
    }
  }

  /**
   * Locate the element that spans the whole window from y = 0: the window
   * chrome (titlebar strip) is that element's padding area, so a wallpaper
   * placed one level inside it can never cover the strip. Prefer the outermost
   * viewport-covering child of #root, then the shell's own frame element.
   */
  function findFrame() {
    if (frameEl && frameEl.isConnected) return frameEl;
    const root = document.getElementById('root');
    if (!root) return null;
    const viewportWidth = window.innerWidth || 0;
    const viewportHeight = window.innerHeight || 0;
    const coversViewport = function (element) {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      return rect.width >= viewportWidth * 0.6 && rect.height >= viewportHeight * 0.6;
    };
    const reachesTop = function (element) {
      return element && element.getBoundingClientRect().top <= 4;
    };

    const candidates = [];
    if (root.firstElementChild) candidates.push(root.firstElementChild);
    const frames = root.querySelectorAll('[class*="_frame"]');
    for (let index = 0; index < frames.length; index += 1) candidates.push(frames[index]);
    const nested = root.firstElementChild && root.firstElementChild.firstElementChild;
    if (nested) candidates.push(nested);

    for (let index = 0; index < candidates.length; index += 1) {
      if (coversViewport(candidates[index]) && reachesTop(candidates[index])) {
        frameEl = candidates[index];
        return frameEl;
      }
    }
    for (let index = 0; index < candidates.length; index += 1) {
      if (coversViewport(candidates[index])) {
        frameEl = candidates[index];
        return frameEl;
      }
    }
    frameEl = root.firstElementChild || null;
    return frameEl;
  }

  function isShellFrame(frame) {
    return /_(frame|Frame)/.test(String(frame.className || ''));
  }

  /** Publish the sidebar column width and the titlebar height so the strip fill
      can continue both columns with their own surfaces. */
  function measureFrame(frame) {
    const root = document.documentElement;
    const sidebar = frame && frame.querySelector('[class*="_sidebarCol"]');
    const sidebarWidth = sidebar ? Math.round(sidebar.getBoundingClientRect().width) : 0;
    root.style.setProperty('--dsh-vs-sidebar-w', sidebarWidth + 'px');

    const shell = isShellFrame(frame);
    const inner = frame && frame.querySelector('[class*="_frame"]');
    let titlebar = 0;
    if (shell) {
      titlebar = Math.round(parseFloat(window.getComputedStyle(frame).paddingTop) || 0);
    } else if (inner) {
      // The shell frame's own top padding is part of its border box, so the
      // offset to its first child is not the strip height — the padding is.
      const padTop = parseFloat(window.getComputedStyle(inner).paddingTop) || 0;
      const offset = inner.getBoundingClientRect().top - frame.getBoundingClientRect().top;
      titlebar = Math.round(Math.max(padTop, offset, 0));
    }
    root.style.setProperty('--dsh-vs-titlebar-h', titlebar + 'px');
    frameMode = shell ? 'shell' : 'own';
    titlebarHeight = titlebar;
    sidebarWidthPx = sidebarWidth;
  }

  /**
   * The titlebar strip also holds window chrome painted by other elements
   * (the caption-button cluster, menus). Clear their own fills inside the strip
   * so the strip fill below them shows through; restore them on disable.
   */
  let stripCleared = [];
  let geometryTimers = [];

  function clearStripChrome(frame) {
    stripCleared.forEach(function (element) {
      element.style.removeProperty('background-color');
    });
    stripCleared = [];
    if (!frame) return;
    const strip = Math.max(24, titlebarHeight || 40);
    // Scan the document, not just the frame: the caption cluster may live in a
    // portal outside the shell tree.
    const nodes = document.body.querySelectorAll('*');
    for (let index = 0; index < nodes.length; index += 1) {
      const element = nodes[index];
      if (
        element === frame ||
        element === document.body ||
        element.hasAttribute('data-dsvs-frame') ||
        element.hasAttribute('data-dsvs-shell') ||
        element.hasAttribute('data-view-studio')
      ) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 4) continue;
      if (rect.height > strip * 2) continue;
      if (rect.top < 0 || rect.top > strip - 4) continue;
      if (rect.bottom > strip + 12) continue;
      const style = window.getComputedStyle(element);
      if (!style.backgroundColor || style.backgroundColor === 'rgba(0, 0, 0, 0)') continue;
      stripCleared.push(element);
      element.style.setProperty('background-color', 'transparent', 'important');
    }
  }

  /**
   * Some conversation blocks (the edit summary, the composer shell, message
   * bubbles) carry their own opaque fill baked into the component instead of a
   * theme token, so token overrides cannot reach them. Normalise them: clear
   * the fill and leave a hairline inset border so the block is still readable
   * as a block.
   */
  let surfaceCleared = [];
  let surfaceObserver = null;
  let surfaceTimer = null;
  let surfaceCount = 0;

  function parseAlpha(color) {
    if (!color || color === 'transparent') return 0;
    const match = /^rgba?\(([^)]+)\)/.exec(color);
    if (!match) return 1;
    const parts = match[1].split(',').map(function (value) {
      return parseFloat(value);
    });
    return parts.length > 3 ? parts[3] : 1;
  }

  function restoreSurfaces() {
    for (let index = 0; index < surfaceCleared.length; index += 1) {
      const element = surfaceCleared[index];
      element.style.removeProperty('background-color');
      element.style.removeProperty('background-image');
      element.style.removeProperty('box-shadow');
    }
    surfaceCleared = [];
  }

  function clearSurfaces() {
    const active = !!state.bg || !!videoKey();
    if (!active) {
      restoreSurfaces();
      return;
    }
    const root = document.getElementById('root');
    if (!root) return;
    restoreSurfaces();
    const nodes = root.querySelectorAll('div, section, form, article, textarea');
    for (let index = 0; index < nodes.length; index += 1) {
      const element = nodes[index];
      if (
        element.hasAttribute('data-dsvs-frame') ||
        element.hasAttribute('data-dsvs-shell') ||
        element.hasAttribute('data-dsvs-video') ||
        element.hasAttribute('data-view-studio')
      ) {
        continue;
      }
      if (element.closest('[class*="dsh-vs-"]')) continue;
      if (element.closest('[role="dialog"],[role="menu"],[role="listbox"],[aria-modal="true"]')) {
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 220 || rect.height < 30) continue;
      const style = window.getComputedStyle(element);
      const radius = parseFloat(style.borderTopLeftRadius) || 0;
      const hasImage = !!style.backgroundImage && style.backgroundImage !== 'none';
      if (parseAlpha(style.backgroundColor) < 0.05 && !hasImage) continue;
      surfaceCleared.push(element);
      element.style.setProperty('background-color', 'transparent', 'important');
      if (hasImage) element.style.setProperty('background-image', 'none', 'important');
      // Only rounded blocks get the hairline; a full-width column with a border
      // would read as a frame around the whole conversation.
      if (radius >= 6) {
        element.style.setProperty(
          'box-shadow',
          'inset 0 0 0 1px var(--dsw-alias-border-l1)',
          'important',
        );
      }
    }

    // Text fields and tooltips are small, so they need their own pass; they
    // keep a hairline border so the field stays visible over the backdrop.
    const fields = root.querySelectorAll(
      '[contenteditable="true"], textarea, input[type="text"], input[type="search"], [role="tooltip"]',
    );
    for (let index = 0; index < fields.length; index += 1) {
      const element = fields[index];
      if (element.hasAttribute('data-view-studio')) continue;
      if (element.closest('[class*="dsh-vs-"]')) continue;
      if (element.closest('[role="dialog"],[role="menu"],[role="listbox"]')) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 18) continue;
      const style = window.getComputedStyle(element);
      const hasImage = !!style.backgroundImage && style.backgroundImage !== 'none';
      if (parseAlpha(style.backgroundColor) < 0.05 && !hasImage) continue;
      surfaceCleared.push(element);
      element.style.setProperty('background-color', 'transparent', 'important');
      if (hasImage) element.style.setProperty('background-image', 'none', 'important');
      element.style.setProperty(
        'box-shadow',
        'inset 0 0 0 1px var(--dsw-alias-border-l1)',
        'important',
      );
    }

    const previous = surfaceCount;
    surfaceCount = surfaceCleared.length;
    if (previous !== surfaceCount && typeof notify === 'function') notify();
  }

  function scheduleSurfaces() {
    if (surfaceTimer != null) window.clearTimeout(surfaceTimer);
    surfaceTimer = window.setTimeout(function () {
      surfaceTimer = null;
      clearSurfaces();
    }, 260);
  }

  function watchSurfaces() {
    if (surfaceObserver) return;
    const root = document.getElementById('root');
    if (!root || !window.MutationObserver) return;
    surfaceObserver = new window.MutationObserver(function () {
      if (state.bg || videoKey()) scheduleSurfaces();
    });
    surfaceObserver.observe(root, { childList: true, subtree: true });
  }

  function unwatchSurfaces() {
    if (surfaceObserver) {
      surfaceObserver.disconnect();
      surfaceObserver = null;
    }
    if (surfaceTimer != null) {
      window.clearTimeout(surfaceTimer);
      surfaceTimer = null;
    }
    restoreSurfaces();
  }

  function scheduleGeometry() {
    geometryTimers.forEach(function (id) {
      window.clearTimeout(id);
    });
    geometryTimers = [];
    const run = function () {
      if (!state.bg && !videoKey()) return;
      if (!frameEl || !frameEl.isConnected) return;
      measureFrame(frameEl);
      clearStripChrome(frameEl);
      clearSurfaces();
    };
    geometryTimers.push(window.setTimeout(run, 60));
    geometryTimers.push(window.setTimeout(run, 350));
    geometryTimers.push(window.setTimeout(run, 1200));
  }

  function applyVisuals(ctx) {
    const root = document.documentElement;
    const hasVideo = !!videoKey();

    if (state.bg || hasVideo) {
      root.style.setProperty('--dsh-vs-image', hasVideo ? 'none' : state.bg);
      root.style.setProperty('--dsh-vs-brightness', String(state.brightness / 100));
      root.style.setProperty('--dsh-vs-blur', state.blur + 'px');
      root.style.setProperty('--dsh-vs-dim', String(state.dim / 100));
      root.style.setProperty('--dsh-vs-saturate', String(state.saturate / 100));
      root.style.setProperty('--dsh-vs-fit', state.fit);
      root.style.setProperty('--dsh-vs-pos', state.pos);
      const frame = findFrame();
      if (frame) {
        frame.setAttribute('data-dsvs-frame', isShellFrame(frame) ? 'shell' : 'own');
        const inner = frame.querySelector('[class*="_frame"]');
        if (inner && inner !== frame) inner.setAttribute('data-dsvs-shell', '');
        measureFrame(frame);
        clearStripChrome(frame);
        scheduleGeometry();
        if (hasVideo) syncVideo(frame);
        else detachVideo();
        frameAttached = true;
      } else {
        detachVideo();
        frameAttached = false;
      }
      // Keep the body-level layer as a backstop: it fills anything the frame's
      // own stacking context does not cover, such as window chrome gaps.
      root.classList.add('dsh-vs-active');
      watchSurfaces();
      scheduleSurfaces();
    } else {
      root.classList.remove('dsh-vs-active');
      frameAttached = false;
      detachVideo();
      unwatchSurfaces();
      geometryTimers.forEach(function (id) {
        window.clearTimeout(id);
      });
      geometryTimers = [];
      clearStripChrome(null);
      if (frameEl) {
        frameEl.removeAttribute('data-dsvs-frame');
        const inner = frameEl.querySelector('[data-dsvs-shell]');
        if (inner) inner.removeAttribute('data-dsvs-shell');
      }
    }

    if (themeLayerDispose) {
      themeLayerDispose();
      themeLayerDispose = null;
    }
    const tokens = buildTokens();
    if (ctx && ctx.theme && Object.keys(tokens).length > 0) {
      try {
        themeLayerDispose = ctx.theme.overrideTokens(MODULE_ID, tokens);
      } catch (error) {
        console.error('[view-studio] token override failed', error);
      }
    }
  }

  function Slider(props) {
    const value = props.value;
    return React.createElement(
      'div',
      { className: 'dsh-vs-field' },
      React.createElement(
        'div',
        { className: 'dsh-vs-field-head' },
        React.createElement('span', { className: 'dsh-vs-label' }, props.label),
        React.createElement(
          'span',
          { className: 'dsh-vs-value' },
          value + (props.unit || ''),
        ),
      ),
      React.createElement('input', {
        className: 'dsh-vs-range',
        type: 'range',
        min: props.min,
        max: props.max,
        step: props.step || 1,
        value: value,
        'aria-label': props.label,
        onChange: function (event) {
          props.onChange(Number(event.target.value));
        },
      }),
      props.hint
        ? React.createElement('p', { className: 'dsh-vs-hint' }, props.hint)
        : null,
    );
  }

  function Card(props) {
    return React.createElement(
      'section',
      { className: 'dsh-vs-card' },
      React.createElement('h2', { className: 'dsh-vs-card-title' }, props.title),
      props.children,
    );
  }

  function SidebarIcon(props) {
    const size = props && typeof props.size === 'number' ? props.size : 20;
    return React.createElement(
      'svg',
      {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      },
      React.createElement('rect', { x: 3, y: 4, width: 18, height: 16, rx: 3 }),
      React.createElement('path', { d: 'M3 9h18' }),
      React.createElement('circle', { cx: 8.5, cy: 14.5, r: 2 }),
      React.createElement('path', { d: 'M12.5 13.6h6' }),
      React.createElement('path', { d: 'M12.5 16.4h4' }),
    );
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  /**
   * Decode a local file into a bounded data URL: large photos are downscaled
   * and re-encoded first, so the stored preference stays inside the
   * localStorage quota and the CSS variable stays a sane size.
   */
  function compressImage(file) {
    return new Promise(function (resolve, reject) {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = function () {
        try {
          const width = image.naturalWidth || image.width;
          const height = image.naturalHeight || image.height;
          const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
          const targetWidth = Math.max(1, Math.round(width * scale));
          const targetHeight = Math.max(1, Math.round(height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('no 2d context');
          context.drawImage(image, 0, 0, targetWidth, targetHeight);
          let data = '';
          try {
            data = canvas.toDataURL('image/webp', 0.86);
          } catch (error) {
            data = '';
          }
          if (!data || data.indexOf('data:image/webp') !== 0) {
            data = canvas.toDataURL('image/jpeg', 0.86);
          }
          if (data.length > 1900000) {
            data = canvas.toDataURL('image/jpeg', 0.68);
          }
          resolve({ data: data, width: targetWidth, height: targetHeight });
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      image.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('decode failed'));
      };
      image.src = objectUrl;
    });
  }

  function StudioPanel() {
    const [view, setView] = React.useState(getState());
    const [draft, setDraft] = React.useState('');
    const [notice, setNotice] = React.useState('');
    const [status, setStatus] = React.useState('');
    const [videoDraft, setVideoDraft] = React.useState('');

    React.useEffect(function () {
      return subscribe(function () {
        setView(getState());
      });
    }, []);

    // The panel mount is the first moment the shell columns are laid out; the
    // plugin's own mount happens before that, so re-measure the geometry here.
    React.useEffect(function () {
      if (getState().bg || getState().video !== 'none') {
        scheduleGeometry();
        scheduleSurfaces();
      }
    }, []);

    function patch(next) {
      setNotice('');
      setStatus('');
      setState(next);
    }

    function applyUrl() {
      const url = draft.trim();
      if (!url) {
        patch({ bg: '' });
        return;
      }
      patch({ bg: 'url("' + url.replace(/"/g, '%22') + '")' });
    }

    function applyImageFile(file) {
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        setNotice(tr('notImage'));
        return;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        setNotice(tr('tooLarge'));
        return;
      }
      setNotice('');
      setStatus(tr('processing'));
      compressImage(file)
        .then(function (result) {
          patch({ bg: 'url("' + result.data + '")' });
          setStatus(
            tr('appliedImage') +
              ' · ' +
              result.width +
              '×' +
              result.height +
              ' · ' +
              formatBytes(result.data.length),
          );
        })
        .catch(function (error) {
          console.error('[view-studio] image processing failed, storing the original', error);
          const reader = new FileReader();
          reader.onload = function () {
            const result = String(reader.result || '');
            if (!result) {
              setNotice(tr('readFailed'));
              return;
            }
            patch({ bg: 'url("' + result + '")' });
            setStatus(tr('appliedImage') + ' · ' + formatBytes(result.length));
          };
          reader.onerror = function () {
            setNotice(tr('readFailed'));
          };
          reader.readAsDataURL(file);
        });
    }

    function onFile(event) {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      applyImageFile(file);
    }

    function onVideoFile(event) {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      if (!/^video\//.test(file.type) && !/\.(mp4|webm|ogv|mov|m4v)$/i.test(file.name)) {
        setNotice(tr('notVideo'));
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setNotice(tr('videoTooLarge'));
        return;
      }
      setNotice('');
      setStatus(tr('processingVideo'));
      idbPut('video', file)
        .then(function () {
          patch({ video: 'stored', videoUrl: '' });
          setStatus(tr('appliedVideo') + ' · ' + formatBytes(file.size));
        })
        .catch(function (error) {
          console.error('[view-studio] storing the video failed', error);
          setNotice(tr('readFailed'));
        });
    }

    function applyVideoUrl() {
      const url = videoDraft.trim();
      if (!url) {
        setNotice(tr('notVideo'));
        return;
      }
      patch({ video: 'url', videoUrl: url });
    }

    function clearVideo() {
      idbDelete('video').catch(function () {});
      setVideoDraft('');
      patch({ video: 'none', videoUrl: '' });
    }

    // Pasting a copied image is the quickest way in, so accept it while the
    // panel is open.
    React.useEffect(function () {
      function onPaste(event) {
        const items = event.clipboardData && event.clipboardData.items;
        if (!items) return;
        for (let index = 0; index < items.length; index += 1) {
          const item = items[index];
          if (item.type && item.type.indexOf('image/') === 0) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              applyImageFile(file);
            }
            return;
          }
        }
      }
      document.addEventListener('paste', onPaste);
      return function () {
        document.removeEventListener('paste', onPaste);
      };
    }, []);

    const bgKind = !view.bg
      ? tr('none')
      : view.bg.indexOf('url(') === 0
        ? tr('image')
        : tr('gradient');

    const videoState =
      view.video === 'none'
        ? tr('none')
        : view.video === 'url'
          ? view.videoUrl
          : tr('videoStored');

    const presetButtons = [
      ['default', tr('presetDefault')],
      ['dusk', tr('presetDusk')],
      ['aurora', tr('presetAurora')],
      ['sakura', tr('presetSakura')],
      ['paper', tr('presetPaper')],
    ].map(function (entry) {
      const key = entry[0];
      return React.createElement(
        'button',
        {
          key: key,
          type: 'button',
          className: 'dsh-vs-chip',
          'data-active': view.bg === PRESETS[key] ? 'true' : 'false',
          onClick: function () {
            patch({ bg: PRESETS[key] });
          },
        },
        entry[1],
      );
    });

    const previewStyle = {
      backgroundImage:
        view.bg ||
        'linear-gradient(135deg, var(--dsw-alias-bg-layer-2), var(--dsw-alias-bg-layer-1))',
      backgroundSize: view.fit === 'contain' ? 'contain' : 'cover',
      backgroundPosition: view.pos,
      backgroundRepeat: 'no-repeat',
      filter:
        'brightness(' +
        view.brightness / 100 +
        ') saturate(' +
        view.saturate / 100 +
        ') blur(' +
        Math.min(view.blur / 2, 12) +
        'px)',
    };

    return React.createElement(
      'div',
      { className: 'dsh-vs-root' },
      React.createElement(
        'div',
        { className: 'dsh-vs-inner' },
        React.createElement(
          'header',
          { className: 'dsh-vs-header' },
          React.createElement('h1', null, tr('title')),
          React.createElement('p', null, tr('subtitle')),
        ),
        React.createElement(
          'div',
          { className: 'dsh-vs-preview' },
          React.createElement('div', {
            className: 'dsh-vs-preview-bg',
            style: previewStyle,
          }),
          React.createElement('div', {
            className: 'dsh-vs-preview-dim',
            style: { background: 'rgba(6, 8, 12, ' + view.dim / 100 + ')' },
          }),
          React.createElement(
            'span',
            { className: 'dsh-vs-preview-tag' },
            view.bg
              ? tr('preview') + ' · ' + (frameAttached ? tr('liveOn') : tr('liveFallback'))
              : tr('preview'),
          ),
        ),
        React.createElement(
          Card,
          { title: tr('bgTitle') },
          React.createElement(
            'div',
            { className: 'dsh-vs-field' },
            React.createElement('span', { className: 'dsh-vs-label' }, tr('bgFromUrl')),
            React.createElement(
              'div',
              { className: 'dsh-vs-row' },
              React.createElement('input', {
                className: 'dsh-vs-input',
                type: 'text',
                value: draft,
                placeholder: tr('bgUrlPlaceholder'),
                'aria-label': tr('bgFromUrl'),
                onChange: function (event) {
                  setDraft(event.target.value);
                },
                onKeyDown: function (event) {
                  if (event.key === 'Enter') applyUrl();
                },
              }),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dsh-vs-btn dsh-vs-btn-primary',
                  onClick: applyUrl,
                },
                tr('apply'),
              ),
            ),
          ),
          React.createElement(
            'div',
            { className: 'dsh-vs-row' },
            React.createElement(
              'label',
              { className: 'dsh-vs-btn dsh-vs-btn-file' },
              tr('pickFile'),
              React.createElement('input', {
                className: 'dsh-vs-file',
                type: 'file',
                accept: 'image/*',
                onChange: onFile,
              }),
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'dsh-vs-btn',
                onClick: function () {
                  setDraft('');
                  patch({ bg: '' });
                },
              },
              tr('clearBg'),
            ),
            React.createElement(
              'span',
              { className: 'dsh-vs-value' },
              tr('current') + ': ' + bgKind,
            ),
          ),
          status
            ? React.createElement('p', { className: 'dsh-vs-status' }, status)
            : null,
          React.createElement(
            'div',
            { className: 'dsh-vs-row' },
            React.createElement('span', { className: 'dsh-vs-value' }, tr('presets')),
            presetButtons,
          ),
          React.createElement(
            'div',
            { className: 'dsh-vs-row' },
            React.createElement('span', { className: 'dsh-vs-value' }, tr('fitTitle')),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'dsh-vs-chip',
                'data-active': view.fit === 'cover' ? 'true' : 'false',
                onClick: function () {
                  patch({ fit: 'cover' });
                },
              },
              tr('fitCover'),
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'dsh-vs-chip',
                'data-active': view.fit === 'contain' ? 'true' : 'false',
                onClick: function () {
                  patch({ fit: 'contain' });
                },
              },
              tr('fitContain'),
            ),
          ),
          React.createElement(
            'div',
            { className: 'dsh-vs-row' },
            React.createElement('span', { className: 'dsh-vs-value' }, tr('posTitle')),
            [
              ['center', tr('posCenter')],
              ['top', tr('posTop')],
              ['bottom', tr('posBottom')],
            ].map(function (entry) {
              return React.createElement(
                'button',
                {
                  key: entry[0],
                  type: 'button',
                  className: 'dsh-vs-chip',
                  'data-active': view.pos === entry[0] ? 'true' : 'false',
                  onClick: function () {
                    patch({ pos: entry[0] });
                  },
                },
                entry[1],
              );
            }),
          ),
          React.createElement('p', { className: 'dsh-vs-hint' }, tr('pasteHint')),
          React.createElement('p', { className: 'dsh-vs-hint' }, tr('videoHint')),
          React.createElement(
            'div',
            { className: 'dsh-vs-row' },
            React.createElement(
              'label',
              { className: 'dsh-vs-btn dsh-vs-btn-file' },
              tr('pickVideo'),
              React.createElement('input', {
                className: 'dsh-vs-file',
                type: 'file',
                accept: 'video/*',
                onChange: onVideoFile,
              }),
            ),
            React.createElement(
              'button',
              { type: 'button', className: 'dsh-vs-btn', onClick: clearVideo },
              tr('clearVideo'),
            ),
            React.createElement(
              'span',
              { className: 'dsh-vs-value' },
              videoState,
            ),
          ),
          React.createElement(
            'div',
            { className: 'dsh-vs-row' },
            React.createElement('input', {
              className: 'dsh-vs-input',
              type: 'text',
              value: videoDraft,
              placeholder: tr('videoUrlPlaceholder'),
              'aria-label': tr('videoUrlPlaceholder'),
              onChange: function (event) {
                setVideoDraft(event.target.value);
              },
              onKeyDown: function (event) {
                if (event.key === 'Enter') applyVideoUrl();
              },
            }),
            React.createElement(
              'button',
              { type: 'button', className: 'dsh-vs-btn', onClick: applyVideoUrl },
              tr('apply'),
            ),
          ),
        ),
        React.createElement(
          Card,
          { title: tr('effectTitle') },
          React.createElement(Slider, {
            label: tr('blur'),
            hint: tr('blurHint'),
            value: view.blur,
            min: 0,
            max: 40,
            unit: 'px',
            onChange: function (value) {
              patch({ blur: value });
            },
          }),
          React.createElement(Slider, {
            label: tr('brightness'),
            hint: tr('brightnessHint'),
            value: view.brightness,
            min: 40,
            max: 160,
            unit: '%',
            onChange: function (value) {
              patch({ brightness: value });
            },
          }),
          React.createElement(Slider, {
            label: tr('saturate'),
            hint: tr('saturateHint'),
            value: view.saturate,
            min: 0,
            max: 200,
            unit: '%',
            onChange: function (value) {
              patch({ saturate: value });
            },
          }),
          React.createElement(Slider, {
            label: tr('dim'),
            hint: tr('dimHint'),
            value: view.dim,
            min: 0,
            max: 70,
            unit: '%',
            onChange: function (value) {
              patch({ dim: value });
            },
          }),
        ),
        React.createElement(
          Card,
          { title: tr('colorTitle') },
          React.createElement(
            'div',
            { className: 'dsh-vs-row' },
            React.createElement('input', {
              className: 'dsh-vs-color',
              type: 'color',
              value: view.accent || '#7c5cff',
              'aria-label': tr('accent'),
              onChange: function (event) {
                patch({ accent: event.target.value });
              },
            }),
            React.createElement(
              'span',
              { className: 'dsh-vs-value' },
              view.accent || tr('followTheme'),
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'dsh-vs-btn',
                onClick: function () {
                  patch({ accent: '' });
                },
              },
              tr('followTheme'),
            ),
          ),
          React.createElement('p', { className: 'dsh-vs-hint' }, tr('accentHint')),
        ),
        React.createElement(
          Card,
          { title: tr('glassTitle') },
          React.createElement(Slider, {
            label: tr('glass'),
            hint: tr('glassHint'),
            value: view.glass,
            min: 0,
            max: 100,
            unit: '%',
            onChange: function (value) {
              patch({ glass: value });
            },
          }),
        ),
        React.createElement(
          'div',
          { className: 'dsh-vs-footer' },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dsh-vs-btn',
              onClick: function () {
                setDraft('');
                setNotice('');
                setState(Object.assign({}, DEFAULTS));
              },
            },
            tr('resetAll'),
          ),
          notice
            ? React.createElement('span', { className: 'dsh-vs-notice' }, notice)
            : React.createElement('span', { className: 'dsh-vs-value' }, tr('autosave')),
          view.bg || view.video !== 'none'
            ? React.createElement(
                'span',
                { className: 'dsh-vs-value' },
                tr('surfaces') + ': ' + surfaceCount,
              )
            : null,
        ),
      ),
    );
  }

  window.__ModuleLoader__.load({
    id: MODULE_ID,
    factory(require) {
      React = require('react');

      return {
        inject: ['slots', 'theme', 'locale'],
        apply(ctx) {
          applyHook = function () {
            applyVisuals(ctx);
          };

          ctx.effect(function () {
            const styleEl = document.createElement('style');
            styleEl.setAttribute('data-view-studio', '');
            styleEl.textContent = CSS_TEXT;
            document.head.appendChild(styleEl);

            const root = document.documentElement;

            function syncLang() {
              try {
                const snapshot = ctx.locale.getSnapshot();
                lang = String((snapshot && snapshot.active) || 'en');
              } catch (error) {
                lang = 'en';
              }
            }

            syncLang();
            const offLocale = ctx.locale.subscribe(function () {
              syncLang();
              notify();
            });

            applyVisuals(ctx);

            const onResize = function () {
              if (state.bg && frameEl && frameEl.isConnected) {
                measureFrame(frameEl);
                clearStripChrome(frameEl);
              }
            };
            window.addEventListener('resize', onResize);

            return function () {
              styleEl.remove();
              offLocale();
              window.removeEventListener('resize', onResize);
              geometryTimers.forEach(function (id) {
                window.clearTimeout(id);
              });
              geometryTimers = [];
              clearStripChrome(null);
              detachVideo();
              unwatchSurfaces();
              root.classList.remove('dsh-vs-active');
              if (frameEl) {
                frameEl.removeAttribute('data-dsvs-frame');
                const shellFrame = frameEl.querySelector('[data-dsvs-shell]');
                if (shellFrame) shellFrame.removeAttribute('data-dsvs-shell');
              }
              [
                '--dsh-vs-image',
                '--dsh-vs-brightness',
                '--dsh-vs-blur',
                '--dsh-vs-dim',
                '--dsh-vs-saturate',
                '--dsh-vs-fit',
                '--dsh-vs-pos',
                '--dsh-vs-sidebar-w',
                '--dsh-vs-titlebar-h',
              ].forEach(function (name) {
                root.style.removeProperty(name);
              });
              applyHook = null;
              if (themeLayerDispose) {
                themeLayerDispose();
                themeLayerDispose = null;
              }
            };
          }, 'view-studio: appearance');

          ctx.slots.inject('sidebar.panellist', function () {
            return ctx.slots.register(
              {
                name: 'sidebar.panellist',
                id: 'view-studio',
                order: 20,
                label: function () {
                  return tr('nav');
                },
              },
              SidebarIcon,
            );
          });

          ctx.slots.inject('main', function () {
            return ctx.slots.register({ name: 'main', key: 'view-studio' }, StudioPanel);
          });
        },
      };
    },
  });
})();
