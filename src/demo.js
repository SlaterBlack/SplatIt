import { createSplatViewer } from './viewer.js';
import './style.css';

const container = document.querySelector('#splat-viewer');

createSplatViewer({
    container,
    splatUrl: 'https://sparkjs.dev/assets/splats/butterfly.spz',
    initialCamera: {
        position: [0, 0, 0],
        target: [0, 0, -3],
        fov: 60
    },
    presets: [],
    minDistance: 0.1,
    maxDistance: 100,
    background: 'linear-gradient(145deg, #101820, #1d2b37)',
    accentColor: '#84d8bd',
    autoRotate: false,
    encryptedSplat: false,
    splatTransform: {
        position: [0, 0, -3],
        quaternion: [1, 0, 0, 0]
    }
});
