// Definition of the FutureGraph laws used to validate AI output and
// enforce therapeutic constraints between rounds.
export const FuturegraphLaws = {
  controlledFlexibility: {
    name: 'Controlled Flexibility Law',
    description:
      'Allows controlled inclusion of secondary graphological signs beyond core indicators',
    validation: (sign: any) =>
      sign.justification && sign.therapeuticRelevance,
  },
  biDirectionalTime: {
    name: 'Bi-Directional Time Law',
    description: 'Establishes influence between early and later findings',
    maxLayerDifference: 1,
  },
  oneLayerInfluence: {
    name: 'One-Layer Influence Constraint',
    description:
      'Insights may retroactively affect only one earlier layer',
    exceptions: ['consistentMarker', 'alignedVoice', 'crossValidation'],
  },
  layerSynchronization: {
    name: 'Layer Synchronization Law',
    description:
      'Deep interpretation must echo from visible layer',
  },
  dynamicIdentityAnchor: {
    name: 'Dynamic Identity Anchor',
    description: "Client's central identity updated each round",
  },
  voiceNotMask: {
    name: 'Voice ≠ Mask Principle',
    description:
      'Voice = Internal contradiction, Mask = Defense against external',
  },
  signFlexibility: {
    name: 'Sign Flexibility Principle',
    description:
      'Permits inclusion of signs if emotionally/narratively consistent',
  },
  syncBeforeTreatment: {
    name: 'Sync Products Before Treatment Law',
    description:
      'All diagnostic products must be completed before rounds 7-10',
  },
  securedVoiceDialogue: {
    name: 'Secured Voice Dialogue Law',
    description:
      'Voice valid only if rooted in mask, trauma, or therapeutic contract',
  },
  interRoundPause: {
    name: 'Inter-Round Pause Law',
    description: 'No automatic transition between rounds',
  },
  roundControl: {
    name: 'Round Control Table',
    description:
      'Evaluate conflicts, consistency, emotional load, and validity',
  },
};
