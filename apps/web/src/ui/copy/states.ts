/* POETIC STATES — emptiness and errors as curator's plaques. One inviting
   line, one quiet sub-line, one ghost action. Facts and remedies, never
   blame, never a sad face. The Seal NEVER appears on errors (it certifies
   authenticity; an error is not an artifact). */

export interface StateCopy {
  /** The Fraunces line. */
  message: string;
  /** Optional quieter sub-line (caption). */
  sub?: string;
  /** Ghost action label, when a next step exists. */
  actionLabel?: string;
}

export type StateVariant =
  | 'empty-collection'
  | 'empty-museum'
  | 'no-market-results'
  | 'no-friends'
  | 'not-found'
  | 'offline'
  | 'maintenance'
  | 'error';

export const STATES: Record<StateVariant, StateCopy> = {
  'empty-collection': {
    message: 'The shelves are ready.',
    sub: 'Your first case is on Home.',
    actionLabel: 'Open your first case',
  },
  'empty-museum': {
    message: 'The curator is arranging this room.',
  },
  'no-market-results': {
    message: 'Nothing on the stalls under that filter.',
    actionLabel: 'Clear filters',
  },
  'no-friends': {
    message: 'Every museum starts with one visitor.',
    actionLabel: 'Find collectors',
  },
  'not-found': {
    message: "This room isn't in this wing.",
    actionLabel: 'Back to the gallery',
  },
  offline: {
    message: 'The connection dropped below the surface.',
    sub: 'Nothing is lost. We will pick up where you left off.',
    actionLabel: 'Retry',
  },
  maintenance: {
    message: 'The museum is closed for a short while.',
    sub: 'Nothing is lost.',
  },
  /* Generic error: fact + remedy. Feature code should interpolate the
     fact when it has one; this is the safe default. */
  error: {
    message: 'Something went wrong on our side.',
    sub: 'Your collection is safe. Try once more in a moment.',
    actionLabel: 'Try again',
  },
};
