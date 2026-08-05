import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Sin StrictMode: su doble montaje (solo en desarrollo) deja el panZoom de
// React Flow 12 enganchado a un DOM desmontado y rompe fitView/zoom
// programático en los grafos. En producción nunca hubo doble montaje.
createRoot(document.getElementById('root')!).render(<App />);
