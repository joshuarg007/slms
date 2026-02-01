/**
 * Site2CRM AI Chat Widget
 * Embeddable chat widget powered by DeepSeek AI
 *
 * Usage:
 * <script src="https://api.site2crm.io/api/public/chat-widget/widget.js" data-org-key="YOUR_KEY" async></script>
 */
(function () {
  "use strict";

  // Get script configuration
  const script = document.currentScript;
  const orgKey = script?.getAttribute("data-org-key");

  if (!orgKey) {
    console.error("Site2CRM Chat Widget: Missing data-org-key attribute");
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
  let container, bubble, chatWindow, messagesContainer, inputField, sendBtn;

  // Styles
  const styles = `
    .s2c-widget * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    .s2c-bubble {
      position: fixed;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: 999998;
    }

    .s2c-bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }

    .s2c-bubble svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .s2c-bubble.bottom-right {
      bottom: 20px;
      right: 20px;
    }

    .s2c-bubble.bottom-left {
      bottom: 20px;
      left: 20px;
    }

    .s2c-window {
      position: fixed;
      width: 380px;
      height: 520px;
      max-height: calc(100vh - 100px);
      border-radius: 16px;
      background: white;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
    }

    .s2c-window.open {
      display: flex;
    }

    .s2c-window.bottom-right {
      bottom: 90px;
      right: 20px;
    }

    .s2c-window.bottom-left {
      bottom: 90px;
      left: 20px;
    }

    @media (max-width: 480px) {
      .s2c-window {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        bottom: 90px;
        right: 10px;
        left: 10px;
        border-radius: 12px;
      }
    }

    .s2c-header {
      padding: 16px 20px;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
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
    }

    .s2c-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .s2c-close:hover {
      opacity: 1;
    }

    .s2c-close svg {
      width: 20px;
      height: 20px;
    }

    .s2c-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f9fafb;
    }

    .s2c-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
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
      background: #e5e7eb;
      color: #1f2937;
      border-bottom-right-radius: 4px;
    }

    .s2c-message.assistant {
      align-self: flex-start;
      background: white;
      color: #374151;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .s2c-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      align-self: flex-start;
      background: white;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .s2c-typing-dot {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: s2c-typing 1s ease-in-out infinite;
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

    .s2c-input-area {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      background: white;
      flex-shrink: 0;
    }

    .s2c-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .s2c-input:focus {
      border-color: var(--s2c-primary, #4f46e5);
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
      transition: opacity 0.2s, transform 0.2s;
    }

    .s2c-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .s2c-send:not(:disabled):hover {
      transform: scale(1.05);
    }

    .s2c-send svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .s2c-powered {
      padding: 8px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      background: white;
      border-top: 1px solid #f3f4f6;
    }

    .s2c-powered a {
      color: #6b7280;
      text-decoration: none;
    }

    .s2c-powered a:hover {
      text-decoration: underline;
    }
  `;

  // Icons
  const chatIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>`;
  const closeIcon = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
  const sendIcon = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  // Initialize widget
  async function init() {
    try {
      // Fetch config
      const res = await fetch(`${API_BASE}/config/${orgKey}`);
      if (!res.ok) {
        console.warn("Site2CRM Chat Widget: Unable to load config");
        return;
      }
      config = await res.json();

      // Inject styles
      const styleEl = document.createElement("style");
      styleEl.textContent = styles;
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

    // Container
    container = document.createElement("div");
    container.className = "s2c-widget";
    container.style.setProperty("--s2c-primary", primaryColor);

    // Bubble
    bubble = document.createElement("div");
    bubble.className = `s2c-bubble ${position}`;
    bubble.style.background = primaryColor;
    bubble.innerHTML = chatIcon;
    bubble.addEventListener("click", toggleChat);

    // Chat window
    chatWindow = document.createElement("div");
    chatWindow.className = `s2c-window ${position}`;
    chatWindow.innerHTML = `
      <div class="s2c-header" style="background: ${primaryColor}">
        <div class="s2c-header-title">${escapeHtml(config.business_name)}</div>
        <button class="s2c-close">${closeIcon}</button>
      </div>
      <div class="s2c-messages"></div>
      <div class="s2c-input-area">
        <input type="text" class="s2c-input" placeholder="Type a message..." />
        <button class="s2c-send" style="background: ${primaryColor}">${sendIcon}</button>
      </div>
      <div class="s2c-powered">Powered by <a href="https://site2crm.io" target="_blank" rel="noopener">Site2CRM</a></div>
    `;

    // Get elements
    messagesContainer = chatWindow.querySelector(".s2c-messages");
    inputField = chatWindow.querySelector(".s2c-input");
    sendBtn = chatWindow.querySelector(".s2c-send");
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
    msgEl.textContent = content;
    messagesContainer.appendChild(msgEl);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

    // Add user message
    addMessage("user", message);
    inputField.value = "";
    inputField.disabled = true;
    sendBtn.disabled = true;
    isLoading = true;

    showTyping();

    try {
      const res = await fetch(`${API_BASE}/message?org_key=${orgKey}`, {
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
