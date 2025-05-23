// popup.js
document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const colorDisplay = document.getElementById('colorDisplay');
  const hexInput = document.getElementById('hexInput');
  const rgbInput = document.getElementById('rgbInput');
  const hslInput = document.getElementById('hslInput');
  const cmykInput = document.getElementById('cmykInput');
  const pickButton = document.getElementById('pickButton');
  const copyHexButton = document.getElementById('copyHex');
  const copyRgbButton = document.getElementById('copyRgb');
  const messageDiv = document.getElementById('message');
  const colorHistory = document.getElementById('colorHistory');
  const clearHistoryButton = document.getElementById('clearHistory');
  const themeToggle = document.querySelector('.theme-toggle');
  const colorDetails = document.getElementById('colorDetails');

  let currentColor = '#ffffff';

  // Load theme preference
  chrome.storage.local.get(['darkMode'], function(result) {
      if (result.darkMode) {
          document.body.classList.add('dark-mode');
          themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      }
  });

  // Theme toggle
  themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDarkMode = document.body.classList.contains('dark-mode');
      themeToggle.innerHTML = isDarkMode ? 
          '<i class="fas fa-sun"></i>' : 
          '<i class="fas fa-moon"></i>';
      chrome.storage.local.set({ darkMode: isDarkMode });
  });

  // Color conversion functions
  function hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
      } : null;
  }

  function rgbToHsl(r, g, b) {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
          h = s = 0;
      } else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
          }
          h /= 6;
      }

      return {
          h: Math.round(h * 360),
          s: Math.round(s * 100),
          l: Math.round(l * 100)
      };
  }

  function rgbToCmyk(r, g, b) {
      if (r === 0 && g === 0 && b === 0) {
          return { c: 0, m: 0, y: 0, k: 100 };
      }

      let c = 1 - (r / 255);
      let m = 1 - (g / 255);
      let y = 1 - (b / 255);
      let k = Math.min(c, m, y);

      c = Math.round(((c - k) / (1 - k)) * 100);
      m = Math.round(((m - k) / (1 - k)) * 100);
      y = Math.round(((y - k) / (1 - k)) * 100);
      k = Math.round(k * 100);

      return { c, m, y, k };
  }

  function calculateColorBrightness(r, g, b) {
      return Math.round(((r * 299) + (g * 587) + (b * 114)) / 1000);
  }

  function updateColorDetails(rgb) {
      const brightness = calculateColorBrightness(rgb.r, rgb.g, rgb.b);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      document.getElementById('brightness').textContent = `${brightness}%`;
      document.getElementById('saturation').textContent = `${hsl.s}%`;
      // Calculate contrast ratio with white
      const contrast = Math.round((brightness / 255) * 100);
      document.getElementById('contrast').textContent = `${contrast}%`;
  }

  function updateColor(color) {
      currentColor = color;
      colorDisplay.style.backgroundColor = color;
      
      // Update all color formats
      const rgb = hexToRgb(color);
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

      hexInput.value = color;
      rgbInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      hslInput.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      cmykInput.value = `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`;

      updateColorDetails(rgb);
  }

  async function startColorPicker() {
      try {
          const eyeDropper = new EyeDropper();
          const result = await eyeDropper.open();
          updateColor(result.sRGBHex);
          saveToHistory(result.sRGBHex);
          colorDisplay.classList.add('pulse');
          setTimeout(() => colorDisplay.classList.remove('pulse'), 500);
      } catch (err) {
          showMessage('Color picking cancelled');
      }
  }

  function showMessage(text, type = 'success') {
      messageDiv.style.opacity = '1';
      messageDiv.style.background = type === 'success' ? 'rgba(0,0,0,0.8)' : 'rgba(255,0,0,0.8)';
      messageDiv.textContent = text;
      setTimeout(() => messageDiv.style.opacity = '0', 2000);
  }

  async function copyToClipboard(text) {
      try {
          await navigator.clipboard.writeText(text);
          showMessage('Copied to clipboard!');
      } catch (err) {
          showMessage('Failed to copy', 'error');
      }
  }

  function saveToHistory(color) {
      chrome.storage.local.get(['colorHistory'], function(result) {
          let history = result.colorHistory || [];
          if (!history.includes(color)) {
              history.unshift(color);
              if (history.length > 15) history.pop();
              chrome.storage.local.set({ colorHistory: history });
              displayColorHistory(history);
          }
      });
  }

  function displayColorHistory(history) {
      colorHistory.innerHTML = '';
      history.forEach(color => {
          const div = document.createElement('div');
          div.className = 'history-color';
          div.style.backgroundColor = color;
          div.title = color;
          div.addEventListener('click', () => {
              updateColor(color);
              div.classList.add('pulse');
              setTimeout(() => div.classList.remove('pulse'), 500);
          });
          colorHistory.appendChild(div);
      });
  }

  // Load color history
  chrome.storage.local.get(['colorHistory'], function(result) {
      const history = result.colorHistory || [];
      displayColorHistory(history);
  });

  // Event Listeners
  pickButton.addEventListener('click', startColorPicker);
  copyHexButton.addEventListener('click', () => copyToClipboard(hexInput.value));
  copyRgbButton.addEventListener('click', () => copyToClipboard(rgbInput.value));
  clearHistoryButton.addEventListener('click', () => {
      chrome.storage.local.set({ colorHistory: [] });
      displayColorHistory([]);
      showMessage('History cleared');
  });

  // Show color details on hover
  colorDisplay.addEventListener('mouseenter', () => {
      colorDetails.style.display = 'block';
  });

  colorDisplay.addEventListener('mouseleave', () => {
      colorDetails.style.display = 'none';
  });

  // Make all color inputs clickable for copying
  document.querySelectorAll('.color-input').forEach(input => {
      input.addEventListener('click', () => copyToClipboard(input.value));
  });
});
