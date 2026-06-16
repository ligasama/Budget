import { bindEvents } from "./events.js?v=budget-fix3";
import { renderApp } from "./render.js?v=budget-fix3";
import { loadState, saveState } from "./state.js?v=budget-fix3";

const stateRef = {
  current: loadState()
};

const visibleResultInfo = new Set();

function setState(nextState) {
  stateRef.current = nextState;
}

function render() {
  renderApp(stateRef.current, visibleResultInfo);
  saveState(stateRef.current);
}

bindEvents({
  stateRef,
  setState,
  render,
  visibleResultInfo
});

render();


