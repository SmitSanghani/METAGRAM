class AudioGenerator {
    constructor() {
        this.ctx = null;
        this.oscillators = [];
    }

    async init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    async startDialTone() {
        await this.init();
        this.stop();

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.frequency.value = 350;
        osc2.frequency.value = 440;
        
        gain.gain.value = 0.1;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        
        this.oscillators = [osc1, osc2, gain];
    }

    async startRingTone() {
        await this.init();
        this.stop();

        const playRing = () => {
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.frequency.value = 440;
            osc2.frequency.value = 480;
            gain.gain.value = 0.1;

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start();
            osc2.start();

            // Ring for 2 seconds
            setTimeout(() => {
                osc1.stop();
                osc2.stop();
            }, 2000);
        };

        playRing();
        const interval = setInterval(playRing, 6000); // 2s on, 4s off
        this.oscillators = [{ stop: () => clearInterval(interval) }];
    }

    stop() {
        if (this.oscillators.length > 0) {
            this.oscillators.forEach(obj => {
                if (obj.stop) obj.stop();
                if (obj.disconnect) obj.disconnect();
            });
            this.oscillators = [];
        }
    }
}

export const audioGenerator = new AudioGenerator();
