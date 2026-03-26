import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.tsx';

// Mock CSS imports
require.extensions['.css'] = () => {};

try {
  renderToString(React.createElement(App));
  console.log("Render successful");
} catch (e) {
  console.error("Render failed:", e);
}
