// Definitions for each FutureGraph round.  Used to generate prompts and
// label report sections.  The keys correspond to the round numbers.
export const RoundDefinitions: Record<
  number,
  { name: string; focus: string }
> = {
  1: {
    name: 'Visible Layer',
    focus: 'Initial impressions, obvious patterns in handwriting',
  },
  2: {
    name: 'Conscious Layer',
    focus: 'Surface patterns, conscious behaviors and choices',
  },
  3: {
    name: 'Subconscious Layer',
    focus: 'Deeper motivations, hidden desires and drives',
  },
  4: {
    name: 'Hidden Layer',
    focus: 'Core dynamics, repressed content and conflicts',
  },
  5: {
    name: 'Shadow Layer',
    focus: 'Unconscious patterns, shadow elements and projections',
  },
  6: {
    name: 'Root Layer',
    focus: 'Fundamental identity, core self and essence',
  },
  7: {
    name: 'Voice Dialogue',
    focus: 'Internal voices, sub-personalities and parts work',
  },
  8: {
    name: 'Mask Analysis',
    focus: 'Defense mechanisms, personas and protective strategies',
  },
  9: {
    name: 'Integration',
    focus: 'Synthesis of all layers into coherent understanding',
  },
  10: {
    name: 'Treatment Recommendations',
    focus: 'Therapeutic interventions and treatment planning',
  },
};
