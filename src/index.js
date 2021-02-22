import * as Tone from 'tone';
import {
  createPitchShiftedSampler,
  transpose,
  P1,
  M3,
  P4,
  P5,
} from '@generative-music/utilities';
import samples from './samples';

const primaryChord = ['C5', 'F5', 'A5', 'C6', 'D6', 'G6', 'A6'];
const secondaryChord = ['B4', 'D5', 'F5', 'G5', 'B5', 'C6', 'F6', 'G6'];

const transpositions = [-P5, -P4, -M3, P1, M3, P4, P5];
let transpositionIndex = 3;

const buildPhrase = ({ length, notes }) => {
  const phrase = [];
  let nonSequentialNotes = notes;
  for (let i = 0; i < length; i += 1) {
    const selectedNote =
      nonSequentialNotes[Math.floor(Math.random() * nonSequentialNotes.length)];
    phrase.push(selectedNote);
    nonSequentialNotes = notes.filter((note) => note !== selectedNote);
  }
  return phrase.map(transpose(transpositions[transpositionIndex]));
};

const reverb = new Tone.Reverb(15).toDestination();
reverb.generate();

createPitchShiftedSampler({
  samplesByNote: samples['vsco2-piano-mf'],
  pitchShift: -24,
}).then((sampler) => {
  sampler.connect(Tone.Destination);

  const playPhrase = ({ isFirst = false } = {}) => {
    let shouldPlayPrimary = isFirst || Math.random() < 0.5;
    if (Math.random() < 1) {
      shouldPlayPrimary = true;
      const minNextPossibleTranspositionIndex = Math.max(
        0,
        transpositionIndex - 2
      );
      const maxNextPossibleTranspositionIndex = Math.min(
        transpositions.length - 1,
        transpositionIndex + 2
      );
      transpositionIndex = Math.floor(
        Math.random() *
          (maxNextPossibleTranspositionIndex +
            1 -
            minNextPossibleTranspositionIndex) +
          minNextPossibleTranspositionIndex
      );
      console.log(transpositionIndex);
    }
    const num = Math.floor(Math.random() * 15 + 10);

    const exponent = Math.random() * 1.25 + 1;

    buildPhrase({
      length: num,
      notes: shouldPlayPrimary ? primaryChord : secondaryChord,
    }).forEach((note, i) => {
      sampler.triggerAttack(note, `+${(i / num) ** exponent * (num / 2)}`);
    });
    Tone.Transport.scheduleOnce(() => {
      playPhrase();
    }, `+${num / 2 + 7 + Math.random() * 7}`);
  };

  playPhrase({ isFirst: true });
  Tone.Transport.start();

  window.navigator.requestMIDIAccess().then((access) => {
    console.log(access);
    const inputs = Array.from(access.inputs).forEach(([name, device]) => {
      device.onmidimessage = ({ data }) => {
        const [command, key, velocity] = data;
        if (command === 144 && velocity > 0) {
          const note = Tone.Midi(key).toNote();
          console.log(note);
          sampler.triggerAttack(note);
        }
      };
    });
  });
});
