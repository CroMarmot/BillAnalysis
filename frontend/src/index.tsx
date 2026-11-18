import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { OpenAPI } from './fastapiService/core/OpenAPI';

OpenAPI.BASE = 'http://127.0.0.1:5000';

createRoot(document.getElementById('root')!).render(<App />);

reportWebVitals();
