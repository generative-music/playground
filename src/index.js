import * as Tone from 'tone';
import {
  createPitchShiftedSampler,
  toss,
  transpose,
} from '@generative-music/utilities';
import samples from './samples';

const notes = ['C5', 'F5', 'A5', 'C6', 'D6', 'G6', 'A6'];

const buildPhrase = (length) => {
  const phrase = [];
  let nonSequentialNotes = notes;
  for (let i = 0; i < length; i += 1) {
    const selectedNote =
      nonSequentialNotes[Math.floor(Math.random() * nonSequentialNotes.length)];
    phrase.push(selectedNote);
    nonSequentialNotes = notes.filter((note) => note !== selectedNote);
  }
  return phrase;
};

const reverb = new Tone.Reverb(15).toDestination();
reverb.generate();
const filter = new Tone.Filter(200).connect(reverb);
createPitchShiftedSampler({
  samplesByNote: samples['vsco2-violin-arcvib'],
  pitchShift: -36,
  attack: 5,
}).then((sampler) => {
  sampler.connect(filter);

  const playDrone = () => {
    const phrase = buildPhrase(Math.floor(Math.random() * 2 + 1));

    phrase.forEach((note, i) => {
      sampler.triggerAttack(note, `+${i * 20}`);
    });

    Tone.Transport.scheduleOnce(() => {
      playDrone();
    }, `+${240 + Math.random() * 240}`);
  };
  playDrone();
});

createPitchShiftedSampler({
  samplesByNote: samples['vsco2-piano-mf'],
  pitchShift: -24,
}).then((sampler) => {
  sampler.connect(Tone.Destination);

  const playPhrase = () => {
    const num = Math.floor(Math.random() * 10 + 10);

    const exponent = Math.random() * 1 + 1;

    buildPhrase(num).forEach((note, i) => {
      sampler.triggerAttack(note, `+${(i / num) ** exponent * (num / 2)}`);
    });
    Tone.Transport.scheduleOnce(() => {
      playPhrase();
    }, `+${num / 2 + 7 + Math.random() * 7}`);
  };

  playPhrase();
  Tone.Transport.start();

  window.navigator.requestMIDIAccess().then((access) => {
    console.log(access);
    const inputs = Array.from(access.inputs).forEach(([name, device]) => {
      device.onmidimessage = ({ data }) => {
        const [command, key] = data;
        if (command === 144) {
          const note = Tone.Midi(key).toNote();
          console.log(note);
          sampler.triggerAttack(note);
        }
      };
    });
  });
});
