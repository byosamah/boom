import Game from './Game.js';

const game = new Game();
window._game = game;
game.init().catch(err => {
  console.error('Failed to initialize game:', err);
  document.getElementById('loading-text').textContent = 'Error loading game. Check console.';
});
