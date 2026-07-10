export const AntiDetectionScripts = {
  canvasFingerprint: () => {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    const noise = () => Math.random() * 0.0001;

    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += noise();
          imageData.data[i + 1] += noise();
          imageData.data[i + 2] += noise();
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, args);
    };

    HTMLCanvasElement.prototype.toBlob = function(...args) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += noise();
          imageData.data[i + 1] += noise();
          imageData.data[i + 2] += noise();
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToBlob.apply(this, args);
    };

    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = originalGetImageData.apply(this, args);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] += noise();
        imageData.data[i + 1] += noise();
        imageData.data[i + 2] += noise();
      }
      return imageData;
    };
  },

  webglFingerprint: () => {
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      const noise = Math.random() * 0.0001;
      if (param === 37445) {
        return 'Intel Inc.';
      }
      if (param === 37446) {
        return 'Intel Iris OpenGL Engine';
      }
      const result = getParameter.call(this, param);
      if (typeof result === 'number') {
        return result + noise;
      }
      return result;
    };

    const getSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
    WebGLRenderingContext.prototype.getSupportedExtensions = function() {
      const extensions = getSupportedExtensions.call(this);
      return extensions.slice(0, Math.floor(extensions.length * 0.9));
    };
  },

  audioFingerprint: () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const originalCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function() {
      const oscillator = originalCreateOscillator.call(this);
      const originalStart = oscillator.start;
      oscillator.start = function(when) {
        const noise = Math.random() * 0.001;
        return originalStart.call(this, when + noise);
      };
      return oscillator;
    };
  },

  webrtcProtection: () => {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = function() {
      return Promise.reject(new Error('Permission denied'));
    };

    if (window.RTCPeerConnection) {
      const OriginalRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function(config) {
        if (config && config.iceServers) {
          config.iceServers = [];
        }
        return new OriginalRTCPeerConnection(config);
      };
    }
  },

  pluginsAndMimeTypes: () => {
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' }
      ]
    });

    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => [
        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
      ]
    });
  },

  chromeRuntime: () => {
    if (!window.chrome) {
      window.chrome = {};
    }
    if (!window.chrome.runtime) {
      window.chrome.runtime = {};
    }
  },

  permissions: () => {
    const originalQuery = navigator.permissions.query;
    navigator.permissions.query = function(parameters) {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'denied' });
      }
      return originalQuery.call(navigator.permissions, parameters);
    };
  },

  hardwareConcurrency: (cores = 8) => {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => cores
    });
  },

  deviceMemory: (memory = 8) => {
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => memory
    });
  },

  screenResolution: (width = 1920, height = 1080) => {
    Object.defineProperty(screen, 'width', { get: () => width });
    Object.defineProperty(screen, 'height', { get: () => height });
    Object.defineProperty(screen, 'availWidth', { get: () => width });
    Object.defineProperty(screen, 'availHeight', { get: () => height - 40 });
  },

  timezoneSpoof: (timezone = 'America/New_York') => {
    const DateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(...args) {
      if (!args[1]) args[1] = {};
      args[1].timeZone = timezone;
      return new DateTimeFormat(...args);
    };

    Date.prototype.getTimezoneOffset = function() {
      return -300;
    };
  },

  batteryAPI: () => {
    if (navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1
      });
    }
  },

  languagesSpoof: (languages = ['en-US', 'en']) => {
    Object.defineProperty(navigator, 'languages', {
      get: () => languages
    });
    Object.defineProperty(navigator, 'language', {
      get: () => languages[0]
    });
  }
};

export function getAntiDetectionScript(config = {}) {
  const scripts = [];

  if (config.canvasNoiseEnabled !== false) {
    scripts.push(`(${AntiDetectionScripts.canvasFingerprint.toString()})();`);
  }

  if (config.webglNoiseEnabled !== false) {
    scripts.push(`(${AntiDetectionScripts.webglFingerprint.toString()})();`);
  }

  if (config.audioNoiseEnabled !== false) {
    scripts.push(`(${AntiDetectionScripts.audioFingerprint.toString()})();`);
  }

  if (config.webrtcProtection !== false) {
    scripts.push(`(${AntiDetectionScripts.webrtcProtection.toString()})();`);
  }

  scripts.push(`(${AntiDetectionScripts.pluginsAndMimeTypes.toString()})();`);
  scripts.push(`(${AntiDetectionScripts.chromeRuntime.toString()})();`);
  scripts.push(`(${AntiDetectionScripts.permissions.toString()})();`);
  scripts.push(`(${AntiDetectionScripts.batteryAPI.toString()})();`);

  if (config.hardwareConcurrency) {
    scripts.push(`(${AntiDetectionScripts.hardwareConcurrency.toString()})(${config.hardwareConcurrency});`);
  }

  if (config.deviceMemory) {
    scripts.push(`(${AntiDetectionScripts.deviceMemory.toString()})(${config.deviceMemory});`);
  }

  if (config.screenWidth && config.screenHeight) {
    scripts.push(`(${AntiDetectionScripts.screenResolution.toString()})(${config.screenWidth}, ${config.screenHeight});`);
  }

  if (config.timezone) {
    scripts.push(`(${AntiDetectionScripts.timezoneSpoof.toString()})('${config.timezone}');`);
  }

  if (config.languages) {
    scripts.push(`(${AntiDetectionScripts.languagesSpoof.toString()})(${JSON.stringify(config.languages)});`);
  }

  return scripts.join('\n');
}

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
];

export function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function generateRandomFingerprint() {
  const cores = [4, 8, 12, 16][Math.floor(Math.random() * 4)];
  const memory = [4, 8, 16][Math.floor(Math.random() * 3)];
  const resolutions = [
    [1920, 1080],
    [2560, 1440],
    [1366, 768],
    [1536, 864]
  ];
  const [width, height] = resolutions[Math.floor(Math.random() * resolutions.length)];

  const timezones = [
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/London',
    'Europe/Paris'
  ];
  const timezone = timezones[Math.floor(Math.random() * timezones.length)];

  return {
    hardwareConcurrency: cores,
    deviceMemory: memory,
    screenWidth: width,
    screenHeight: height,
    timezone,
    languages: ['en-US', 'en']
  };
}
