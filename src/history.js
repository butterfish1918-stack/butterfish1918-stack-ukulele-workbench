/** Bounded in-memory edit history for a single score document.
 * Snapshots intentionally do not enter JSON backups; saving a new score clears the stack.
 */
import {validateScore} from './score.js';

export function createHistory(score, limit=60) {
  validateScore(score);
  if (!Number.isInteger(limit) || limit<1 || limit>200) throw new Error('Invalid history limit');
  return {past:[],current:structuredClone(score),future:[],limit};
}
export function canUndo(history) {return history.past.length>0;}
export function canRedo(history) {return history.future.length>0;}
export function commitHistory(history, score) {
  validateScore(score);
  if (JSON.stringify(score)===JSON.stringify(history.current)) return history;
  return {
    ...history,
    past:[...history.past, structuredClone(history.current)].slice(-history.limit),
    current:structuredClone(score), future:[]
  };
}
export function undoHistory(history) {
  if (!canUndo(history)) return history;
  return {
    ...history,
    past:history.past.slice(0,-1),
    current:structuredClone(history.past.at(-1)),
    future:[structuredClone(history.current),...history.future].slice(0,history.limit)
  };
}
export function redoHistory(history) {
  if (!canRedo(history)) return history;
  return {
    ...history,
    past:[...history.past,structuredClone(history.current)].slice(-history.limit),
    current:structuredClone(history.future[0]),
    future:history.future.slice(1)
  };
}
