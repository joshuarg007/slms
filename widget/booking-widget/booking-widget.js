/**
 * Site2CRM Booking Widget
 * Embeddable booking widget for any website
 *
 * Usage:
 * <script src="https://api.site2crm.io/api/public/booking-widget.js"
 *         data-slug="your-booking-slug"
 *         data-button-text="Book a Meeting"
 *         data-button-color="#6366f1">
 * </script>
 */

(function() {
  'use strict';

  // Get script configuration
  const script = document.currentScript;
  const slug = script.getAttribute('data-slug');
  const buttonText = script.getAttribute('data-button-text') || 'Book a Meeting';
  const buttonColor = script.getAttribute('data-button-color') || '#6366f1';
  const position = script.getAttribute('data-position') || 'bottom-right';
  const inline = script.getAttribute('data-inline') === 'true';
  const containerId = script.getAttribute('data-container');

  if (!slug) {
    console.error('Site2CRM Booking Widget: data-slug attribute is required');
    return;
  }

  const API_BASE = script.src.replace('/api/public/booking-widget.js', '');
  const BOOKING_URL = `${API_BASE.replace('api.', '')}/book/${slug}`;

  // Styles
  const styles = `
    .s2c-booking-widget-button {
      position: fixed;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 24px;
      border: none;
      border-radius: 50px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: s2c-booking-fade-in 0.4s ease-out;
    }

    .s2c-booking-widget-button:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2), 0 4px 10px rgba(0, 0, 0, 0.1);
    }

    .s2c-booking-widget-button:active {
      transform: translateY(0) scale(0.98);
    }

    .s2c-booking-widget-button.bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .s2c-booking-widget-button.bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .s2c-booking-widget-button.top-right {
      top: 24px;
      right: 24px;
    }

    .s2c-booking-widget-button.top-left {
      top: 24px;
      left: 24px;
    }

    .s2c-booking-widget-button.inline {
      position: relative;
      display: inline-flex;
    }

    .s2c-booking-widget-button svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .s2c-booking-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s, visibility 0.3s;
    }

    .s2c-booking-modal-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .s2c-booking-modal {
      width: 100%;
      max-width: 900px;
      height: 90vh;
      max-height: 700px;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      transform: scale(0.95) translateY(20px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .s2c-booking-modal-overlay.open .s2c-booking-modal {
      transform: scale(1) translateY(0);
    }

    .s2c-booking-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .s2c-booking-modal-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .s2c-booking-modal-close {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      color: #6b7280;
      transition: background 0.2s, color 0.2s;
    }

    .s2c-booking-modal-close:hover {
      background: #e5e7eb;
      color: #111827;
    }

    .s2c-booking-modal-close svg {
      width: 20px;
      height: 20px;
    }

    .s2c-booking-iframe {
      width: 100%;
      height: calc(100% - 60px);
      border: none;
    }

    .s2c-booking-powered {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      color: #9ca3af;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .s2c-booking-powered a {
      color: #6b7280;
      text-decoration: none;
      font-weight: 500;
    }

    .s2c-booking-powered a:hover {
      color: #4f46e5;
    }

    @keyframes s2c-booking-fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .s2c-booking-widget-button:not(.inline) {
        padding: 12px 20px;
        font-size: 14px;
      }

      .s2c-booking-modal {
        max-height: none;
        height: 100%;
        border-radius: 0;
      }

      .s2c-booking-modal-overlay {
        padding: 0;
      }
    }
  `;

  // Calendar icon SVG
  const calendarIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  `;

  // Close icon SVG
  const closeIcon = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;

  // Inject styles
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  // Create button
  const button = document.createElement('button');
  button.className = `s2c-booking-widget-button ${inline ? 'inline' : position}`;
  button.style.backgroundColor = buttonColor;
  button.innerHTML = `${calendarIcon}<span>${buttonText}</span>`;

  // Create modal
  const modal = document.createElement('div');
  modal.className = 's2c-booking-modal-overlay';
  modal.innerHTML = `
    <div class="s2c-booking-modal">
      <div class="s2c-booking-modal-header">
        <h3 class="s2c-booking-modal-title">Book a Meeting</h3>
        <button class="s2c-booking-modal-close" aria-label="Close">${closeIcon}</button>
      </div>
      <iframe class="s2c-booking-iframe" src="" title="Booking Calendar"></iframe>
    </div>
  `;

  // Event handlers
  function openModal() {
    const iframe = modal.querySelector('.s2c-booking-iframe');
    if (!iframe.src) {
      iframe.src = BOOKING_URL;
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  button.addEventListener('click', openModal);
  modal.querySelector('.s2c-booking-modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  // Listen for messages from iframe (booking completed)
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 's2c-booking-complete') {
      // Optionally close modal after booking
      // closeModal();
    }
  });

  // Insert into DOM
  if (inline && containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.appendChild(button);
    } else {
      document.body.appendChild(button);
    }
  } else if (inline) {
    // Insert after the script tag
    script.parentNode.insertBefore(button, script.nextSibling);
  } else {
    document.body.appendChild(button);
  }
  document.body.appendChild(modal);

  // Expose API for programmatic control
  window.Site2CRMBooking = {
    open: openModal,
    close: closeModal,
  };

})();
