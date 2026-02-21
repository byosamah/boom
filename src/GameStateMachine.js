export default class GameStateMachine {
  constructor() {
    this._states = {};
    this._current = null;
    this.name = null;
  }

  add(name, state) {
    this._states[name] = state;
  }

  change(name, game) {
    if (this._current?.exit) this._current.exit(game);
    this.name = name;
    this._current = this._states[name];
    if (this._current?.enter) this._current.enter(game);
  }

  update(game, dt) {
    if (this._current?.update) this._current.update(game, dt);
  }
}
