/**
 * Site2CRM AI Chat Widget
 * Embeddable chat widget powered by DeepSeek AI
 * Next-Gen Design v3.0 — Shadow DOM + Accessibility + Hardening
 *
 * Usage:
 * <script src="https://api.site2crm.io/api/public/chat-widget/widget.js" data-widget-key="YOUR_KEY" async></script>
 *
 * Attributes:
 *   data-widget-key     (required) Your widget key
 *   data-exclude-paths  (optional) Comma-separated paths to hide on (supports trailing *)
 *   data-z-index        (optional) Custom z-index for bubble (window = bubble + 1)
 */
(function () {
  "use strict";

  // === GUARDS & CONFIG PARSING ===

  // Duplicate prevention — bail if already initialized
  if (document.getElementById("site2crm-chat-widget")) {
    return;
  }

  // GTM/tag manager support — fallback when document.currentScript is null
  let script = document.currentScript;
  if (!script) {
    const scripts = document.querySelectorAll("script[data-widget-key]");
    if (scripts.length > 0) {
      script = scripts[scripts.length - 1];
    }
  }

  const widgetKey = script?.getAttribute("data-widget-key");
  if (!widgetKey) {
    console.error("Site2CRM Chat Widget: Missing data-widget-key attribute");
    return;
  }

  // Parse excluded paths (comma-separated, supports trailing *)
  const excludePathsAttr = script?.getAttribute("data-exclude-paths");
  const excludePatterns = excludePathsAttr
    ? excludePathsAttr.split(",").map(function (p) { return p.trim(); })
    : [];

  // Configurable z-index (default 999998/999999)
  const customZIndex = parseInt(script?.getAttribute("data-z-index"), 10);
  const bubbleZIndex = customZIndex || 999998;
  const windowZIndex = bubbleZIndex + 1;

  // === UTILITY FUNCTIONS ===

  function isExcludedPath(path) {
    for (var i = 0; i < excludePatterns.length; i++) {
      var pattern = excludePatterns[i];
      if (pattern.endsWith("*")) {
        if (path.startsWith(pattern.slice(0, -1))) return true;
      } else if (path === pattern) {
        return true;
      }
    }
    return false;
  }

  function isHiddenByAuth() {
    return (
      localStorage.getItem("site2crm_hide_chat") === "true" ||
      document.cookie.includes("site2crm_hide_chat=true")
    );
  }

  function shouldHide() {
    return isExcludedPath(window.location.pathname) || isHiddenByAuth();
  }

  // Safe sessionStorage wrapper — throws in sandboxed iframes
  function safeStorage(method, key, value) {
    try {
      if (method === "get") return sessionStorage.getItem(key);
      if (method === "set") { sessionStorage.setItem(key, value); return value; }
    } catch (e) {
      return null;
    }
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // === CONSTANTS ===

  var API_BASE = "https://api.site2crm.io/api/public/chat-widget";

  // Generate session ID (safe for sandboxed contexts)
  function generateSessionId() {
    var stored = safeStorage("get", "s2c_chat_session");
    if (stored) return stored;
    var id =
      "s2c_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).substr(2, 9);
    safeStorage("set", "s2c_chat_session", id);
    return id;
  }

  var sessionId = generateSessionId();

  // === SAFE localStorage WRAPPER ===

  function safeLSGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeLSSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  // === GDPR CONSENT ===

  // null = not decided, "1" = accepted, "0" = declined
  var gdprConsent = safeLSGet("s2c_gdpr_consent");

  // === CONFIG CACHING ===

  var CONFIG_CACHE_TTL = 300000; // 5 minutes (matches Cache-Control: max-age=300)

  function getCachedConfig() {
    try {
      var raw = safeLSGet("s2c_config_" + widgetKey);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (Date.now() - cached._ts < CONFIG_CACHE_TTL) return cached.data;
    } catch (e) { /* ignore corrupt cache */ }
    return null;
  }

  function setCachedConfig(cfg) {
    safeLSSet("s2c_config_" + widgetKey, JSON.stringify({ data: cfg, _ts: Date.now() }));
  }

  // === STATE ===

  var isOpen = false;
  var isLoading = false;
  var config = null;
  var messages = [];
  var lastSendTime = 0; // Throttle: timestamp of last send
  var SEND_COOLDOWN = 1000; // 1 second minimum between sends

  // DOM references
  var shadow; // ShadowRoot
  var container,
    bubble,
    chatWindow,
    messagesContainer,
    inputField,
    sendBtn,
    quickRepliesContainer;

  // Button sizes
  var buttonSizes = {
    small: { size: 52, icon: 26 },
    medium: { size: 64, icon: 30 },
    large: { size: 76, icon: 36 },
  };

  // === STYLES ===

  function generateStyles(cfg) {
    var primaryColor = cfg.primary_color || "#6366f1";
    var chatBgColor = cfg.chat_bg_color || "#0f0f23";
    var userBubbleColor = cfg.user_bubble_color || primaryColor;
    var botBubbleColor = cfg.bot_bubble_color || "#1e1e3f";
    var btnSize = buttonSizes[cfg.button_size] || buttonSizes.medium;

    var buttonShape = cfg.button_shape || "bubble";
    var gradientType = cfg.gradient_type || "none";
    var gradColor1 = cfg.gradient_color_1;
    var gradColor2 = cfg.gradient_color_2;
    var gradColor3 = cfg.gradient_color_3;
    var gradientAngle =
      cfg.gradient_angle != null ? cfg.gradient_angle : 135;
    var buttonOpacity =
      cfg.button_opacity != null ? cfg.button_opacity : 1.0;
    var blurBackground = cfg.blur_background || false;
    var attentionEffect = cfg.attention_effect || "none";
    var shadowStyle = cfg.shadow_style || "elevated";
    var entryAnimation = cfg.entry_animation || "scale";

    // Hex to RGB
    var hexToRgb = function (hex) {
      var h = hex.replace("#", "");
      return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
      ];
    };
    var pr = hexToRgb(primaryColor);
    var pRgba = function (a) {
      return "rgba(" + pr[0] + ", " + pr[1] + ", " + pr[2] + ", " + a + ")";
    };
    var lighten = function (hex, amt) {
      var c = hexToRgb(hex);
      return (
        "rgb(" +
        Math.min(255, c[0] + amt) +
        ", " +
        Math.min(255, c[1] + amt) +
        ", " +
        Math.min(255, c[2] + amt) +
        ")"
      );
    };
    var primaryLight = lighten(primaryColor, 40);

    // Gradient presets
    var gradientPresets = {
      sunset: ["#f97316", "#ec4899"],
      ocean: ["#06b6d4", "#3b82f6"],
      forest: ["#22c55e", "#14b8a6"],
      purple: ["#8b5cf6", "#ec4899"],
      fire: ["#ef4444", "#f97316"],
      midnight: ["#1e3a8a", "#7c3aed"],
      aurora: ["#06b6d4", "#8b5cf6", "#ec4899"],
    };

    // Bubble background
    var bubbleBg;
    if (gradientType === "none") {
      bubbleBg = primaryColor;
    } else if (gradientType === "custom") {
      var colors = [gradColor1, gradColor2, gradColor3].filter(Boolean);
      bubbleBg =
        colors.length > 1
          ? "linear-gradient(" + gradientAngle + "deg, " + colors.join(", ") + ")"
          : primaryColor;
    } else if (gradientPresets[gradientType]) {
      bubbleBg =
        "linear-gradient(" +
        gradientAngle +
        "deg, " +
        gradientPresets[gradientType].join(", ") +
        ")";
    } else {
      bubbleBg = primaryColor;
    }

    // Button shape config
    var shapeConfig = {
      bubble: { radius: "50%", width: btnSize.size + "px", height: btnSize.size + "px", layout: "icon" },
      pill: { radius: "9999px", width: (btnSize.size * 1.8) + "px", height: (btnSize.size * 0.85) + "px", layout: "icon-text" },
      square: { radius: "16px", width: btnSize.size + "px", height: btnSize.size + "px", layout: "icon" },
      tab: { radius: "12px 0 0 12px", width: (btnSize.size * 0.7) + "px", height: (btnSize.size * 1.6) + "px", layout: "icon-vertical" },
      bar: { radius: "16px 16px 0 0", width: (btnSize.size * 3) + "px", height: (btnSize.size * 0.75) + "px", layout: "icon-text" },
    };
    var shape = shapeConfig[buttonShape] || shapeConfig.bubble;

    // Shadow style
    var shadows = {
      none: "none",
      subtle: "0 4px 12px rgba(0,0,0,0.15)",
      elevated:
        "0 8px 32px " + pRgba(0.4) + ", 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 4px rgba(0, 0, 0, 0.1)",
      dramatic:
        "0 20px 60px rgba(0,0,0,0.4), 0 8px 24px " + pRgba(0.3),
      glow:
        "0 0 20px " + primaryColor + "80, 0 0 40px " + primaryColor + "40, 0 8px 32px rgba(0,0,0,0.3)",
    };
    var bubbleShadow = shadows[shadowStyle] || shadows.elevated;
    var bubbleHoverShadow =
      shadowStyle === "none"
        ? "none"
        : shadowStyle === "glow"
        ? "0 0 30px " + primaryColor + "90, 0 0 60px " + primaryColor + "60, 0 12px 40px rgba(0,0,0,0.3)"
        : shadowStyle === "dramatic"
        ? "0 24px 70px rgba(0,0,0,0.5), 0 12px 32px " + pRgba(0.4)
        : "0 12px 40px " + pRgba(0.5) + ", 0 0 0 1px rgba(255, 255, 255, 0.15) inset, 0 4px 8px rgba(0, 0, 0, 0.15)";

    // Attention effect
    var bubbleAttentionAnimation = "";
    var attentionAfterAnimation = "none";
    var attentionKeyframes = "";
    if (attentionEffect === "pulse") {
      attentionAfterAnimation = "s2c-pulse 2s ease-out infinite";
      attentionKeyframes =
        "@keyframes s2c-pulse { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.4); opacity: 0; } }";
    } else if (attentionEffect === "bounce") {
      bubbleAttentionAnimation = "animation: s2c-bounce 2s ease-in-out infinite;";
      attentionKeyframes =
        "@keyframes s2c-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }";
    } else if (attentionEffect === "glow") {
      bubbleAttentionAnimation = "animation: s2c-glow 2s ease-in-out infinite;";
      attentionKeyframes =
        "@keyframes s2c-glow { 0%, 100% { box-shadow: " + bubbleShadow + "; } 50% { box-shadow: 0 0 30px " + primaryColor + "90, 0 0 60px " + primaryColor + "50, 0 8px 32px rgba(0,0,0,0.3); } }";
    } else if (attentionEffect === "shake") {
      bubbleAttentionAnimation = "animation: s2c-shake 3s ease-in-out infinite;";
      attentionKeyframes =
        "@keyframes s2c-shake { 0%, 90%, 100% { transform: rotate(0); } 92% { transform: rotate(-8deg); } 94% { transform: rotate(8deg); } 96% { transform: rotate(-6deg); } 98% { transform: rotate(6deg); } }";
    } else if (attentionEffect === "ring") {
      attentionAfterAnimation = "s2c-ring 2s ease-out infinite";
      attentionKeyframes =
        "@keyframes s2c-ring { 0% { transform: scale(1); opacity: 0.6; box-shadow: 0 0 0 0 " + primaryColor + "80; } 100% { transform: scale(1.5); opacity: 0; box-shadow: 0 0 0 12px " + primaryColor + "00; } }";
    }

    // Entry animation
    var windowAnimation, windowKeyframes;
    if (entryAnimation === "fade") {
      windowAnimation = "s2c-fade-in";
      windowKeyframes =
        "@keyframes s2c-fade-in { from { opacity: 0; } to { opacity: 1; } }";
    } else if (entryAnimation === "slide") {
      windowAnimation = "s2c-slide-in";
      windowKeyframes =
        "@keyframes s2c-slide-in { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }";
    } else if (entryAnimation === "bounce") {
      windowAnimation = "s2c-bounce-in";
      windowKeyframes =
        "@keyframes s2c-bounce-in { 0% { opacity: 0; transform: translateY(30px) scale(0.9); } 50% { transform: translateY(-8px) scale(1.02); } 100% { opacity: 1; transform: translateY(0) scale(1); } }";
    } else if (entryAnimation === "none") {
      windowAnimation = "none";
      windowKeyframes = "";
    } else {
      windowAnimation = "s2c-scale-in";
      windowKeyframes =
        "@keyframes s2c-scale-in { from { opacity: 0; transform: translateY(24px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }";
    }

    return (
      "*, *::before, *::after {" +
      "  box-sizing: border-box;" +
      "  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" +
      "  margin: 0;" +
      "  padding: 0;" +
      "}" +
      "" +
      ".s2c-bubble {" +
      "  position: fixed;" +
      "  width: " + shape.width + ";" +
      "  height: " + shape.height + ";" +
      "  border-radius: " + shape.radius + ";" +
      "  cursor: pointer;" +
      "  display: flex;" +
      "  align-items: center;" +
      "  justify-content: center;" +
      (shape.layout === "icon-text" ? "  gap: 8px;" : "") +
      (shape.layout === "icon-vertical" ? "  flex-direction: column;" : "") +
      "  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);" +
      "  z-index: " + bubbleZIndex + ";" +
      "  background: " + bubbleBg + ";" +
      "  opacity: " + buttonOpacity + ";" +
      "  box-shadow: " + bubbleShadow + ";" +
      (blurBackground ? "  backdrop-filter: blur(10px);" : "") +
      "  " + bubbleAttentionAnimation +
      "  border: none;" +
      "  outline: none;" +
      "}" +
      "" +
      ".s2c-bubble::before {" +
      "  content: '';" +
      "  position: absolute;" +
      "  inset: 0;" +
      "  border-radius: " + shape.radius + ";" +
      "  padding: 1px;" +
      "  background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05));" +
      "  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);" +
      "  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);" +
      "  -webkit-mask-composite: xor;" +
      "  mask-composite: exclude;" +
      "  pointer-events: none;" +
      "}" +
      "" +
      ".s2c-bubble:hover {" +
      "  transform: scale(1.1) translateY(-2px);" +
      "  box-shadow: " + bubbleHoverShadow + ";" +
      "}" +
      "" +
      ".s2c-bubble:active {" +
      "  transform: scale(1.05);" +
      "}" +
      "" +
      ".s2c-bubble:focus-visible {" +
      "  outline: 2px solid white;" +
      "  outline-offset: 3px;" +
      "}" +
      "" +
      ".s2c-bubble svg {" +
      "  width: " + btnSize.icon + "px;" +
      "  height: " + btnSize.icon + "px;" +
      "  color: white;" +
      "  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" +
      "  transition: transform 0.3s ease;" +
      "}" +
      "" +
      ".s2c-bubble .s2c-bubble-label {" +
      "  color: white;" +
      "  font-size: 14px;" +
      "  font-weight: 600;" +
      "  white-space: nowrap;" +
      "}" +
      "" +
      ".s2c-bubble:hover svg {" +
      "  transform: scale(1.1);" +
      "}" +
      "" +
      ".s2c-bubble.bottom-right {" +
      "  bottom: calc(" + (buttonShape === "bar" ? "0px" : "24px") + " + env(safe-area-inset-bottom, 0px));" +
      "  right: " + (buttonShape === "tab" ? "0" : "24px") + ";" +
      "}" +
      "" +
      ".s2c-bubble.bottom-left {" +
      "  bottom: calc(" + (buttonShape === "bar" ? "0px" : "24px") + " + env(safe-area-inset-bottom, 0px));" +
      "  left: " + (buttonShape === "tab" ? "0" : "24px") + ";" +
      "}" +
      "" +
      (buttonShape === "tab"
        ? ".s2c-bubble.bottom-left { border-radius: 0 12px 12px 0; }"
        : "") +
      "" +
      (buttonShape === "bar"
        ? ".s2c-bubble.bottom-right, .s2c-bubble.bottom-left { right: auto; left: 50%; transform: translateX(-50%); }" +
          ".s2c-bubble.bottom-right:hover, .s2c-bubble.bottom-left:hover { transform: translateX(-50%) translateY(-2px); }"
        : "") +
      "" +
      ".s2c-bubble::after {" +
      "  content: '';" +
      "  position: absolute;" +
      "  width: 100%;" +
      "  height: 100%;" +
      "  border-radius: " + shape.radius + ";" +
      "  background: inherit;" +
      "  animation: " + attentionAfterAnimation + ";" +
      "  z-index: -1;" +
      (attentionAfterAnimation === "none" ? "  display: none;" : "") +
      "}" +
      "" +
      attentionKeyframes +
      "" +
      ".s2c-window {" +
      "  position: fixed;" +
      "  width: 400px;" +
      "  height: 560px;" +
      "  max-height: calc(100vh - 100px);" +
      "  border-radius: 24px;" +
      "  background: linear-gradient(180deg, " + chatBgColor + " 0%, #0a0a1a 100%);" +
      "  box-shadow: 0 32px 64px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 80px " + pRgba(0.15) + ";" +
      "  display: none;" +
      "  flex-direction: column;" +
      "  overflow: hidden;" +
      "  z-index: " + windowZIndex + ";" +
      "}" +
      "" +
      ".s2c-window.open {" +
      "  display: flex;" +
      "  animation: " + windowAnimation + " 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);" +
      "}" +
      "" +
      windowKeyframes +
      "" +
      ".s2c-window.bottom-right {" +
      "  bottom: calc(" + (btnSize.size + 40) + "px + env(safe-area-inset-bottom, 0px));" +
      "  right: 24px;" +
      "}" +
      "" +
      ".s2c-window.bottom-left {" +
      "  bottom: calc(" + (btnSize.size + 40) + "px + env(safe-area-inset-bottom, 0px));" +
      "  left: 24px;" +
      "}" +
      "" +
      "@media (max-width: 480px) {" +
      "  .s2c-window {" +
      "    width: calc(100vw - 16px);" +
      "    height: 65vh !important;" +
      "    max-height: 450px !important;" +
      "    bottom: calc(70px + env(safe-area-inset-bottom, 0px)) !important;" +
      "    right: 8px !important;" +
      "    left: 8px !important;" +
      "    border-radius: 20px;" +
      "  }" +
      "  .s2c-bubble {" +
      "    bottom: calc(" + (buttonShape === "bar" ? "0px" : "16px") + " + env(safe-area-inset-bottom, 0px)) !important;" +
      "    right: " + (buttonShape === "tab" ? "0" : "16px") + " !important;" +
      "  }" +
      "}" +
      "" +
      ".s2c-header {" +
      "  padding: 20px 24px;" +
      "  background: " + (bubbleBg.includes("gradient") ? bubbleBg : "linear-gradient(135deg, " + primaryColor + " 0%, " + primaryLight + " 100%)") + ";" +
      "  color: white;" +
      "  display: flex;" +
      "  align-items: center;" +
      "  justify-content: space-between;" +
      "  flex-shrink: 0;" +
      "  position: relative;" +
      "  overflow: hidden;" +
      "}" +
      "" +
      ".s2c-header::before {" +
      "  content: '';" +
      "  position: absolute;" +
      "  top: -50%;" +
      "  right: -20%;" +
      "  width: 200px;" +
      "  height: 200px;" +
      "  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);" +
      "  pointer-events: none;" +
      "}" +
      "" +
      ".s2c-header-info {" +
      "  display: flex;" +
      "  flex-direction: column;" +
      "  position: relative;" +
      "  z-index: 1;" +
      "}" +
      "" +
      ".s2c-header-title {" +
      "  font-size: 17px;" +
      "  font-weight: 700;" +
      "  display: flex;" +
      "  align-items: center;" +
      "  gap: 10px;" +
      "  letter-spacing: -0.02em;" +
      "}" +
      "" +
      ".s2c-status-dot {" +
      "  width: 10px;" +
      "  height: 10px;" +
      "  background: #22c55e;" +
      "  border-radius: 50%;" +
      "  flex-shrink: 0;" +
      "  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25), 0 0 12px rgba(34, 197, 94, 0.5);" +
      "  animation: s2c-status-pulse 2s ease-in-out infinite;" +
      "}" +
      "" +
      "@keyframes s2c-status-pulse {" +
      "  0%, 100% { box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25), 0 0 12px rgba(34, 197, 94, 0.5); }" +
      "  50% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.15), 0 0 20px rgba(34, 197, 94, 0.6); }" +
      "}" +
      "" +
      ".s2c-header-subtitle {" +
      "  font-size: 13px;" +
      "  opacity: 0.9;" +
      "  margin-top: 4px;" +
      "  margin-left: 20px;" +
      "  font-weight: 500;" +
      "}" +
      "" +
      ".s2c-close {" +
      "  background: rgba(255, 255, 255, 0.15);" +
      "  border: none;" +
      "  color: white;" +
      "  cursor: pointer;" +
      "  padding: 8px;" +
      "  border-radius: 12px;" +
      "  transition: all 0.2s ease;" +
      "  position: relative;" +
      "  z-index: 1;" +
      "  backdrop-filter: blur(10px);" +
      "}" +
      "" +
      ".s2c-close:hover {" +
      "  background: rgba(255, 255, 255, 0.25);" +
      "  transform: scale(1.05);" +
      "}" +
      "" +
      ".s2c-close:focus-visible {" +
      "  outline: 2px solid white;" +
      "  outline-offset: 2px;" +
      "}" +
      "" +
      ".s2c-close svg {" +
      "  width: 18px;" +
      "  height: 18px;" +
      "  display: block;" +
      "}" +
      "" +
      ".s2c-messages {" +
      "  flex: 1;" +
      "  padding: 20px;" +
      "  overflow-y: auto;" +
      "  display: flex;" +
      "  flex-direction: column;" +
      "  gap: 16px;" +
      "  background: " + chatBgColor + ";" +
      "  scrollbar-width: thin;" +
      "  scrollbar-color: rgba(255,255,255,0.1) transparent;" +
      "}" +
      "" +
      ".s2c-messages::-webkit-scrollbar { width: 6px; }" +
      ".s2c-messages::-webkit-scrollbar-track { background: transparent; }" +
      ".s2c-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }" +
      "" +
      ".s2c-message {" +
      "  max-width: 85%;" +
      "  padding: 14px 18px;" +
      "  font-size: 14px;" +
      "  line-height: 1.6;" +
      "  animation: s2c-message-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);" +
      "  letter-spacing: -0.01em;" +
      "}" +
      "" +
      "@keyframes s2c-message-in {" +
      "  from { opacity: 0; transform: translateY(12px) scale(0.95); }" +
      "  to { opacity: 1; transform: translateY(0) scale(1); }" +
      "}" +
      "" +
      ".s2c-message.user {" +
      "  align-self: flex-end;" +
      "  background: linear-gradient(135deg, " + userBubbleColor + " 0%, " + primaryLight + " 100%);" +
      "  color: white;" +
      "  border-radius: 20px 20px 6px 20px;" +
      "  box-shadow: 0 4px 16px " + pRgba(0.3) + ";" +
      "}" +
      "" +
      ".s2c-message.assistant {" +
      "  align-self: flex-start;" +
      "  background: " + botBubbleColor + ";" +
      "  color: #e5e7eb;" +
      "  border-radius: 20px 20px 20px 6px;" +
      "  border: 1px solid rgba(255, 255, 255, 0.06);" +
      "  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);" +
      "}" +
      "" +
      ".s2c-typing {" +
      "  display: flex;" +
      "  gap: 6px;" +
      "  padding: 16px 20px;" +
      "  align-self: flex-start;" +
      "  background: " + botBubbleColor + ";" +
      "  border-radius: 20px 20px 20px 6px;" +
      "  border: 1px solid rgba(255, 255, 255, 0.06);" +
      "}" +
      "" +
      ".s2c-typing-dot {" +
      "  width: 8px;" +
      "  height: 8px;" +
      "  background: linear-gradient(135deg, " + primaryColor + ", " + primaryLight + ");" +
      "  border-radius: 50%;" +
      "  animation: s2c-typing 1.4s ease-in-out infinite;" +
      "}" +
      ".s2c-typing-dot:nth-child(2) { animation-delay: 0.2s; }" +
      ".s2c-typing-dot:nth-child(3) { animation-delay: 0.4s; }" +
      "" +
      "@keyframes s2c-typing {" +
      "  0%, 100% { opacity: 0.3; transform: scale(0.8) translateY(0); }" +
      "  50% { opacity: 1; transform: scale(1) translateY(-4px); }" +
      "}" +
      "" +
      ".s2c-quick-replies {" +
      "  display: flex;" +
      "  flex-wrap: wrap;" +
      "  gap: 10px;" +
      "  padding: 0 20px 16px;" +
      "  background: " + chatBgColor + ";" +
      "}" +
      "" +
      ".s2c-quick-reply {" +
      "  padding: 10px 18px;" +
      "  background: " + pRgba(0.1) + ";" +
      "  border: 1px solid " + pRgba(0.3) + ";" +
      "  border-radius: 24px;" +
      "  font-size: 13px;" +
      "  color: " + primaryLight + ";" +
      "  cursor: pointer;" +
      "  transition: all 0.25s ease;" +
      "  font-weight: 600;" +
      "  letter-spacing: -0.01em;" +
      "}" +
      "" +
      ".s2c-quick-reply:hover {" +
      "  background: linear-gradient(135deg, " + primaryColor + " 0%, " + primaryLight + " 100%);" +
      "  color: white;" +
      "  border-color: transparent;" +
      "  transform: translateY(-2px);" +
      "  box-shadow: 0 4px 16px " + pRgba(0.4) + ";" +
      "}" +
      "" +
      ".s2c-quick-reply:focus-visible {" +
      "  outline: 2px solid " + primaryLight + ";" +
      "  outline-offset: 2px;" +
      "}" +
      "" +
      ".s2c-input-area {" +
      "  padding: 16px 20px calc(20px + env(safe-area-inset-bottom, 0px));" +
      "  display: flex;" +
      "  gap: 12px;" +
      "  background: linear-gradient(180deg, " + chatBgColor + " 0%, #080814 100%);" +
      "  flex-shrink: 0;" +
      "  border-top: 1px solid rgba(255, 255, 255, 0.06);" +
      "}" +
      "" +
      ".s2c-input {" +
      "  flex: 1;" +
      "  padding: 14px 20px;" +
      "  border: 1px solid rgba(255, 255, 255, 0.1);" +
      "  border-radius: 16px;" +
      "  font-size: 14px;" +
      "  outline: none;" +
      "  transition: all 0.25s ease;" +
      "  color: #f3f4f6;" +
      "  background: rgba(255, 255, 255, 0.05);" +
      "  font-weight: 500;" +
      "}" +
      "" +
      ".s2c-input:focus {" +
      "  background: rgba(255, 255, 255, 0.08);" +
      "  border-color: " + pRgba(0.5) + ";" +
      "  box-shadow: 0 0 0 3px " + pRgba(0.15) + ";" +
      "}" +
      "" +
      ".s2c-input::placeholder { color: #6b7280; }" +
      "" +
      ".s2c-send {" +
      "  width: 48px;" +
      "  height: 48px;" +
      "  border: none;" +
      "  border-radius: 16px;" +
      "  cursor: pointer;" +
      "  display: flex;" +
      "  align-items: center;" +
      "  justify-content: center;" +
      "  transition: all 0.25s ease;" +
      "  background: linear-gradient(135deg, " + primaryColor + " 0%, " + primaryLight + " 100%);" +
      "  flex-shrink: 0;" +
      "  box-shadow: 0 4px 16px " + pRgba(0.3) + ";" +
      "}" +
      "" +
      ".s2c-send:disabled {" +
      "  opacity: 0.5;" +
      "  cursor: not-allowed;" +
      "  box-shadow: none;" +
      "}" +
      "" +
      ".s2c-send:not(:disabled):hover {" +
      "  transform: scale(1.05) translateY(-1px);" +
      "  box-shadow: 0 6px 24px " + pRgba(0.45) + ";" +
      "}" +
      "" +
      ".s2c-send:not(:disabled):active {" +
      "  transform: scale(0.98);" +
      "}" +
      "" +
      ".s2c-send:focus-visible {" +
      "  outline: 2px solid white;" +
      "  outline-offset: 2px;" +
      "}" +
      "" +
      ".s2c-send svg {" +
      "  width: 20px;" +
      "  height: 20px;" +
      "  fill: white;" +
      "}" +
      "" +
      ".s2c-powered {" +
      "  padding: 12px;" +
      "  text-align: center;" +
      "  font-size: 11px;" +
      "  color: #6b7280;" +
      "  background: #080814;" +
      "  border-top: 1px solid rgba(255, 255, 255, 0.04);" +
      "}" +
      "" +
      ".s2c-powered a {" +
      "  color: " + primaryLight + ";" +
      "  text-decoration: none;" +
      "  font-weight: 600;" +
      "  transition: color 0.2s;" +
      "}" +
      "" +
      ".s2c-powered a:hover { color: " + primaryLight + "; }" +
      ".s2c-powered.hidden { display: none; }" +
      "" +
      ".s2c-link-btn {" +
      "  display: inline-flex;" +
      "  align-items: center;" +
      "  gap: 8px;" +
      "  margin-top: 12px;" +
      "  padding: 12px 24px;" +
      "  background: linear-gradient(135deg, " + primaryColor + " 0%, " + primaryLight + " 100%);" +
      "  color: white !important;" +
      "  text-decoration: none;" +
      "  border-radius: 14px;" +
      "  font-weight: 700;" +
      "  font-size: 14px;" +
      "  transition: all 0.25s ease;" +
      "  box-shadow: 0 4px 16px " + pRgba(0.35) + ";" +
      "  letter-spacing: -0.01em;" +
      "}" +
      "" +
      ".s2c-link-btn:hover {" +
      "  transform: translateY(-2px);" +
      "  box-shadow: 0 8px 24px " + pRgba(0.45) + ";" +
      "}" +
      "" +
      ".s2c-link-btn svg { width: 16px; height: 16px; }" +
      "" +
      ".s2c-sr-only {" +
      "  position: absolute;" +
      "  width: 1px;" +
      "  height: 1px;" +
      "  padding: 0;" +
      "  margin: -1px;" +
      "  overflow: hidden;" +
      "  clip: rect(0, 0, 0, 0);" +
      "  white-space: nowrap;" +
      "  border: 0;" +
      "}" +
      "" +
      ".s2c-consent {" +
      "  padding: 14px 18px;" +
      "  background: rgba(255,255,255,0.06);" +
      "  border: 1px solid rgba(255,255,255,0.1);" +
      "  border-radius: 16px;" +
      "  font-size: 12px;" +
      "  color: #9ca3af;" +
      "  line-height: 1.5;" +
      "}" +
      "" +
      ".s2c-consent-text {" +
      "  margin-bottom: 10px;" +
      "}" +
      "" +
      ".s2c-consent-btns {" +
      "  display: flex;" +
      "  gap: 8px;" +
      "}" +
      "" +
      ".s2c-consent-btn {" +
      "  flex: 1;" +
      "  padding: 8px 12px;" +
      "  border: none;" +
      "  border-radius: 10px;" +
      "  font-size: 12px;" +
      "  font-weight: 600;" +
      "  cursor: pointer;" +
      "  transition: all 0.2s ease;" +
      "}" +
      "" +
      ".s2c-consent-btn.accept {" +
      "  background: " + primaryColor + ";" +
      "  color: white;" +
      "}" +
      "" +
      ".s2c-consent-btn.accept:hover {" +
      "  filter: brightness(1.1);" +
      "}" +
      "" +
      ".s2c-consent-btn.decline {" +
      "  background: rgba(255,255,255,0.08);" +
      "  color: #9ca3af;" +
      "  border: 1px solid rgba(255,255,255,0.1);" +
      "}" +
      "" +
      ".s2c-consent-btn.decline:hover {" +
      "  background: rgba(255,255,255,0.12);" +
      "  color: #d1d5db;" +
      "}"
    );
  }

  // === ICONS ===

  var bubbleIcons = {
    chat:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/></svg>',
    message:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/><line x1="2" y1="20" x2="8" y2="14" opacity="0.5"/><line x1="22" y1="20" x2="16" y2="14" opacity="0.5"/></svg>',
    support:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/><circle cx="12" cy="12" r="2" opacity="0.4"/><path d="M12 14v3" opacity="0.4"/></svg>',
    robot:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="9" cy="14" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/><path d="M12 2v4"/><circle cx="12" cy="2" r="1" fill="currentColor"/><path d="M8 17h8" stroke-linecap="round"/><path d="M1 12h2M21 12h2" opacity="0.5"/></svg>',
    sparkle:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5 5.8 21l2.4-7.3L2 9.2h7.6L12 2z"/><circle cx="19" cy="5" r="1.5" fill="currentColor" opacity="0.6"/><circle cx="5" cy="19" r="1" fill="currentColor" opacity="0.4"/><path d="M19 2v2M18 3h2" opacity="0.5"/></svg>',
    wave:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/><path d="M17 6l2-2M19 10h2M17 14l2 2" opacity="0.4"/></svg>',
    ai:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" opacity="0.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2" opacity="0.6"/><path d="M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" opacity="0.4"/></svg>',
  };

  var closeIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  var sendIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  var arrowIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

  // === CONFIG FETCH ===

  // Retry with exponential backoff (3 attempts)
  async function fetchConfig(retries) {
    for (var i = 0; i <= retries; i++) {
      try {
        var res = await fetch(API_BASE + "/config/" + widgetKey);
        if (res.ok) {
          var cfg = await res.json();
          setCachedConfig(cfg);
          return cfg;
        }
        if (res.status >= 400 && res.status < 500) return null;
      } catch (err) {
        if (i === retries) return null;
      }
      await new Promise(function (r) {
        setTimeout(r, 1000 * Math.pow(2, i));
      });
    }
    return null;
  }

  // === INITIALIZATION ===

  async function init() {
    try {
      // Stale-while-revalidate: use cache immediately, refresh in background
      var cached = getCachedConfig();
      if (cached) {
        config = cached;
        // Background refresh — updates cache for next page load
        fetchConfig(2);
      } else {
        config = await fetchConfig(2);
      }

      if (!config) {
        console.warn("Site2CRM Chat Widget: Unable to load config");
        return;
      }

      // Create shadow host in light DOM
      container = document.createElement("div");
      container.id = "site2crm-chat-widget";
      document.body.appendChild(container);

      // Attach Shadow DOM
      shadow = container.attachShadow({ mode: "open" });

      // Load Google Fonts inside shadow root
      var fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
      shadow.appendChild(fontLink);

      // Inject styles into shadow root
      var styleEl = document.createElement("style");
      styleEl.textContent = generateStyles(config);
      shadow.appendChild(styleEl);

      createWidget();
    } catch (err) {
      console.error("Site2CRM Chat Widget: Init failed", err);
    }
  }

  // === WIDGET CREATION ===

  function createWidget() {
    var position = config.widget_position || "bottom-right";
    var iconName = config.bubble_icon || "sparkle";
    var bubbleIcon = bubbleIcons[iconName] || bubbleIcons.sparkle;
    var headerTitle = config.header_title || config.business_name;
    var headerSubtitle = config.header_subtitle || "Typically replies instantly";
    var showBranding = config.show_branding !== false;

    var btnShape = config.button_shape || "bubble";

    // Chat bubble (button element for accessibility)
    bubble = document.createElement("button");
    bubble.className = "s2c-bubble " + position;
    bubble.setAttribute("aria-label", "Open chat");
    if (btnShape === "pill") {
      bubble.innerHTML =
        bubbleIcon + '<span class="s2c-bubble-label">Chat</span>';
    } else if (btnShape === "bar") {
      bubble.innerHTML =
        bubbleIcon + '<span class="s2c-bubble-label">Chat with us</span>';
    } else {
      bubble.innerHTML = bubbleIcon;
    }
    bubble.addEventListener("click", toggleChat);

    // Chat window
    chatWindow = document.createElement("div");
    chatWindow.className = "s2c-window " + position;
    chatWindow.setAttribute("role", "dialog");
    chatWindow.setAttribute("aria-label", escapeHtml(headerTitle) + " chat");
    chatWindow.setAttribute("aria-hidden", "true");

    var quickRepliesHtml = "";
    if (config.quick_replies && config.quick_replies.length > 0) {
      quickRepliesHtml =
        '<div class="s2c-quick-replies">' +
        config.quick_replies
          .map(function (reply) {
            return (
              '<button class="s2c-quick-reply">' +
              escapeHtml(reply) +
              "</button>"
            );
          })
          .join("") +
        "</div>";
    }

    var brandingHtml = showBranding
      ? '<div class="s2c-powered">Powered by <a href="https://site2crm.io" target="_blank" rel="noopener">Site2CRM</a></div>'
      : '<div class="s2c-powered hidden"></div>';

    chatWindow.innerHTML =
      '<div class="s2c-header">' +
      '  <div class="s2c-header-info">' +
      '    <div class="s2c-header-title">' +
      '      <span class="s2c-status-dot" aria-hidden="true"></span>' +
      "      " + escapeHtml(headerTitle) +
      "    </div>" +
      (headerSubtitle
        ? '    <div class="s2c-header-subtitle">' +
          escapeHtml(headerSubtitle) +
          "</div>"
        : "") +
      "  </div>" +
      '  <button class="s2c-close" aria-label="Close chat">' +
      closeIcon +
      "</button>" +
      "</div>" +
      '<div class="s2c-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>' +
      quickRepliesHtml +
      '<div class="s2c-input-area">' +
      '  <input type="text" class="s2c-input" placeholder="Type your message..." aria-label="Type your message" />' +
      '  <button class="s2c-send" aria-label="Send message">' +
      sendIcon +
      "</button>" +
      "</div>" +
      brandingHtml;

    messagesContainer = chatWindow.querySelector(".s2c-messages");
    inputField = chatWindow.querySelector(".s2c-input");
    sendBtn = chatWindow.querySelector(".s2c-send");
    quickRepliesContainer = chatWindow.querySelector(".s2c-quick-replies");
    var closeBtn = chatWindow.querySelector(".s2c-close");

    closeBtn.addEventListener("click", toggleChat);
    sendBtn.addEventListener("click", sendMessage);
    inputField.addEventListener("keypress", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (quickRepliesContainer) {
      quickRepliesContainer
        .querySelectorAll(".s2c-quick-reply")
        .forEach(function (btn) {
          btn.addEventListener("click", function () {
            inputField.value = btn.textContent;
            sendMessage();
            quickRepliesContainer.style.display = "none";
          });
        });
    }

    // Append to shadow root (not document.body)
    shadow.appendChild(bubble);
    shadow.appendChild(chatWindow);

    // Accessibility: keyboard handling
    setupAccessibility(closeBtn);

    // iOS keyboard: adjust chat window when virtual keyboard opens
    setupIOSKeyboardHandler();

    // Set initial visibility and start watching SPA route changes
    updateVisibility();
    watchRouteChanges();

    if (config.greeting) {
      addMessage("assistant", config.greeting);
    }

    // GDPR consent banner — show if user hasn't decided yet
    if (gdprConsent === null) {
      showConsentBanner();
    }
  }

  // === GDPR CONSENT BANNER ===

  function showConsentBanner() {
    var banner = document.createElement("div");
    banner.className = "s2c-consent";
    banner.setAttribute("role", "alert");
    banner.innerHTML =
      '<div class="s2c-consent-text">This chat uses cookies and local storage to remember your session. You can decline and still chat anonymously.</div>' +
      '<div class="s2c-consent-btns">' +
      '  <button class="s2c-consent-btn accept">Accept</button>' +
      '  <button class="s2c-consent-btn decline">Decline</button>' +
      '</div>';

    messagesContainer.appendChild(banner);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    banner.querySelector(".accept").addEventListener("click", function () {
      gdprConsent = "1";
      safeLSSet("s2c_gdpr_consent", "1");
      banner.remove();
    });

    banner.querySelector(".decline").addEventListener("click", function () {
      gdprConsent = "0";
      safeLSSet("s2c_gdpr_consent", "0");
      // Clear any existing session data
      safeStorage("set", "s2c_chat_session", "");
      banner.remove();
    });
  }

  // === ACCESSIBILITY ===

  function setupAccessibility(closeBtn) {
    // Escape key closes chat from anywhere in shadow
    shadow.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        toggleChat();
        bubble.focus();
      }
    });

    // Focus trap: Tab cycles through focusable elements in chat window
    chatWindow.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;

      var focusable = chatWindow.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (shadow.activeElement === first || e.target === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: wrap from last to first
        if (shadow.activeElement === last || e.target === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // === iOS KEYBOARD HANDLING ===

  function setupIOSKeyboardHandler() {
    // visualViewport API detects iOS keyboard open/close
    if (!window.visualViewport) return;

    var initialHeight = window.visualViewport.height;

    window.visualViewport.addEventListener("resize", function () {
      if (!isOpen || !chatWindow) return;

      var keyboardHeight = initialHeight - window.visualViewport.height;
      if (keyboardHeight > 100) {
        // Keyboard is open — shift chat window up
        chatWindow.style.transform = "translateY(-" + keyboardHeight + "px)";
        chatWindow.style.maxHeight = window.visualViewport.height - 80 + "px";
      } else {
        // Keyboard closed — reset
        chatWindow.style.transform = "";
        chatWindow.style.maxHeight = "";
      }
    });
  }

  // === CHAT FUNCTIONALITY ===

  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle("open", isOpen);
    chatWindow.setAttribute("aria-hidden", String(!isOpen));
    bubble.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
    bubble.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      inputField.focus();
    }
  }

  function addMessage(role, content) {
    messages.push({ role: role, content: content });

    var msgEl = document.createElement("div");
    msgEl.className = "s2c-message " + role;
    msgEl.setAttribute("role", "listitem");

    if (role === "assistant") {
      msgEl.innerHTML = formatMessageWithLinks(content);
    } else {
      msgEl.textContent = content;
    }

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function formatMessageWithLinks(text) {
    function getButtonText(url) {
      var lowerUrl = url.toLowerCase();
      if (lowerUrl.includes("/signup") || lowerUrl.includes("/register"))
        return "Sign Up Free";
      if (lowerUrl.includes("/pricing")) return "View Pricing";
      if (
        lowerUrl.includes("/demo") ||
        lowerUrl.includes("calendly") ||
        lowerUrl.includes("cal.com")
      )
        return "Book Demo";
      if (lowerUrl.includes("/trial")) return "Start Free Trial";
      if (lowerUrl.includes("/contact")) return "Contact Us";
      if (lowerUrl.includes("/schedule") || lowerUrl.includes("/book"))
        return "Schedule Now";
      if (lowerUrl.includes("/form") || lowerUrl.includes("/apply"))
        return "Fill Out Form";
      if (lowerUrl.includes("/download")) return "Download";
      if (lowerUrl.includes("/learn") || lowerUrl.includes("/docs"))
        return "Learn More";
      return "Learn More";
    }

    function ensureProtocol(url) {
      if (!/^https?:\/\//i.test(url)) return "https://" + url;
      return url;
    }

    var placeholders = [];
    function createPlaceholder(url, customText) {
      var fullUrl = ensureProtocol(url);
      var buttonText = customText || getButtonText(fullUrl);
      var buttonHtml =
        '<br><a href="' +
        fullUrl +
        '" target="_blank" rel="noopener" class="s2c-link-btn">' +
        buttonText +
        " " +
        arrowIcon +
        "</a>";
      var placeholder = "__LINK_PLACEHOLDER_" + placeholders.length + "__";
      placeholders.push(buttonHtml);
      return placeholder;
    }

    var result = text;

    // 1. Markdown links: [text](url)
    result = result.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      function (match, linkText, url) {
        return createPlaceholder(url, linkText);
      }
    );

    // 2. URLs with protocol
    result = result.replace(
      /(https?:\/\/[^\s<]+[^\s<.,;:'")\]])/gi,
      function (url) {
        return createPlaceholder(url);
      }
    );

    // 3. URLs without protocol (www.example.com or example.com/path)
    result = result.replace(
      /((?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|io|co|org|net|ai|app|dev)(?:\/[^\s<]*[^\s<.,;:'")\]])?)/gi,
      function (match) {
        if (match.includes("@")) return match;
        return createPlaceholder(match);
      }
    );

    // Escape HTML on text (placeholders are safe tokens)
    result = escapeHtml(result);

    // Replace placeholders with actual button HTML
    placeholders.forEach(function (html, i) {
      result = result.replace("__LINK_PLACEHOLDER_" + i + "__", html);
    });

    return result;
  }

  function showTyping() {
    var typingEl = document.createElement("div");
    typingEl.className = "s2c-typing";
    typingEl.setAttribute("data-s2c-typing", "1");
    typingEl.setAttribute("role", "status");
    typingEl.setAttribute("aria-label", "Assistant is typing");
    typingEl.innerHTML =
      '<div class="s2c-typing-dot"></div>' +
      '<div class="s2c-typing-dot"></div>' +
      '<div class="s2c-typing-dot"></div>';
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    var typingEl = messagesContainer.querySelector("[data-s2c-typing]");
    if (typingEl) typingEl.remove();
  }

  async function sendMessage() {
    var message = inputField.value.trim();
    if (!message || isLoading) return;

    // Throttle: prevent rapid sends
    var now = Date.now();
    if (now - lastSendTime < SEND_COOLDOWN) return;
    lastSendTime = now;

    if (quickRepliesContainer) {
      quickRepliesContainer.style.display = "none";
    }

    addMessage("user", message);
    inputField.value = "";
    inputField.disabled = true;
    sendBtn.disabled = true;
    isLoading = true;

    showTyping();

    // AbortController with 15s timeout
    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, 15000);

    try {
      // If consent declined, use ephemeral session and omit tracking fields
      var reqBody = { message: message };
      if (gdprConsent === "0") {
        reqBody.session_id = "s2c_ephemeral_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 6);
      } else {
        reqBody.session_id = sessionId;
        reqBody.page_url = window.location.href;
        reqBody.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      }

      var res = await fetch(
        API_BASE + "/message?widget_key=" + widgetKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      hideTyping();

      if (!res.ok) {
        throw new Error("API error");
      }

      var data = await res.json();
      addMessage("assistant", data.response);

      if (data.lead_captured) {
        console.log(
          "Site2CRM: Lead captured",
          data.captured_email || data.captured_phone
        );
      }
    } catch (err) {
      clearTimeout(timeoutId);
      hideTyping();
      if (err.name === "AbortError") {
        addMessage(
          "assistant",
          "Sorry, the response is taking too long. Please try again."
        );
      } else {
        addMessage(
          "assistant",
          "Sorry, I'm having trouble connecting. Please try again in a moment."
        );
      }
      console.error("Site2CRM Chat Widget: Send failed", err);
    } finally {
      inputField.disabled = false;
      sendBtn.disabled = false;
      isLoading = false;
      inputField.focus();
    }
  }

  // === VISIBILITY ===

  function updateVisibility() {
    if (!container) return;
    var hidden = shouldHide();
    container.style.display = hidden ? "none" : "";
    if (hidden && isOpen) {
      toggleChat();
    }
  }

  // Watch for SPA route changes (pushState, replaceState, popstate)
  function watchRouteChanges() {
    var origPushState = history.pushState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      setTimeout(updateVisibility, 50);
    };
    var origReplaceState = history.replaceState;
    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      setTimeout(updateVisibility, 50);
    };
    window.addEventListener("popstate", function () {
      setTimeout(updateVisibility, 50);
    });
  }

  // === BOOTSTRAP ===

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
