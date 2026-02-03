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

  // Check for excluded paths (comma-separated list or patterns)
  const excludePaths = script?.getAttribute("data-exclude-paths");
  if (excludePaths) {
    const currentPath = window.location.pathname;
    const patterns = excludePaths.split(",").map(p => p.trim());
    for (const pattern of patterns) {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        if (currentPath.startsWith(prefix)) {
          console.log("Site2CRM Chat Widget: Hidden on excluded path", currentPath);
          return;
        }
      } else if (currentPath === pattern) {
        console.log("Site2CRM Chat Widget: Hidden on excluded path", currentPath);
        return;
      }
    }
  }

  // Check for auth cookie/localStorage - if set, hide widget
  const hideFromStorage = localStorage.getItem("site2crm_hide_chat") === "true";
  const hideFromCookie = document.cookie.includes("site2crm_hide_chat=true");
  if (hideFromStorage || hideFromCookie) {
    console.log("Site2CRM Chat Widget: Hidden for authenticated user");
    return;
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
    const gradColor1 = cfg.gradient_color_1 || primaryColor;
    const gradColor2 = cfg.gradient_color_2 || "#8b5cf6";
    const gradColor3 = cfg.gradient_color_3 || "#a855f7";
    const gradientAngle = cfg.gradient_angle != null ? cfg.gradient_angle : 135;
    const buttonOpacity = cfg.button_opacity != null ? cfg.button_opacity : 1.0;
    const blurBackground = cfg.blur_background || false;
    const attentionEffect = cfg.attention_effect || "none";
    const shadowStyle = cfg.shadow_style || "elevated";
    const entryAnimation = cfg.entry_animation || "scale";

    // Button shape → border-radius
    const shapeRadius = {
      bubble: "20px",
      circle: "50%",
      rounded: "16px",
      square: "8px",
    };
    const bubbleRadius = shapeRadius[buttonShape] || "20px";

    // Bubble background
    let bubbleBg;
    if (gradientType === "linear") {
      bubbleBg = `linear-gradient(${gradientAngle}deg, ${gradColor1} 0%, ${gradColor2} 50%, ${gradColor3} 100%)`;
    } else if (gradientType === "radial") {
      bubbleBg = `radial-gradient(circle, ${gradColor1} 0%, ${gradColor2} 50%, ${gradColor3} 100%)`;
    } else {
      bubbleBg = primaryColor;
    }

    // Shadow style
    const shadows = {
      none: "none",
      subtle: `0 2px 8px rgba(0,0,0,0.15)`,
      elevated: `0 8px 32px rgba(99, 102, 241, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 4px rgba(0, 0, 0, 0.1)`,
      glow: `0 0 20px ${primaryColor}80, 0 0 40px ${primaryColor}40, 0 8px 32px rgba(0,0,0,0.3)`,
      neon: `0 0 10px ${primaryColor}, 0 0 30px ${primaryColor}80, 0 0 60px ${primaryColor}40`,
    };
    const bubbleShadow = shadows[shadowStyle] || shadows.elevated;
    const bubbleHoverShadow = shadowStyle === "none" ? "none"
      : shadowStyle === "glow" ? `0 0 30px ${primaryColor}90, 0 0 60px ${primaryColor}60, 0 12px 40px rgba(0,0,0,0.3)`
      : shadowStyle === "neon" ? `0 0 15px ${primaryColor}, 0 0 40px ${primaryColor}90, 0 0 80px ${primaryColor}50`
      : `0 12px 40px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15) inset, 0 4px 8px rgba(0, 0, 0, 0.15)`;

    // Attention effect → animation on ::after
    let attentionAnimation = "none";
    let attentionKeyframes = "";
    if (attentionEffect === "pulse") {
      attentionAnimation = "s2c-pulse 2s ease-out infinite";
      attentionKeyframes = `
        @keyframes s2c-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.4); opacity: 0; }
        }`;
    } else if (attentionEffect === "bounce") {
      attentionAnimation = "s2c-bounce 2s ease-in-out infinite";
      attentionKeyframes = `
        @keyframes s2c-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }`;
    } else if (attentionEffect === "shake") {
      attentionAnimation = "s2c-shake 3s ease-in-out infinite";
      attentionKeyframes = `
        @keyframes s2c-shake {
          0%, 90%, 100% { transform: rotate(0); }
          92% { transform: rotate(-8deg); }
          94% { transform: rotate(8deg); }
          96% { transform: rotate(-6deg); }
          98% { transform: rotate(6deg); }
        }`;
    }

    // Entry animation for chat window
    let windowAnimation = "s2c-slide-up";
    let windowKeyframes = `
      @keyframes s2c-slide-up {
        from { opacity: 0; transform: translateY(24px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }`;
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
      width: ${btnSize.size}px;
      height: ${btnSize.size}px;
      border-radius: ${bubbleRadius};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 999998;
      background: ${bubbleBg};
      opacity: ${buttonOpacity};
      box-shadow: ${bubbleShadow};
      ${blurBackground ? "backdrop-filter: blur(10px);" : ""}
    }

    .s2c-bubble::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: ${bubbleRadius};
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
      fill: white;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      transition: transform 0.3s ease;
    }

    .s2c-bubble:hover svg {
      transform: scale(1.1);
    }

    .s2c-bubble.bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .s2c-bubble.bottom-left {
      bottom: 24px;
      left: 24px;
    }

    /* Attention effect */
    .s2c-bubble::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: ${bubbleRadius};
      background: inherit;
      animation: ${attentionAnimation};
      z-index: -1;
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
        0 0 80px rgba(99, 102, 241, 0.15);
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
        height: calc(100vh - 100px);
        bottom: 80px !important;
        right: 8px !important;
        left: 8px !important;
        border-radius: 20px;
      }
      .s2c-bubble {
        bottom: 16px !important;
        right: 16px !important;
      }
    }

    .s2c-header {
      padding: 20px 24px;
      background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 50%, #a855f7 100%);
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
      background: linear-gradient(135deg, ${userBubbleColor} 0%, #8b5cf6 100%);
      color: white;
      border-radius: 20px 20px 6px 20px;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
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
      background: linear-gradient(135deg, ${primaryColor}, #a855f7);
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
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 24px;
      font-size: 13px;
      color: #c4b5fd;
      cursor: pointer;
      transition: all 0.25s ease;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .s2c-quick-reply:hover {
      background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 100%);
      color: white;
      border-color: transparent;
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
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
      border-color: rgba(99, 102, 241, 0.5);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
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
      background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 100%);
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
    }

    .s2c-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .s2c-send:not(:disabled):hover {
      transform: scale(1.05) translateY(-1px);
      box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45);
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
      color: #a5b4fc;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s;
    }

    .s2c-powered a:hover {
      color: #c7d2fe;
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
      background: linear-gradient(135deg, ${primaryColor} 0%, #8b5cf6 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 14px;
      font-weight: 700;
      font-size: 14px;
      transition: all 0.25s ease;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
      letter-spacing: -0.01em;
    }

    .s2c-link-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.45);
    }

    .s2c-link-btn svg {
      width: 16px;
      height: 16px;
    }
  `;
  }

  // Modern Icons - Next-Gen Design
  const bubbleIcons = {
    chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>`,
    message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>`,
    support: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
    robot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 7v4"/>
      <line x1="8" y1="16" x2="8" y2="16"/>
      <line x1="16" y1="16" x2="16" y2="16"/>
    </svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
      <path d="M5 2L6 5L9 6L6 7L5 10L4 7L1 6L4 5L5 2Z" opacity="0.6"/>
      <path d="M19 14L20 17L23 18L20 19L19 22L18 19L15 18L18 17L19 14Z" opacity="0.6"/>
    </svg>`,
    wave: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"/>
      <path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-10"/>
      <path d="M14.5 17.5L4.5 15"/>
    </svg>`,
    ai: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
      <path d="M16 10v2a4 4 0 0 1-8 0v-2"/>
      <circle cx="12" cy="18" r="4"/>
      <path d="M12 14v0"/>
      <path d="M7.5 6.5L5 4"/>
      <path d="M16.5 6.5L19 4"/>
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

    bubble = document.createElement("div");
    bubble.className = `s2c-bubble ${position}`;
    bubble.innerHTML = bubbleIcon;
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
    const urlPattern = /(https?:\/\/[^\s<]+[^\s<.,;:'")\]])/g;
    let escaped = escapeHtml(text);

    escaped = escaped.replace(urlPattern, (url) => {
      let buttonText = "Learn More";
      if (url.includes("/signup")) buttonText = "Sign Up Free";
      else if (url.includes("/pricing")) buttonText = "View Pricing";
      else if (url.includes("/demo") || url.includes("calendly") || url.includes("cal.com")) buttonText = "Book Demo";
      else if (url.includes("/trial")) buttonText = "Start Free Trial";
      else if (url.includes("/contact")) buttonText = "Contact Us";

      return `<a href="${url}" target="_blank" rel="noopener" class="s2c-link-btn">${buttonText} ${arrowIcon}</a>`;
    });

    return escaped;
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

  // Start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
