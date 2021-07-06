import * as Tone from 'tone';
import {
  createPitchShiftedSampler,
  createBuffer,
  transpose,
} from '@generative-music/utilities';
import samples from './samples';

const BASE_TIME_UNIT = 0.5;

function* makeNoteGenerator() {
  let lastNote;
  while (true) {
    const potentialNotes = Object.keys(samples['tongue-drum']).filter(
      (note) => note !== lastNote
    );
    lastNote =
      potentialNotes[Math.floor(Math.random() * potentialNotes.length)];
    yield lastNote;
  }
}

const createPercussionInstrument = (url) =>
  createBuffer(url).then((buffer) => {
    const output = new Tone.Gain();
    const activeSources = [];

    const connect = (...args) => {
      output.connect(...args);
    };

    const toDestination = () => {
      output.toDestination();
    };

    const triggerAttack = (time, velocity = 1) => {
      const gain = new Tone.Gain(velocity).connect(output);
      const source = new Tone.ToneBufferSource(buffer)
        .set({
          onended: () => {
            const index = activeSources.indexOf(source);
            if (index > -1) {
              activeSources.splice(index, 1);
            }
          },
        })
        .connect(gain);
      source.start(time);
    };

    const dispose = () => {
      activeSources.forEach((node) => {
        node.stop();
      });
    };

    return { connect, toDestination, triggerAttack, dispose };
  });

const tongueDrum = createPitchShiftedSampler({
  samplesByNote: Object.keys(samples['tongue-drum']).reduce((o, note) => {
    o[note] = `samples/tongue-drum/${samples['tongue-drum'][note]}`;
    return o;
  }, {}),
  pitchShift: -12,
}).then((sampler) => {
  const gain = new Tone.Gain(0).toDestination();
  const compressor = new Tone.Compressor().connect(gain);
  sampler.connect(compressor);

  const noteGenerator = makeNoteGenerator();

  const createPhrase = () =>
    Array.from({ length: 8 }, (_, i) => i)
      .filter((i) => Math.random() < 0.8 - (i % 2) * 0.6)
      .map((index) => ({
        index,
        note: noteGenerator.next().value,
      }));

  let phrase = [];
  const schedulePhrase = (startTime) => {
    phrase = createPhrase();
    const duration = Math.random() * 15 + 30;
    console.log('setting gain at 0 at ', startTime);
    gain.gain.setValueAtTime(0, startTime);
    console.log('ramping to 1 at ', startTime + duration / 3);
    gain.gain.linearRampToValueAtTime(1, startTime + duration / 3);

    Tone.Transport.scheduleOnce((releaseTime) => {
      gain.gain.setValueAtTime(1, releaseTime);
      gain.gain.linearRampToValueAtTime(0, releaseTime + duration / 3);

      Tone.Transport.scheduleOnce((endTime) => {
        schedulePhrase(endTime);
      }, releaseTime + Math.random() * 20 + 20);
    }, startTime + (duration / 3) * 2);
  };

  Tone.Transport.scheduleOnce((time) => {
    schedulePhrase(time);
  }, Math.random() * 10 + 20);

  Tone.Transport.scheduleRepeat((time) => {
    phrase.forEach(({ note, index }) => {
      //sampler.triggerAttack(note, time + index * BASE_TIME_UNIT + 0.95);
    });
  }, 8 * BASE_TIME_UNIT);
});

const percussionAutoFilter = new Tone.AutoFilter(
  Math.random() * 0.001 + 0.001,
  1000
)
  .start()
  .toDestination();

const hats = createPercussionInstrument(
  './samples/itslucid-lofi-hats/9.wav'
).then((sampler) => {
  sampler.connect(percussionAutoFilter);
  Tone.Transport.scheduleRepeat((time) => {
    sampler.triggerAttack(time + 1, 0.05);
    if (Math.random() < 0.1) {
      sampler.triggerAttack(time + 1 + BASE_TIME_UNIT / 4, 0.05);
    }
  }, BASE_TIME_UNIT / 2);
});

const kicks = createPercussionInstrument(
  './samples/itslucid-lofi-kick/1.wav'
).then((sampler) => {
  sampler.connect(percussionAutoFilter);
  Tone.Transport.scheduleRepeat((time) => {
    sampler.triggerAttack(time + 1, 0.25);
    if (Math.random() < 0.2) {
      sampler.triggerAttack(time + 1 + BASE_TIME_UNIT, 0.25);
    }

    if (Math.random() < 0.2) {
      sampler.triggerAttack(time + 1 + BASE_TIME_UNIT * 7, 0.25);
    }
  }, 8 * BASE_TIME_UNIT);
});

const snare = createPercussionInstrument(
  './samples/itslucid-lofi-snare/12.wav'
).then((sampler) => {
  sampler.connect(percussionAutoFilter);
  Tone.Transport.scheduleRepeat((time) => {
    if (Math.random() < 0.33) {
      sampler.triggerAttack(time + 1 + 3.25 * BASE_TIME_UNIT, 0.25);
    }
    sampler.triggerAttack(time + 1 + 4 * BASE_TIME_UNIT, 0.25);
    if (Math.random() < 0.1) {
      sampler.triggerAttack(time + 1 + 7.5 * BASE_TIME_UNIT, 0.25);
      sampler.triggerAttack(time + 1 + 7.75 * BASE_TIME_UNIT, 0.25);
    }
  }, 8 * BASE_TIME_UNIT);
});

Promise.all([hats, tongueDrum, kicks, snare]).then(() => {
  Tone.Transport.start();
});

const violins = createPitchShiftedSampler({
  samplesByNote: samples['vsco2-violins-susvib'],
  pitchShift: -24,
}).then((sampler) => {
  sampler.connect(Tone.getDestination());

  let lastExtraNote = 'A';
  let lastExtraNoteTime = Tone.now();

  const drone = () => {
    sampler.triggerAttack('C4');

    Tone.Transport.scheduleOnce(() => {
      drone();
    }, `+${Math.random() * 10}`);

    if (Tone.now() - lastExtraNoteTime < 20 || Math.random() < 0.7) {
      return;
    }

    lastExtraNote = Math.random() < 0.6 || lastExtraNote === 'A' ? 'G' : 'A';
    lastExtraNoteTime = Tone.now();
    console.log(`${lastExtraNote}4`);
    sampler.triggerAttack(`${lastExtraNote}4`);
    if (Math.random() < 0.2) {
      console.log(`${lastExtraNote}5`);
      sampler.triggerAttack(`${lastExtraNote}5`);
    }
  };
  drone();
});

const panner = new Tone.Panner().toDestination();
const synth = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: { release: 1, releaseCurve: 'linear' },
  volume: -10,
}).connect(panner);

Tone.Transport.scheduleRepeat((time) => {
  panner.pan.setValueAtTime(panner.pan.value, time + 1);
  panner.pan.linearRampToValueAtTime(Math.random() * 2 - 1, time + 3);
  panner.set({ pan: Math.random() * 2 - 1 });
  synth.triggerAttackRelease('C2', 1, time + 1);
}, BASE_TIME_UNIT * 8);
