/**
 * Site2CRM AI Chat Widget
 * Embeddable chat widget powered by DeepSeek AI
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
      // Support wildcards: /app/* matches /app/anything
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
  // Customers can set: localStorage.setItem('site2crm_hide_chat', 'true') or document.cookie = 'site2crm_hide_chat=true'
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
    const id =
      "s2c_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).substr(2, 9);
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
    small: { size: 48, icon: 24 },
    medium: { size: 60, icon: 28 },
    large: { size: 72, icon: 32 },
  };

  // Generate dynamic styles based on config
  function generateStyles(cfg) {
    const primaryColor = cfg.primary_color || "#4f46e5";
    const chatBgColor = cfg.chat_bg_color || "#ffffff";
    const userBubbleColor = cfg.user_bubble_color || primaryColor;
    const botBubbleColor = cfg.bot_bubble_color || "#f3f4f6";
    const btnSize = buttonSizes[cfg.button_size] || buttonSizes.medium;

    return `
    .s2c-widget * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      margin: 0;
      padding: 0;
    }

    .s2c-bubble {
      position: fixed;
      width: ${btnSize.size}px;
      height: ${btnSize.size}px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: 999998;
      background: linear-gradient(135deg, ${primaryColor} 0%, #7c3aed 100%);
    }

    .s2c-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 25px rgba(79, 70, 229, 0.5);
    }

    .s2c-bubble svg {
      width: ${btnSize.icon}px;
      height: ${btnSize.icon}px;
      fill: white;
    }

    .s2c-bubble.bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .s2c-bubble.bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .s2c-window {
      position: fixed;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 100px);
      border-radius: 16px;
      background: white;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    .s2c-window.open {
      display: flex;
      animation: s2c-slide-up 0.3s ease;
    }

    @keyframes s2c-slide-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .s2c-window.bottom-right {
      bottom: ${btnSize.size + 35}px;
      right: 24px;
    }

    .s2c-window.bottom-left {
      bottom: ${btnSize.size + 35}px;
      left: 24px;
    }

    @media (max-width: 480px) {
      .s2c-window {
        width: calc(100vw - 20px);
        height: calc(100vh - 120px);
        bottom: ${btnSize.size + 35}px;
        right: 10px;
        left: 10px;
        border-radius: 16px;
      }
    }

    .s2c-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .s2c-header-info {
      display: flex;
      flex-direction: column;
    }

    .s2c-header-title {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .s2c-header-title::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
    }

    .s2c-header-subtitle {
      font-size: 13px;
      opacity: 0.9;
      margin-top: 2px;
      margin-left: 16px;
    }

    .s2c-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      opacity: 0.9;
      transition: all 0.2s;
    }

    .s2c-close:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 0.2);
    }

    .s2c-close svg {
      width: 18px;
      height: 18px;
      display: block;
    }

    .s2c-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: ${chatBgColor};
    }

    .s2c-message {
      max-width: 80%;
      padding: 12px 16px;
      font-size: 14px;
      line-height: 1.5;
      animation: s2c-fade-in 0.2s ease;
    }

    @keyframes s2c-fade-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .s2c-message.user {
      align-self: flex-end;
      background: ${userBubbleColor};
      color: white;
      border-radius: 16px 16px 4px 16px;
    }

    .s2c-message.assistant {
      align-self: flex-start;
      background: ${botBubbleColor};
      color: #1f2937;
      border-radius: 16px 16px 16px 4px;
    }

    .s2c-typing {
      display: flex;
      gap: 4px;
      padding: 14px 18px;
      align-self: flex-start;
      background: ${botBubbleColor};
      border-radius: 16px 16px 16px 4px;
    }

    .s2c-typing-dot {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: s2c-typing 1.2s ease-in-out infinite;
    }

    .s2c-typing-dot:nth-child(2) {
      animation-delay: 0.15s;
    }

    .s2c-typing-dot:nth-child(3) {
      animation-delay: 0.3s;
    }

    @keyframes s2c-typing {
      0%, 100% {
        opacity: 0.4;
        transform: scale(0.8);
      }
      50% {
        opacity: 1;
        transform: scale(1);
      }
    }

    .s2c-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 16px 12px;
      background: ${chatBgColor};
    }

    .s2c-quick-reply {
      padding: 8px 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 20px;
      font-size: 13px;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .s2c-quick-reply:hover {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white;
      border-color: transparent;
      transform: translateY(-1px);
    }

    .s2c-input-area {
      padding: 16px;
      display: flex;
      gap: 10px;
      background: white;
      flex-shrink: 0;
      border-top: 1px solid #f3f4f6;
    }

    .s2c-input {
      flex: 1;
      padding: 12px 18px;
      border: none;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: all 0.2s;
      color: #1f2937;
      background: #f3f4f6;
    }

    .s2c-input:focus {
      background: #e5e7eb;
    }

    .s2c-input::placeholder {
      color: #9ca3af;
    }

    .s2c-send {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      flex-shrink: 0;
    }

    .s2c-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .s2c-send:not(:disabled):hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    }

    .s2c-send svg {
      width: 18px;
      height: 18px;
      fill: white;
    }

    .s2c-powered {
      padding: 10px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      background: white;
    }

    .s2c-powered a {
      color: #6b7280;
      text-decoration: none;
      font-weight: 500;
    }

    .s2c-powered a:hover {
      color: #4f46e5;
    }

    .s2c-powered.hidden {
      display: none;
    }

    .s2c-link-btn {
      display: inline-block;
      margin-top: 10px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 24px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
    }

    .s2c-link-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
    }
  `;
  }

  // Icons - multiple options for the bubble
  const bubbleIcons = {
    chat: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.53 3.57 1.42 5.04L2 22l4.96-1.42C8.43 21.47 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.61 0-3.11-.46-4.38-1.25l-.31-.19-3.23.92.92-3.23-.19-.31A7.932 7.932 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>`,
    message: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/></svg>`,
    support: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`,
    robot: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2zm0 4.4l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4l-3.77 2.58 1-4.28-3.32-2.88 4.38-.38L12 6.4z"/></svg>`,
    wave: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l3-8H7z"/></svg>`,
  };
  const closeIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
  const sendIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  // Initialize widget
  async function init() {
    try {
      // Fetch config
      const res = await fetch(`${API_BASE}/config/${widgetKey}`);
      if (!res.ok) {
        console.warn("Site2CRM Chat Widget: Unable to load config");
        return;
      }
      config = await res.json();

      // Inject dynamic styles
      const styleEl = document.createElement("style");
      styleEl.textContent = generateStyles(config);
      document.head.appendChild(styleEl);

      // Create widget
      createWidget();
    } catch (err) {
      console.error("Site2CRM Chat Widget: Init failed", err);
    }
  }

  function createWidget() {
    const position = config.widget_position || "bottom-right";
    const primaryColor = config.primary_color || "#4f46e5";
    const iconName = config.bubble_icon || "chat";
    const bubbleIcon = bubbleIcons[iconName] || bubbleIcons.chat;
    const headerTitle = config.header_title || config.business_name;
    const headerSubtitle = config.header_subtitle || "";
    const showBranding = config.show_branding !== false;

    // Container
    container = document.createElement("div");
    container.className = "s2c-widget";

    // Bubble
    bubble = document.createElement("div");
    bubble.className = `s2c-bubble ${position}`;
    bubble.innerHTML = bubbleIcon;
    bubble.addEventListener("click", toggleChat);

    // Build header HTML
    let headerHtml = `
      <div class="s2c-header-info">
        <div class="s2c-header-title">${escapeHtml(headerTitle)}</div>
        ${headerSubtitle ? `<div class="s2c-header-subtitle">${escapeHtml(headerSubtitle)}</div>` : ""}
      </div>
      <button class="s2c-close">${closeIcon}</button>
    `;

    // Build quick replies HTML
    let quickRepliesHtml = "";
    if (config.quick_replies && config.quick_replies.length > 0) {
      quickRepliesHtml = `
        <div class="s2c-quick-replies">
          ${config.quick_replies.map(reply => `<button class="s2c-quick-reply">${escapeHtml(reply)}</button>`).join("")}
        </div>
      `;
    }

    // Build branding HTML
    const brandingHtml = showBranding
      ? `<div class="s2c-powered">Powered by <a href="https://site2crm.io" target="_blank" rel="noopener">Site2CRM</a></div>`
      : `<div class="s2c-powered hidden"></div>`;

    // Chat window
    chatWindow = document.createElement("div");
    chatWindow.className = `s2c-window ${position}`;
    chatWindow.innerHTML = `
      <div class="s2c-header">${headerHtml}</div>
      <div class="s2c-messages"></div>
      ${quickRepliesHtml}
      <div class="s2c-input-area">
        <input type="text" class="s2c-input" placeholder="Type a message..." />
        <button class="s2c-send">${sendIcon}</button>
      </div>
      ${brandingHtml}
    `;

    // Get elements
    messagesContainer = chatWindow.querySelector(".s2c-messages");
    inputField = chatWindow.querySelector(".s2c-input");
    sendBtn = chatWindow.querySelector(".s2c-send");
    quickRepliesContainer = chatWindow.querySelector(".s2c-quick-replies");
    const closeBtn = chatWindow.querySelector(".s2c-close");

    // Event listeners
    closeBtn.addEventListener("click", toggleChat);
    sendBtn.addEventListener("click", sendMessage);
    inputField.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Quick reply click handlers
    if (quickRepliesContainer) {
      quickRepliesContainer.querySelectorAll(".s2c-quick-reply").forEach((btn) => {
        btn.addEventListener("click", () => {
          inputField.value = btn.textContent;
          sendMessage();
          // Hide quick replies after use
          quickRepliesContainer.style.display = "none";
        });
      });
    }

    // Append to DOM
    container.appendChild(bubble);
    container.appendChild(chatWindow);
    document.body.appendChild(container);

    // Add initial greeting
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

    // For assistant messages, convert URLs to clickable buttons
    if (role === "assistant") {
      msgEl.innerHTML = formatMessageWithLinks(content);
    } else {
      msgEl.textContent = content;
    }

    messagesContainer.appendChild(msgEl);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function formatMessageWithLinks(text) {
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s<]+[^\s<.,;:'")\]])/g;

    // Escape HTML first
    let escaped = escapeHtml(text);

    // Replace URLs with styled buttons
    escaped = escaped.replace(urlPattern, (url) => {
      // Determine button text based on URL
      let buttonText = "Click here";
      if (url.includes("/signup")) buttonText = "Sign Up Free";
      else if (url.includes("/pricing")) buttonText = "View Pricing";
      else if (url.includes("/demo") || url.includes("calendly") || url.includes("cal.com")) buttonText = "Book Demo";
      else if (url.includes("/trial")) buttonText = "Start Free Trial";
      else if (url.includes("/contact")) buttonText = "Contact Us";

      return `<a href="${url}" target="_blank" rel="noopener" class="s2c-link-btn">${buttonText}</a>`;
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

    // Hide quick replies after first message
    if (quickRepliesContainer) {
      quickRepliesContainer.style.display = "none";
    }

    // Add user message
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
        }),
      });

      hideTyping();

      if (!res.ok) {
        throw new Error("API error");
      }

      const data = await res.json();
      addMessage("assistant", data.response);

      // Show capture notification if lead was captured
      if (data.lead_captured) {
        console.log(
          "Site2CRM: Lead captured",
          data.captured_email || data.captured_phone
        );
      }
    } catch (err) {
      hideTyping();
      addMessage(
        "assistant",
        "Sorry, I'm having trouble connecting. Please try again in a moment."
      );
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
