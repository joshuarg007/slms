/**
 * Site2CRM AI Chat Widget
 * Embeddable chat widget powered by DeepSeek AI
 * Next-Gen Design v2.0
 *
 * Usage:
 * <script src="https://api.site2crm.io/api/public/chat-widget/widget.js" data-widget-key="YOUR_KEY" async></script>
 */
(function () {
  "use strict";

  // Get script configuration
  const script = document.currentScript;
  const widgetKey = script?.getAttribute("data-widget-key");

  if (!widgetKey) {
    console.error("Site2CRM Chat Widget: Missing data-widget-key attribute");
    return;
  }

  // Parse excluded paths (comma-separated list or glob patterns)
  const excludePathsAttr = script?.getAttribute("data-exclude-paths");
  const excludePatterns = excludePathsAttr ? excludePathsAttr.split(",").map(p => p.trim()) : [];

  function isExcludedPath(path) {
    for (const pattern of excludePatterns) {
      if (pattern.endsWith("*")) {
        if (path.startsWith(pattern.slice(0, -1))) return true;
      } else if (path === pattern) {
        return true;
      }
    }
    return false;
  }

  function isHiddenByAuth() {
    return localStorage.getItem("site2crm_hide_chat") === "true" ||
           document.cookie.includes("site2crm_hide_chat=true");
  }

  function shouldHide() {
    return isExcludedPath(window.location.pathname) || isHiddenByAuth();
  }

  // API base URL
  const API_BASE = "https://api.site2crm.io/api/public/chat-widget";

  // Generate session ID
  function generateSessionId() {
    const stored = sessionStorage.getItem("s2c_chat_session");
    if (stored) return stored;
    const id = "s2c_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem("s2c_chat_session", id);
    return id;
  }

  const sessionId = generateSessionId();

  // State
  let isOpen = false;
  let isLoading = false;
  let config = null;
  let messages = [];

  // DOM elements
  let container, bubble, chatWindow, messagesContainer, inputField, sendBtn, quickRepliesContainer;

  // Button sizes
  const buttonSizes = {
    small: { size: 52, icon: 26 },
    medium: { size: 64, icon: 30 },
    large: { size: 76, icon: 36 },
  };

  // Generate dynamic styles based on config
  function generateStyles(cfg) {
    const primaryColor = cfg.primary_color || "#6366f1";
    const chatBgColor = cfg.chat_bg_color || "#0f0f23";
    const userBubbleColor = cfg.user_bubble_color || primaryColor;
    const botBubbleColor = cfg.bot_bubble_color || "#1e1e3f";
    const btnSize = buttonSizes[cfg.button_size] || buttonSizes.medium;

    // Appearance config
    const buttonShape = cfg.button_shape || "bubble";
    const gradientType = cfg.gradient_type || "none";
    const gradColor1 = cfg.gradient_color_1;
    const gradColor2 = cfg.gradient_color_2;
    const gradColor3 = cfg.gradient_color_3;
    const gradientAngle = cfg.gradient_angle != null ? cfg.gradient_angle : 135;
    const buttonOpacity = cfg.button_opacity != null ? cfg.button_opacity : 1.0;
    const blurBackground = cfg.blur_background || false;
    const attentionEffect = cfg.attention_effect || "none";
    const shadowStyle = cfg.shadow_style || "elevated";
    const entryAnimation = cfg.entry_animation || "scale";

    // Hex to RGB for rgba() usage
    const hexToRgb = (hex) => {
      const h = hex.replace("#", "");
      return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
    };
    const pr = hexToRgb(primaryColor);
    const pRgba = (a) => `rgba(${pr[0]}, ${pr[1]}, ${pr[2]}, ${a})`;
    // Lighter shade for gradient secondary
    const lighten = (hex, amt) => {
      const [r,g,b] = hexToRgb(hex);
      return `rgb(${Math.min(255,r+amt)}, ${Math.min(255,g+amt)}, ${Math.min(255,b+amt)})`;
    };
    const primaryLight = lighten(primaryColor, 40);

    // Gradient presets (must match frontend GRADIENT_PRESETS)
    const gradientPresets = {
      sunset: ["#f97316", "#ec4899"],
      ocean: ["#06b6d4", "#3b82f6"],
      forest: ["#22c55e", "#14b8a6"],
      purple: ["#8b5cf6", "#ec4899"],
      fire: ["#ef4444", "#f97316"],
      midnight: ["#1e3a8a", "#7c3aed"],
      aurora: ["#06b6d4", "#8b5cf6", "#ec4899"],
    };

    // Bubble background
    let bubbleBg;
    if (gradientType === "none") {
      bubbleBg = primaryColor;
    } else if (gradientType === "custom") {
      const colors = [gradColor1, gradColor2, gradColor3].filter(Boolean);
      bubbleBg = colors.length > 1
        ? `linear-gradient(${gradientAngle}deg, ${colors.join(", ")})`
        : primaryColor;
    } else if (gradientPresets[gradientType]) {
      bubbleBg = `linear-gradient(${gradientAngle}deg, ${gradientPresets[gradientType].join(", ")})`;
    } else {
      bubbleBg = primaryColor;
    }

    // Button shape config
    const shapeConfig = {
      bubble: { radius: "50%", width: `${btnSize.size}px`, height: `${btnSize.size}px`, layout: "icon" },
      pill: { radius: "9999px", width: `${btnSize.size * 1.8}px`, height: `${btnSize.size * 0.85}px`, layout: "icon-text" },
      square: { radius: "16px", width: `${btnSize.size}px`, height: `${btnSize.size}px`, layout: "icon" },
      tab: { radius: "12px 0 0 12px", width: `${btnSize.size * 0.7}px`, height: `${btnSize.size * 1.6}px`, layout: "icon-vertical" },
      bar: { radius: "16px 16px 0 0", width: `${btnSize.size * 3}px`, height: `${btnSize.size * 0.75}px`, layout: "icon-text" },
    };
    const shape = shapeConfig[buttonShape] || shapeConfig.bubble;

    // Shadow style
    const shadows = {
      none: "none",
      subtle: `0 4px 12px rgba(0,0,0,0.15)`,
      elevated: `0 8px 32px ${pRgba(0.4)}, 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 4px rgba(0, 0, 0, 0.1)`,
      dramatic: `0 20px 60px rgba(0,0,0,0.4), 0 8px 24px ${pRgba(0.3)}`,
      glow: `0 0 20px ${primaryColor}80, 0 0 40px ${primaryColor}40, 0 8px 32px rgba(0,0,0,0.3)`,
    };
    const bubbleShadow = shadows[shadowStyle] || shadows.elevated;
    const bubbleHoverShadow = shadowStyle === "none" ? "none"
      : shadowStyle === "glow" ? `0 0 30px ${primaryColor}90, 0 0 60px ${primaryColor}60, 0 12px 40px rgba(0,0,0,0.3)`
      : shadowStyle === "dramatic" ? `0 24px 70px rgba(0,0,0,0.5), 0 12px 32px ${pRgba(0.4)}`
      : `0 12px 40px ${pRgba(0.5)}, 0 0 0 1px rgba(255, 255, 255, 0.15) inset, 0 4px 8px rgba(0, 0, 0, 0.15)`;

    // Attention effect — applied directly to .s2c-bubble (not ::after)
    let bubbleAttentionAnimation = "";
    let attentionAfterAnimation = "none";
    let attentionKeyframes = "";
    if (attentionEffect === "pulse") {
      attentionAfterAnimation = "s2c-pulse 2s ease-out infinite";
      attentionKeyframes = `
        @keyframes s2c-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.4); opacity: 0; }
        }`;
    } else if (attentionEffect === "bounce") {
      bubbleAttentionAnimation = "animation: s2c-bounce 2s ease-in-out infinite;";
      attentionKeyframes = `
        @keyframes s2c-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }`;
    } else if (attentionEffect === "glow") {
      bubbleAttentionAnimation = "animation: s2c-glow 2s ease-in-out infinite;";
      attentionKeyframes = `
        @keyframes s2c-glow {
          0%, 100% { box-shadow: ${bubbleShadow}; }
          50% { box-shadow: 0 0 30px ${primaryColor}90, 0 0 60px ${primaryColor}50, 0 8px 32px rgba(0,0,0,0.3); }
        }`;
    } else if (attentionEffect === "shake") {
      bubbleAttentionAnimation = "animation: s2c-shake 3s ease-in-out infinite;";
      attentionKeyframes = `
        @keyframes s2c-shake {
          0%, 90%, 100% { transform: rotate(0); }
          92% { transform: rotate(-8deg); }
          94% { transform: rotate(8deg); }
          96% { transform: rotate(-6deg); }
          98% { transform: rotate(6deg); }
        }`;
    } else if (attentionEffect === "ring") {
      attentionAfterAnimation = "s2c-ring 2s ease-out infinite";
      attentionKeyframes = `
        @keyframes s2c-ring {
          0% { transform: scale(1); opacity: 0.6; box-shadow: 0 0 0 0 ${primaryColor}80; }
          100% { transform: scale(1.5); opacity: 0; box-shadow: 0 0 0 12px ${primaryColor}00; }
        }`;
    }

    // Entry animation for chat window
    let windowAnimation, windowKeyframes;
    if (entryAnimation === "fade") {
      windowAnimation = "s2c-fade-in";
      windowKeyframes = `
        @keyframes s2c-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }`;
    } else if (entryAnimation === "slide") {
      windowAnimation = "s2c-slide-in";
      windowKeyframes = `
        @keyframes s2c-slide-in {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }`;
    } else if (entryAnimation === "bounce") {
      windowAnimation = "s2c-bounce-in";
      windowKeyframes = `
        @keyframes s2c-bounce-in {
          0% { opacity: 0; transform: translateY(30px) scale(0.9); }
          50% { transform: translateY(-8px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }`;
    } else if (entryAnimation === "none") {
      windowAnimation = "none";
      windowKeyframes = "";
    } else {
      windowAnimation = "s2c-scale-in";
      windowKeyframes = `
        @keyframes s2c-scale-in {
          from { opacity: 0; transform: translateY(24px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }`;
    }

    return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    .s2c-widget * {
      box-sizing: border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
    }

    .s2c-bubble {
      position: fixed;
      width: ${shape.width};
      height: ${shape.height};
      border-radius: ${shape.radius};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      ${shape.layout === "icon-text" ? "gap: 8px;" : ""}
      ${shape.layout === "icon-vertical" ? "flex-direction: column;" : ""}
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 999998;
      background: ${bubbleBg};
      opacity: ${buttonOpacity};
      box-shadow: ${bubbleShadow};
      ${blurBackground ? "backdrop-filter: blur(10px);" : ""}
      ${bubbleAttentionAnimation}
    }

    .s2c-bubble::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: ${shape.radius};
      padding: 1px;
      background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }

    .s2c-bubble:hover {
      transform: scale(1.1) translateY(-2px);
      box-shadow: ${bubbleHoverShadow};
    }

    .s2c-bubble:active {
      transform: scale(1.05);
    }

    .s2c-bubble svg {
      width: ${btnSize.icon}px;
      height: ${btnSize.icon}px;
      color: white;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      transition: transform 0.3s ease;
    }

    .s2c-bubble .s2c-bubble-label {
      color: white;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .s2c-bubble:hover svg {
      transform: scale(1.1);
    }

    .s2c-bubble.bottom-right {
      bottom: ${buttonShape === "bar" ? "0" : "24px"};
      right: ${buttonShape === "tab" ? "0" : "24px"};
    }

    .s2c-bubble.bottom-left {
      bottom: ${buttonShape === "bar" ? "0" : "24px"};
      left: ${buttonShape === "tab" ? "0" : "24px"};
    }

    ${buttonShape === "tab" ? `
    .s2c-bubble.bottom-left {
      border-radius: 0 12px 12px 0;
    }` : ""}

    ${buttonShape === "bar" ? `
    .s2c-bubble.bottom-right,
    .s2c-bubble.bottom-left {
      right: auto;
      left: 50%;
      transform: translateX(-50%);
    }
    .s2c-bubble.bottom-right:hover,
    .s2c-bubble.bottom-left:hover {
      transform: translateX(-50%) translateY(-2px);
    }` : ""}

    /* Attention effect */
    .s2c-bubble::after {
      content: '${attentionAfterAnimation === "none" ? "" : ""}';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: ${shape.radius};
      background: inherit;
      animation: ${attentionAfterAnimation};
      z-index: -1;
      ${attentionAfterAnimation === "none" ? "display: none;" : ""}
    }

    ${attentionKeyframes}

    .s2c-window {
      position: fixed;
      width: 400px;
      height: 560px;
      max-height: calc(100vh - 100px);
      border-radius: 24px;
      background: linear-gradient(180deg, ${chatBgColor} 0%, #0a0a1a 100%);
      box-shadow:
        0 32px 64px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.08),
        0 0 80px ${pRgba(0.15)};
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
    }

    .s2c-window.open {
      display: flex;
      animation: ${windowAnimation} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    ${windowKeyframes}

    .s2c-window.bottom-right {
      bottom: ${btnSize.size + 40}px;
      right: 24px;
    }

    .s2c-window.bottom-left {
      bottom: ${btnSize.size + 40}px;
      left: 24px;
    }

    @media (max-width: 480px) {
      .s2c-window {
        width: calc(100vw - 16px);
        height: 65vh !important;
        max-height: 450px !important;
        bottom: 70px !important;
        right: 8px !important;
        left: 8px !important;
        border-radius: 20px;
      }
      .s2c-bubble {
        bottom: ${buttonShape === "bar" ? "0" : "16px"} !important;
        right: ${buttonShape === "tab" ? "0" : "16px"} !important;
      }
    }

    .s2c-header {
      padding: 20px 24px;
      background: ${bubbleBg.includes("gradient") ? bubbleBg : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%)`};
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
    }

    .s2c-header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -20%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
      pointer-events: none;
    }

    .s2c-header-info {
      display: flex;
      flex-direction: column;
      position: relative;
      z-index: 1;
    }

    .s2c-header-title {
      font-size: 17px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.02em;
    }

    .s2c-status-dot {
      width: 10px;
      height: 10px;
      background: #22c55e;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25), 0 0 12px rgba(34, 197, 94, 0.5);
      animation: s2c-status-pulse 2s ease-in-out infinite;
    }

    @keyframes s2c-status-pulse {
      0%, 100% { box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25), 0 0 12px rgba(34, 197, 94, 0.5); }
      50% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0.15), 0 0 20px rgba(34, 197, 94, 0.6); }
    }

    .s2c-header-subtitle {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 4px;
      margin-left: 20px;
      font-weight: 500;
    }

    .s2c-close {
      background: rgba(255, 255, 255, 0.15);
      border: none;
      color: white;
      cursor: pointer;
      padding: 8px;
      border-radius: 12px;
      transition: all 0.2s ease;
      position: relative;
      z-index: 1;
      backdrop-filter: blur(10px);
    }

    .s2c-close:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: scale(1.05);
    }

    .s2c-close svg {
      width: 18px;
      height: 18px;
      display: block;
    }

    .s2c-messages {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: ${chatBgColor};
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }

    .s2c-messages::-webkit-scrollbar {
      width: 6px;
    }

    .s2c-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .s2c-messages::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
    }

    .s2c-message {
      max-width: 85%;
      padding: 14px 18px;
      font-size: 14px;
      line-height: 1.6;
      animation: s2c-message-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      letter-spacing: -0.01em;
    }

    @keyframes s2c-message-in {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .s2c-message.user {
      align-self: flex-end;
      background: linear-gradient(135deg, ${userBubbleColor} 0%, ${primaryLight} 100%);
      color: white;
      border-radius: 20px 20px 6px 20px;
      box-shadow: 0 4px 16px ${pRgba(0.3)};
    }

    .s2c-message.assistant {
      align-self: flex-start;
      background: ${botBubbleColor};
      color: #e5e7eb;
      border-radius: 20px 20px 20px 6px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .s2c-typing {
      display: flex;
      gap: 6px;
      padding: 16px 20px;
      align-self: flex-start;
      background: ${botBubbleColor};
      border-radius: 20px 20px 20px 6px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .s2c-typing-dot {
      width: 8px;
      height: 8px;
      background: linear-gradient(135deg, ${primaryColor}, ${primaryLight});
      border-radius: 50%;
      animation: s2c-typing 1.4s ease-in-out infinite;
    }

    .s2c-typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .s2c-typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes s2c-typing {
      0%, 100% {
        opacity: 0.3;
        transform: scale(0.8) translateY(0);
      }
      50% {
        opacity: 1;
        transform: scale(1) translateY(-4px);
      }
    }

    .s2c-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 0 20px 16px;
      background: ${chatBgColor};
    }

    .s2c-quick-reply {
      padding: 10px 18px;
      background: ${pRgba(0.1)};
      border: 1px solid ${pRgba(0.3)};
      border-radius: 24px;
      font-size: 13px;
      color: ${primaryLight};
      cursor: pointer;
      transition: all 0.25s ease;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .s2c-quick-reply:hover {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%);
      color: white;
      border-color: transparent;
      transform: translateY(-2px);
      box-shadow: 0 4px 16px ${pRgba(0.4)};
    }

    .s2c-input-area {
      padding: 16px 20px 20px;
      display: flex;
      gap: 12px;
      background: linear-gradient(180deg, ${chatBgColor} 0%, #080814 100%);
      flex-shrink: 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .s2c-input {
      flex: 1;
      padding: 14px 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      font-size: 14px;
      outline: none;
      transition: all 0.25s ease;
      color: #f3f4f6;
      background: rgba(255, 255, 255, 0.05);
      font-weight: 500;
    }

    .s2c-input:focus {
      background: rgba(255, 255, 255, 0.08);
      border-color: ${pRgba(0.5)};
      box-shadow: 0 0 0 3px ${pRgba(0.15)};
    }

    .s2c-input::placeholder {
      color: #6b7280;
    }

    .s2c-send {
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.25s ease;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%);
      flex-shrink: 0;
      box-shadow: 0 4px 16px ${pRgba(0.3)};
    }

    .s2c-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .s2c-send:not(:disabled):hover {
      transform: scale(1.05) translateY(-1px);
      box-shadow: 0 6px 24px ${pRgba(0.45)};
    }

    .s2c-send:not(:disabled):active {
      transform: scale(0.98);
    }

    .s2c-send svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .s2c-powered {
      padding: 12px;
      text-align: center;
      font-size: 11px;
      color: #6b7280;
      background: #080814;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .s2c-powered a {
      color: ${primaryLight};
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }

    .s2c-powered a:hover {
      color: ${primaryLight};
    }

    .s2c-powered.hidden {
      display: none;
    }

    .s2c-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 12px 24px;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 14px;
      font-weight: 700;
      font-size: 14px;
      transition: all 0.25s ease;
      box-shadow: 0 4px 16px ${pRgba(0.35)};
      letter-spacing: -0.01em;
    }

    .s2c-link-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px ${pRgba(0.45)};
    }

    .s2c-link-btn svg {
      width: 16px;
      height: 16px;
    }
  `;
  }

  // Icons — match dashboard previews exactly
  const bubbleIcons = {
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/>
    </svg>`,
    message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
      <line x1="2" y1="20" x2="8" y2="14" opacity="0.5"/><line x1="22" y1="20" x2="16" y2="14" opacity="0.5"/>
    </svg>`,
    support: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
      <circle cx="12" cy="12" r="2" opacity="0.4"/><path d="M12 14v3" opacity="0.4"/>
    </svg>`,
    robot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="2"/>
      <circle cx="9" cy="14" r="1.5" fill="currentColor"/><circle cx="15" cy="14" r="1.5" fill="currentColor"/>
      <path d="M12 2v4"/><circle cx="12" cy="2" r="1" fill="currentColor"/>
      <path d="M8 17h8" stroke-linecap="round"/>
      <path d="M1 12h2M21 12h2" opacity="0.5"/>
    </svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5 5.8 21l2.4-7.3L2 9.2h7.6L12 2z"/>
      <circle cx="19" cy="5" r="1.5" fill="currentColor" opacity="0.6"/>
      <circle cx="5" cy="19" r="1" fill="currentColor" opacity="0.4"/>
      <path d="M19 2v2M18 3h2" opacity="0.5"/>
    </svg>`,
    wave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>
      <path d="M17 6l2-2M19 10h2M17 14l2 2" opacity="0.4"/>
    </svg>`,
    ai: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="4" opacity="0.5"/>
      <circle cx="12" cy="12" r="1" fill="currentColor"/>
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" opacity="0.6"/>
      <path d="M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" opacity="0.4"/>
    </svg>`,
  };

  const closeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const sendIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

  const arrowIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

  // Initialize widget
  async function init() {
    try {
      const res = await fetch(`${API_BASE}/config/${widgetKey}`);
      if (!res.ok) {
        console.warn("Site2CRM Chat Widget: Unable to load config");
        return;
      }
      config = await res.json();

      const styleEl = document.createElement("style");
      styleEl.textContent = generateStyles(config);
      document.head.appendChild(styleEl);

      createWidget();
    } catch (err) {
      console.error("Site2CRM Chat Widget: Init failed", err);
    }
  }

  function createWidget() {
    const position = config.widget_position || "bottom-right";
    const iconName = config.bubble_icon || "sparkle";
    const bubbleIcon = bubbleIcons[iconName] || bubbleIcons.sparkle;
    const headerTitle = config.header_title || config.business_name;
    const headerSubtitle = config.header_subtitle || "Typically replies instantly";
    const showBranding = config.show_branding !== false;

    container = document.createElement("div");
    container.className = "s2c-widget";
    container.id = "site2crm-chat-widget";

    const btnShape = config.button_shape || "bubble";
    bubble = document.createElement("div");
    bubble.className = `s2c-bubble ${position}`;
    if (btnShape === "pill") {
      bubble.innerHTML = `${bubbleIcon}<span class="s2c-bubble-label">Chat</span>`;
    } else if (btnShape === "bar") {
      bubble.innerHTML = `${bubbleIcon}<span class="s2c-bubble-label">Chat with us</span>`;
    } else {
      bubble.innerHTML = bubbleIcon;
    }
    bubble.addEventListener("click", toggleChat);

    let headerHtml = `
      <div class="s2c-header-info">
        <div class="s2c-header-title">
          <span class="s2c-status-dot"></span>
          ${escapeHtml(headerTitle)}
        </div>
        ${headerSubtitle ? `<div class="s2c-header-subtitle">${escapeHtml(headerSubtitle)}</div>` : ""}
      </div>
      <button class="s2c-close">${closeIcon}</button>
    `;

    let quickRepliesHtml = "";
    if (config.quick_replies && config.quick_replies.length > 0) {
      quickRepliesHtml = `
        <div class="s2c-quick-replies">
          ${config.quick_replies.map(reply => `<button class="s2c-quick-reply">${escapeHtml(reply)}</button>`).join("")}
        </div>
      `;
    }

    const brandingHtml = showBranding
      ? `<div class="s2c-powered">Powered by <a href="https://site2crm.io" target="_blank" rel="noopener">Site2CRM</a></div>`
      : `<div class="s2c-powered hidden"></div>`;

    chatWindow = document.createElement("div");
    chatWindow.className = `s2c-window ${position}`;
    chatWindow.innerHTML = `
      <div class="s2c-header">${headerHtml}</div>
      <div class="s2c-messages"></div>
      ${quickRepliesHtml}
      <div class="s2c-input-area">
        <input type="text" class="s2c-input" placeholder="Type your message..." />
        <button class="s2c-send">${sendIcon}</button>
      </div>
      ${brandingHtml}
    `;

    messagesContainer = chatWindow.querySelector(".s2c-messages");
    inputField = chatWindow.querySelector(".s2c-input");
    sendBtn = chatWindow.querySelector(".s2c-send");
    quickRepliesContainer = chatWindow.querySelector(".s2c-quick-replies");
    const closeBtn = chatWindow.querySelector(".s2c-close");

    closeBtn.addEventListener("click", toggleChat);
    sendBtn.addEventListener("click", sendMessage);
    inputField.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    if (quickRepliesContainer) {
      quickRepliesContainer.querySelectorAll(".s2c-quick-reply").forEach((btn) => {
        btn.addEventListener("click", () => {
          inputField.value = btn.textContent;
          sendMessage();
          quickRepliesContainer.style.display = "none";
        });
      });
    }

    container.appendChild(bubble);
    container.appendChild(chatWindow);
    document.body.appendChild(container);

    // Set initial visibility and start watching SPA route changes
    updateVisibility();
    watchRouteChanges();

    if (config.greeting) {
      addMessage("assistant", config.greeting);
    }
  }

  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle("open", isOpen);
    if (isOpen) {
      inputField.focus();
    }
  }

  function addMessage(role, content) {
    messages.push({ role, content });

    const msgEl = document.createElement("div");
    msgEl.className = `s2c-message ${role}`;

    if (role === "assistant") {
      msgEl.innerHTML = formatMessageWithLinks(content);
    } else {
      msgEl.textContent = content;
    }

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function formatMessageWithLinks(text) {
    // Helper to get smart button text based on URL
    function getButtonText(url) {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes("/signup") || lowerUrl.includes("/register")) return "Sign Up Free";
      if (lowerUrl.includes("/pricing")) return "View Pricing";
      if (lowerUrl.includes("/demo") || lowerUrl.includes("calendly") || lowerUrl.includes("cal.com")) return "Book Demo";
      if (lowerUrl.includes("/trial")) return "Start Free Trial";
      if (lowerUrl.includes("/contact")) return "Contact Us";
      if (lowerUrl.includes("/schedule") || lowerUrl.includes("/book")) return "Schedule Now";
      if (lowerUrl.includes("/form") || lowerUrl.includes("/apply")) return "Fill Out Form";
      if (lowerUrl.includes("/download")) return "Download";
      if (lowerUrl.includes("/learn") || lowerUrl.includes("/docs")) return "Learn More";
      return "Learn More";
    }

    // Helper to ensure URL has protocol
    function ensureProtocol(url) {
      if (!/^https?:\/\//i.test(url)) {
        return "https://" + url;
      }
      return url;
    }

    // Use placeholder approach to avoid double-processing
    const placeholders = [];
    function createPlaceholder(url, customText) {
      const fullUrl = ensureProtocol(url);
      const buttonText = customText || getButtonText(fullUrl);
      const buttonHtml = `<br><a href="${fullUrl}" target="_blank" rel="noopener" class="s2c-link-btn">${buttonText} ${arrowIcon}</a>`;
      const placeholder = `__LINK_PLACEHOLDER_${placeholders.length}__`;
      placeholders.push(buttonHtml);
      return placeholder;
    }

    let result = text;

    // 1. Handle markdown links first: [text](url)
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      return createPlaceholder(url, linkText);
    });

    // 2. Handle URLs with protocol: https://example.com
    result = result.replace(/(https?:\/\/[^\s<]+[^\s<.,;:'")\]])/gi, (url) => {
      return createPlaceholder(url);
    });

    // 3. Handle URLs without protocol: www.example.com or example.com/path
    result = result.replace(/((?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|io|co|org|net|ai|app|dev)(?:\/[^\s<]*[^\s<.,;:'")\]])?)/gi, (match) => {
      // Skip emails
      if (match.includes("@")) return match;
      return createPlaceholder(match);
    });

    // Now escape HTML on the text (placeholders are safe tokens)
    result = escapeHtml(result);

    // Replace placeholders with actual button HTML
    placeholders.forEach((html, i) => {
      result = result.replace(`__LINK_PLACEHOLDER_${i}__`, html);
    });

    return result;
  }

  function showTyping() {
    const typingEl = document.createElement("div");
    typingEl.className = "s2c-typing";
    typingEl.id = "s2c-typing";
    typingEl.innerHTML = `
      <div class="s2c-typing-dot"></div>
      <div class="s2c-typing-dot"></div>
      <div class="s2c-typing-dot"></div>
    `;
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    const typingEl = document.getElementById("s2c-typing");
    if (typingEl) typingEl.remove();
  }

  async function sendMessage() {
    const message = inputField.value.trim();
    if (!message || isLoading) return;

    if (quickRepliesContainer) {
      quickRepliesContainer.style.display = "none";
    }

    addMessage("user", message);
    inputField.value = "";
    inputField.disabled = true;
    sendBtn.disabled = true;
    isLoading = true;

    showTyping();

    try {
      const res = await fetch(`${API_BASE}/message?widget_key=${widgetKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: message,
          page_url: window.location.href,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      hideTyping();

      if (!res.ok) {
        throw new Error("API error");
      }

      const data = await res.json();
      addMessage("assistant", data.response);

      if (data.lead_captured) {
        console.log("Site2CRM: Lead captured", data.captured_email || data.captured_phone);
      }
    } catch (err) {
      hideTyping();
      addMessage("assistant", "Sorry, I'm having trouble connecting. Please try again in a moment.");
      console.error("Site2CRM Chat Widget: Send failed", err);
    } finally {
      inputField.disabled = false;
      sendBtn.disabled = false;
      isLoading = false;
      inputField.focus();
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Update widget visibility based on current path and auth state
  function updateVisibility() {
    if (!container) return;
    const hidden = shouldHide();
    container.style.display = hidden ? "none" : "";
    if (hidden && isOpen) {
      toggleChat();
    }
  }

  // Watch for SPA route changes (pushState, replaceState, popstate)
  function watchRouteChanges() {
    const origPushState = history.pushState;
    history.pushState = function () {
      origPushState.apply(this, arguments);
      setTimeout(updateVisibility, 50);
    };
    const origReplaceState = history.replaceState;
    history.replaceState = function () {
      origReplaceState.apply(this, arguments);
      setTimeout(updateVisibility, 50);
    };
    window.addEventListener("popstate", () => setTimeout(updateVisibility, 50));
  }

  // Start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
