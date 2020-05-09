const KEYS = ['1', '2', '3', '4', 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f', 'z', 'x', 'c', 'v'];
const DISPLAY_WIDTH = 64;
const DISPLAY_HEIGHT = 32;

class Chip8 {
    constructor() {
        this.memory = new Uint8Array(4096); // 4K Memory
        this.V = new Uint8Array(16); // 16 8-bit data registers
        this.I = 0; // address register
        this.pc = 0x200; // 0x200 is the start location of program

        // Anytime you perform a call a subroutine, store the program counter in the stack before proceeding.
        this.stack = new Array(16); // support 16 levels of nesting
        this.sp = -1; // stack pointer

        this.drawFlag = 0;
        this.display = new Array(DISPLAY_WIDTH * DISPLAY_HEIGHT);
        for (let i = 0; i < this.display.length; i++) {
            this.display[i] = 0;
        }

        this.delayTimer = 0; // delayTimer related opcode: FX07, FX15
        this.soundTimer = 0;

        this.indexOfKeyPressed = -1;
    }

    reset() {
        let chars0toF = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ];
        // 0x00 - 0x80 in memory is reserved for characters 0-F, see opcode FX29 (sprite_addr)
        for (let i = 0; i < chars0toF.length; i++) {
            this.memory[i] = chars0toF[i];
        }

        this.I = 0;
        this.pc = 0x200;

        this.sp = -1;

        this.drawFlag = 0;
        for (let i = 0; i < this.display.length; i++) {
            this.display[i] = 0;
        }

        this.delayTimer = 0;
        this.soundTimer = 0;

        this.indexOfKeyPressed = -1;
    }

    setKey(key) {
        let keyIndex = KEYS.indexOf(key);
        this.indexOfKeyPressed = keyIndex;
    }

    unsetKey() {
        this.indexOfKeyPressed = -1;
    }

    decrementTimers() {
        if (this.delayTimer > 0) {
            // Decrement the delay timer by one until it reaches zero
            this.delayTimer--
        }

        if (this.soundTimer > 0) {
            if (this.soundTimer == 1) {
                // TODO beep!
            }
            // Decrement the sound timer by one until it reaches zero
            this.soundTimer--
        }
    }

    // load program into memory at location 0x200
    loadProgram(program) {
        this.reset();

        for (let i = 0; i < program.length; i++) {
            this.memory[i + 0x200] = program[i];
        }
    }

    emulateCycle() {
        // fetch 16-bit opcode
        let firstByte = this.memory[this.pc];
        let secondByte = this.memory[this.pc + 1];
        let opcode = (firstByte << 8) | secondByte;

        // move forward two bytes, point to next opcode
        this.pc += 2;

        let X = (opcode & 0x0F00) >> 8; // second nibble
        let Y = (opcode & 0x00F0) >> 4; // third nibble

        console.log("current opcode:", opcode.toString(16));

        // execute opcode
        if (opcode == 0x00E0) { // 00E0
            // Clears the screen.
            for (let i = 0; i < this.display.length; i++) {
                this.display[i] = 0;
            }
            this.drawFlag = true;

        } else if (opcode == 0x00EE) { // 00EE
            // Returns from a subroutine.
            if (this.sp < 0) {
                throw new Error("Stack underflow")
            }
            this.pc = this.stack[this.sp];
            this.sp--;

        } else if ((opcode & 0xF000) == 0x0000) { // 0NNN
            throw new Error("opcode 0NNN not implementation")

        } else if ((opcode & 0xF000) == 0x1000) { // 1NNN
            // Jumps to address NNN.
            let NNN = opcode & 0x0FFF;
            this.pc = NNN;

        } else if ((opcode & 0xF000) == 0x2000) { // 2NNN
            // Calls subroutine at NNN.
            if (this.sp >= this.stack.length-1) {
                throw new Error("Stack overflow")
            }
            let NNN = opcode & 0x0FFF;
            this.sp++;
            this.stack[this.sp] = this.pc; // pc is already point to next opcode in beginning of function

            // jump to address NNN
            this.pc = NNN;

        } else if ((opcode & 0xF000) == 0x3000) { // 3XNN
            // Skips the next instruction if VX equals NN.
            let NN = opcode & 0x00FF;
            if (this.V[X] == NN) {
                this.pc += 2;
            }

        } else if ((opcode & 0xF000) == 0x4000) { // 4XNN
            // Skips the next instruction if VX doesn't equals NN.
            let NN = opcode & 0x00FF;
            if (this.V[X] != NN) {
                this.pc += 2;
            }

        } else if ((opcode & 0xF00F) == 0x5000) { // 5XY0
            // Skips the next instruction if VX equals VY.
            if (this.V[X] == this.V[Y]) {
                this.pc += 2;
            }

        } else if ((opcode & 0xF000) == 0x6000) { // 6XNN
            // Sets VX to NN.
            let NN = opcode & 0x00FF;
            this.V[X] = NN;

        } else if ((opcode & 0xF000) == 0x7000) { // 7XNN
            // Adds NN to VX. (Carry flag is not changed)
            let NN = opcode & 0x00FF;
            this.V[X] += NN;

        } else if ((opcode & 0xF00F) == 0x8000) { // 8XY0
            // Sets VX to the value of VY.
            this.V[X] = this.V[Y];

        } else if ((opcode & 0xF00F) == 0x8001) { // 8XY1
            // Sets VX to VX or VY. (Bitwise OR operation)
            this.V[X] = this.V[X] | this.V[Y];

        } else if ((opcode & 0xF00F) == 0x8002) { // 8XY2
            // Sets VX to VX and VY. (Bitwise AND operation)
            this.V[X] = this.V[X] & this.V[Y];

        } else if ((opcode & 0xF00F) == 0x8003) { // 8XY3
            // Sets VX to VX xor VY.
            this.V[X] = this.V[X] ^ this.V[Y];

        } else if ((opcode & 0xF00F) == 0x8004) { // 8XY4
            // Adds VY to VX. VF is set to 1 when there's a carry, and to 0 when there isn't
            this.V[0xF] = (this.V[X] + this.V[Y] > 0xFF) ? 1 : 0;
            this.V[X] += this.V[Y];

        } else if ((opcode & 0xF00F) == 0x8005) { // 8XY5
            // VY is subtracted from VX. VF is set to 0 when there's a borrow, and 1 when there isn't.
            this.V[0xF] = (this.V[X] < this.V[Y]) ? 0 : 1;
            this.V[X] -= this.V[Y];

        } else if ((opcode & 0xF00F) == 0x8006) { // 8XY6, shr
            // Stores the least significant bit of VX in VF and then shifts VX to the right by 1.
            this.V[0xF] = this.V[X] & 0x01;
            this.V[X] >>= 1;

        } else if ((opcode & 0xF00F) == 0x8007) { // 8XY7
            // Sets VX to VY minus VX. VF is set to 0 when there's a borrow, and 1 when there isn't.
            this.V[0xF] = (this.V[Y] < this.V[X]) ? 0 : 1;
            this.V[X] = this.V[Y] - this.V[X]

        } else if ((opcode & 0xF00F) == 0x800E) { // 8XYE, shl
            // Stores the most significant bit of VX in VF and then shifts VX to the left by 1.
            this.V[0xF] = this.V[X] >> 7;
            this.V[X] <<= 1;

        } else if ((opcode & 0xF00F) == 0x9000) { // 9XY0
            // Skips the next instruction if VX doesn't equal VY.
            if (this.V[X] != this.V[Y]) {
                this.pc += 2;
            }

        } else if ((opcode & 0xF000) == 0xA000) { // ANNN
            // Sets I to the address NNN.
            let NNN = opcode & 0x0FFF;
            this.I = NNN;

        } else if ((opcode & 0xF000) == 0xB000) { // BNNN
            // Jumps to the address NNN plus V0.
            let NNN = opcode & 0x0FFF;
            this.pc = NNN + this.V[0];

        } else if ((opcode & 0xF000) == 0xC000) { // CXNN
            // Sets VX to the result of a bitwise and operation on a random number (Typically: 0 to 255) and NN.
            let random = Math.floor(Math.random() * 0xff);
            let NN = opcode & 0x00FF;
            this.V[X] = random & NN;

        } else if ((opcode & 0xF000) == 0xD000) { // DXYN
            // The interpreter reads N bytes from memory, starting at the address stored in I.
            // These bytes are then displayed as sprites on screen at coordinates (Vx, Vy). Sprites are XORed onto the existing screen.
            // If this causes any pixels to be flipped, VF is set to 1, otherwise it is set to 0.
            // If the sprite is positioned so part of it is outside the coordinates of the display, it wraps around to the opposite side of the screen.
            let N = (opcode & 0x000F);

            // If no pixels are flipped, set VF to 0
            this.V[0xF] = 0;

            for (let y = 0; y < N; y++) {
                let sprite = this.memory[this.I + y];

                for (let x = 0; x < 8; x++) {
                    let left = (this.V[X] + x) % DISPLAY_WIDTH; // wrap around width
                    let top = (this.V[Y] + y) % DISPLAY_HEIGHT; // wrap around height

                    let currentPixel = ((sprite & 0x80) > 0) ? 1 : 0;
                    if (currentPixel == 1) {
                        if (this.drawPixel(left, top, currentPixel)) {
                            this.V[0xF] = 1;
                        }
                    }
                    sprite <<= 1;
                }
            }
            this.drawFlag = 1;

        } else if ((opcode & 0xF0FF) == 0xE09E) { // EX9E
            // Skips the next instruction if the key stored in VX is pressed.
            if (this.indexOfKeyPressed >= 0) { // key pressed
                if (this.V[X] == this.indexOfKeyPressed) {
                    this.pc += 2; // skip next instruction
                }
            }

        } else if ((opcode & 0xF0FF) == 0xE0A1) { // EXA1
            // Skips the next instruction if the key stored in VX isn't pressed.
            if (this.indexOfKeyPressed >= 0) { // one key pressed
                if (this.V[X] == this.indexOfKeyPressed) {
                    // the key stored in VX is pressed.
                    // do nothing
                } else {
                    this.pc += 2; // skip next instruction
                }
            } else { // no key pressed
                this.pc += 2; // skip next instruction
            }

        } else if ((opcode & 0xF0FF) == 0xF007) { // FX07, get_delay
            // Sets VX to the value of the delay timer.
            this.V[X] = this.delayTimer;

        } else if ((opcode & 0xF0FF) == 0xF00A) { // FX0A, get_key
            // A key press is awaited, and then stored in VX. (Blocking Operation. All instruction halted until next key event)
            if (this.indexOfKeyPressed == -1) { // no key pressed
                // pc is already point to next opcode in beginning of function
                // before return this cycle, we must restore pc point to current opcode (eg. FX0A),
                // so, it would still execute FX0A in next cycle.
                this.pc -= 2;
                return
            }

            // key pressed
            this.V[X] = this.indexOfKeyPressed

        } else if ((opcode & 0xF0FF) == 0xF015) { // FX15, delay_timer
            // Sets the delay timer to VX.
            this.delayTimer = this.V[X];

        } else if ((opcode & 0xF0FF) == 0xF018) { // FX18, sound_timer
            // Sets the sound timer to VX.
            this.soundTimer = this.V[X];

        } else if ((opcode & 0xF0FF) == 0xF01E) { // FX1E
            // Adds VX to I. VF is set to 1 when there is a range overflow (I+VX>0xFFF), and to 0 when there isn't.
            this.V[0xF] = (this.I + this.V[X] > 0x0FFF) ? 1:0;
            this.I += this.V[X];

        } else if ((opcode & 0xF0FF) == 0xF029) { // FX29, sprite_addr
            // Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font.
            // Characters 0-F are saved in memory start from 0x0000, see function reset().
            this.I = this.V[X] * 5; // Multiply by number of rows per character.

        } else if ((opcode & 0xF0FF) == 0xF033) { // FX33, set_BCD
            // Stores the binary-coded decimal representation of VX, with the most significant of three digits at the address in I,
            // the middle digit at I plus 1, and the least significant digit at I plus 2. (In other words, take the decimal representation of VX,
            // place the hundreds digit in memory at location in I, the tens digit at location I+1, and the ones digit at location I+2.)
            let x = this.V[X];
            const a = Math.floor(x / 100); // for 239, a is 2
            x = x - a * 100;  // subtract value of a * 100 from x (200)
            const b = Math.floor(x / 10); // x is now 39, b is 3
            x = x - b * 10; // subtract value of b * 10 from x (30)
            const c = Math.floor(x); // x is now 9

            this.memory[this.I] = a;
            this.memory[this.I + 1] = b;
            this.memory[this.I + 2] = c;

        } else if ((opcode & 0xF0FF) == 0xF055) { // FX55, reg_dump
            // Stores V0 to VX (including VX) in memory starting at address I.
            // The offset from I is increased by 1 for each value written, but I itself is left unmodified.
            for (let i = 0; i <= X; i++) {
                this.memory[this.I + i] = this.V[i]
            }

        } else if ((opcode & 0xF0FF) == 0xF065) { // FX65, reg_load
            // Fills V0 to VX (including VX) with values from memory starting at address I.
            // The offset from I is increased by 1 for each value written, but I itself is left unmodified.
            for (let i = 0; i <= X; i++) {
                this.V[i] = this.memory[this.I + i];

            }

        } else {
            throw new Error("invalid opcode " + opcode.toString(16));
        }
    }

    // draw pixel (XORed) at (x, y)
    // return 0 if pixel is no flipped, return 1 if pixel is flipped (old value same as new value)
    drawPixel(x, y, value) {
        let index = x + y * DISPLAY_WIDTH;

        this.display[index] ^= value;
        return !this.display[index];
    }
}

module.exports = Chip8;
