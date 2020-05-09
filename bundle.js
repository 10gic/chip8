(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
const Chip8 = require('./chip8');

const vm = new Chip8();

const DISPLAY_WIDTH = 64;
const DISPLAY_HEIGHT = 32;
const PIXEL_SIZE = 10;
const DISPLAY_COLOR_BG = "#c2c2c2";
const DISPLAY_COLOR_FG = "#000000";

const myCanvas = document.getElementById("chip8-canvas").getContext("2d");
myCanvas.fillStyle = DISPLAY_COLOR_BG;
myCanvas.fillRect(0, 0, DISPLAY_WIDTH * PIXEL_SIZE, DISPLAY_HEIGHT * PIXEL_SIZE);
myCanvas.fillStyle = DISPLAY_COLOR_FG;
myCanvas.font = "bold 36px Arial";
myCanvas.fillText("CHIP-8", 250, 160);

const gameTetris = [
    0xa2, 0xb4, 0x23, 0xe6, 0x22, 0xb6, 0x70, 0x01, 0xd0, 0x11, 0x30, 0x25,
    0x12, 0x06, 0x71, 0xff, 0xd0, 0x11, 0x60, 0x1a, 0xd0, 0x11, 0x60, 0x25,
    0x31, 0x00, 0x12, 0x0e, 0xc4, 0x70, 0x44, 0x70, 0x12, 0x1c, 0xc3, 0x03,
    0x60, 0x1e, 0x61, 0x03, 0x22, 0x5c, 0xf5, 0x15, 0xd0, 0x14, 0x3f, 0x01,
    0x12, 0x3c, 0xd0, 0x14, 0x71, 0xff, 0xd0, 0x14, 0x23, 0x40, 0x12, 0x1c,
    0xe7, 0xa1, 0x22, 0x72, 0xe8, 0xa1, 0x22, 0x84, 0xe9, 0xa1, 0x22, 0x96,
    0xe2, 0x9e, 0x12, 0x50, 0x66, 0x00, 0xf6, 0x15, 0xf6, 0x07, 0x36, 0x00,
    0x12, 0x3c, 0xd0, 0x14, 0x71, 0x01, 0x12, 0x2a, 0xa2, 0xc4, 0xf4, 0x1e,
    0x66, 0x00, 0x43, 0x01, 0x66, 0x04, 0x43, 0x02, 0x66, 0x08, 0x43, 0x03,
    0x66, 0x0c, 0xf6, 0x1e, 0x00, 0xee, 0xd0, 0x14, 0x70, 0xff, 0x23, 0x34,
    0x3f, 0x01, 0x00, 0xee, 0xd0, 0x14, 0x70, 0x01, 0x23, 0x34, 0x00, 0xee,
    0xd0, 0x14, 0x70, 0x01, 0x23, 0x34, 0x3f, 0x01, 0x00, 0xee, 0xd0, 0x14,
    0x70, 0xff, 0x23, 0x34, 0x00, 0xee, 0xd0, 0x14, 0x73, 0x01, 0x43, 0x04,
    0x63, 0x00, 0x22, 0x5c, 0x23, 0x34, 0x3f, 0x01, 0x00, 0xee, 0xd0, 0x14,
    0x73, 0xff, 0x43, 0xff, 0x63, 0x03, 0x22, 0x5c, 0x23, 0x34, 0x00, 0xee,
    0x80, 0x00, 0x67, 0x05, 0x68, 0x06, 0x69, 0x04, 0x61, 0x1f, 0x65, 0x10,
    0x62, 0x07, 0x00, 0xee, 0x40, 0xe0, 0x00, 0x00, 0x40, 0xc0, 0x40, 0x00,
    0x00, 0xe0, 0x40, 0x00, 0x40, 0x60, 0x40, 0x00, 0x40, 0x40, 0x60, 0x00,
    0x20, 0xe0, 0x00, 0x00, 0xc0, 0x40, 0x40, 0x00, 0x00, 0xe0, 0x80, 0x00,
    0x40, 0x40, 0xc0, 0x00, 0x00, 0xe0, 0x20, 0x00, 0x60, 0x40, 0x40, 0x00,
    0x80, 0xe0, 0x00, 0x00, 0x40, 0xc0, 0x80, 0x00, 0xc0, 0x60, 0x00, 0x00,
    0x40, 0xc0, 0x80, 0x00, 0xc0, 0x60, 0x00, 0x00, 0x80, 0xc0, 0x40, 0x00,
    0x00, 0x60, 0xc0, 0x00, 0x80, 0xc0, 0x40, 0x00, 0x00, 0x60, 0xc0, 0x00,
    0xc0, 0xc0, 0x00, 0x00, 0xc0, 0xc0, 0x00, 0x00, 0xc0, 0xc0, 0x00, 0x00,
    0xc0, 0xc0, 0x00, 0x00, 0x40, 0x40, 0x40, 0x40, 0x00, 0xf0, 0x00, 0x00,
    0x40, 0x40, 0x40, 0x40, 0x00, 0xf0, 0x00, 0x00, 0xd0, 0x14, 0x66, 0x35,
    0x76, 0xff, 0x36, 0x00, 0x13, 0x38, 0x00, 0xee, 0xa2, 0xb4, 0x8c, 0x10,
    0x3c, 0x1e, 0x7c, 0x01, 0x3c, 0x1e, 0x7c, 0x01, 0x3c, 0x1e, 0x7c, 0x01,
    0x23, 0x5e, 0x4b, 0x0a, 0x23, 0x72, 0x91, 0xc0, 0x00, 0xee, 0x71, 0x01,
    0x13, 0x50, 0x60, 0x1b, 0x6b, 0x00, 0xd0, 0x11, 0x3f, 0x00, 0x7b, 0x01,
    0xd0, 0x11, 0x70, 0x01, 0x30, 0x25, 0x13, 0x62, 0x00, 0xee, 0x60, 0x1b,
    0xd0, 0x11, 0x70, 0x01, 0x30, 0x25, 0x13, 0x74, 0x8e, 0x10, 0x8d, 0xe0,
    0x7e, 0xff, 0x60, 0x1b, 0x6b, 0x00, 0xd0, 0xe1, 0x3f, 0x00, 0x13, 0x90,
    0xd0, 0xe1, 0x13, 0x94, 0xd0, 0xd1, 0x7b, 0x01, 0x70, 0x01, 0x30, 0x25,
    0x13, 0x86, 0x4b, 0x00, 0x13, 0xa6, 0x7d, 0xff, 0x7e, 0xff, 0x3d, 0x01,
    0x13, 0x82, 0x23, 0xc0, 0x3f, 0x01, 0x23, 0xc0, 0x7a, 0x01, 0x23, 0xc0,
    0x80, 0xa0, 0x6d, 0x07, 0x80, 0xd2, 0x40, 0x04, 0x75, 0xfe, 0x45, 0x02,
    0x65, 0x04, 0x00, 0xee, 0xa7, 0x00, 0xf2, 0x55, 0xa8, 0x04, 0xfa, 0x33,
    0xf2, 0x65, 0xf0, 0x29, 0x6d, 0x32, 0x6e, 0x00, 0xdd, 0xe5, 0x7d, 0x05,
    0xf1, 0x29, 0xdd, 0xe5, 0x7d, 0x05, 0xf2, 0x29, 0xdd, 0xe5, 0xa7, 0x00,
    0xf2, 0x65, 0xa2, 0xb4, 0x00, 0xee, 0x6a, 0x00, 0x60, 0x19, 0x00, 0xee,
    0x37, 0x23
];

const gameWipeoff = [
    0xa2, 0xcc, 0x6a, 0x07, 0x61, 0x00, 0x6b, 0x08, 0x60, 0x00, 0xd0, 0x11,
    0x70, 0x08, 0x7b, 0xff, 0x3b, 0x00, 0x12, 0x0a, 0x71, 0x04, 0x7a, 0xff,
    0x3a, 0x00, 0x12, 0x06, 0x66, 0x00, 0x67, 0x10, 0xa2, 0xcd, 0x60, 0x20,
    0x61, 0x1e, 0xd0, 0x11, 0x63, 0x1d, 0x62, 0x3f, 0x82, 0x02, 0x77, 0xff,
    0x47, 0x00, 0x12, 0xaa, 0xff, 0x0a, 0xa2, 0xcb, 0xd2, 0x31, 0x65, 0xff,
    0xc4, 0x01, 0x34, 0x01, 0x64, 0xff, 0xa2, 0xcd, 0x6c, 0x00, 0x6e, 0x04,
    0xee, 0xa1, 0x6c, 0xff, 0x6e, 0x06, 0xee, 0xa1, 0x6c, 0x01, 0xd0, 0x11,
    0x80, 0xc4, 0xd0, 0x11, 0x4f, 0x01, 0x12, 0x98, 0x42, 0x00, 0x64, 0x01,
    0x42, 0x3f, 0x64, 0xff, 0x43, 0x00, 0x65, 0x01, 0x43, 0x1f, 0x12, 0xa4,
    0xa2, 0xcb, 0xd2, 0x31, 0x82, 0x44, 0x83, 0x54, 0xd2, 0x31, 0x3f, 0x01,
    0x12, 0x42, 0x43, 0x1e, 0x12, 0x98, 0x6a, 0x02, 0xfa, 0x18, 0x76, 0x01,
    0x46, 0x70, 0x12, 0xaa, 0xd2, 0x31, 0xc4, 0x01, 0x34, 0x01, 0x64, 0xff,
    0xc5, 0x01, 0x35, 0x01, 0x65, 0xff, 0x12, 0x42, 0x6a, 0x03, 0xfa, 0x18,
    0xa2, 0xcb, 0xd2, 0x31, 0x73, 0xff, 0x12, 0x36, 0xa2, 0xcb, 0xd2, 0x31,
    0x12, 0x28, 0xa2, 0xcd, 0xd0, 0x11, 0xa2, 0xf0, 0xf6, 0x33, 0xf2, 0x65,
    0x63, 0x18, 0x64, 0x1b, 0xf0, 0x29, 0xd3, 0x45, 0x73, 0x05, 0xf1, 0x29,
    0xd3, 0x45, 0x73, 0x05, 0xf2, 0x29, 0xd3, 0x45, 0x12, 0xc8, 0x01, 0x80,
    0x44, 0xff
];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

let running = 0;
let currentProgram = gameTetris;

async function main() {
    setupKeyboard(vm);

    vm.loadProgram(currentProgram);
    dumpVM(vm);

    //// following code works, but frequency is not 60hz. Use requestAnimationFrame better.
    // let timer = 0;
    // for(;;)
    // {
    //     if (running) {
    //         // Emulate one cycle
    //         vm.emulateCycle();
    //         dumpVM();
    //
    //         if (timer % 20 == 0) { // let decrementTimers slow than emulateCycle
    //             vm.decrementTimers();
    //             timer = 0
    //         }
    //
    //         // If the draw flag is set, update the screen
    //         if (vm.drawFlag) {
    //             drawGraphics(vm.display);
    //             vm.drawFlag = 0
    //         }
    //
    //     }
    //
    //     await sleep(5);
    // }

    function runLoop() {
        if (running) {
            for (let i = 0; i < 10; i++) { // let emulateCycle fast than decrementTimers
                // Emulate one cycle
                vm.emulateCycle();
                dumpVM(vm);
            }

            vm.decrementTimers();
        }

        // If the draw flag is set, update the screen
        if(vm.drawFlag) {
            drawGraphics(vm.display);
            vm.drawFlag = 0;
        }

        window.requestAnimationFrame(runLoop);  // 60 times per second
    }
    window.requestAnimationFrame(runLoop);  // 60 times per second
}

function setupKeyboard(vm) {
    document.addEventListener('keydown', event => {
        vm.setKey(event.key);
    });

    document.addEventListener('keyup', event => {
        vm.unsetKey();
    })
}

// render input to canvas
function drawGraphics(input) {
    for (let i = 0; i < input.length; i++) {
        let x = (i % DISPLAY_WIDTH) * PIXEL_SIZE;
        let y = Math.floor(i / DISPLAY_WIDTH) * PIXEL_SIZE;

        if (input[i] == 0) {
            myCanvas.fillStyle = DISPLAY_COLOR_BG;
        } else {
            myCanvas.fillStyle = DISPLAY_COLOR_FG;
        }
        myCanvas.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
    }
}

document.getElementById("roms").addEventListener("change", e => {
    let oldProgram = currentProgram
    if (e.target.value == "TETRIS") {
        currentProgram = gameTetris
    } else if (e.target.value == "WIPEOFF") {
        currentProgram = gameWipeoff
    }

    if (currentProgram != oldProgram) {
        vm.loadProgram(currentProgram);
    }
});

runButton = document.getElementById("run-button");
runButton.addEventListener("click", () => {
    if (running) {
        running = false;
        runButton.innerHTML = "Start";
    } else {
        running = true;
        runButton.innerHTML = "Stop";
    }
});

restartButton = document.getElementById("restart-button");
restartButton.addEventListener("click", () => {
    running = true;
    runButton.innerHTML = "Stop";
    vm.loadProgram(currentProgram)
});

stepButton = document.getElementById("step-button");
stepButton.addEventListener("click", () => {
    vm.emulateCycle();
    dumpVM(vm);
    vm.decrementTimers();

    // If the draw flag is set, update the screen
    if(vm.drawFlag) {
        drawGraphics(vm.display);
        vm.drawFlag = 0;
    }
});

function hex(value, length = 4) {
    const padded = "0000" + value.toString(16).toUpperCase();
    return padded.substr(padded.length - length);
}

function inRange(value, lower, upper) { return value >= lower && value <= upper; }

// dissassemble program at addr.
// From https://github.com/ColinEberhardt/wasm-rust-chip8/blob/master/web/chip8.js
function dissassemble(program, addr) {
    const opcode = (program[addr] << 8) | program[addr + 1];

    const x = (opcode & 0x0f00) >> 8;
    const y = (opcode & 0x00f0) >> 4;
    const nnn = opcode & 0x0fff;
    const kk = opcode & 0x00ff;
    const n = opcode & 0x000f;

    if (opcode === 0x00e0) return "CLS";
    if (opcode === 0x00ee) return "RET";
    if (inRange(opcode, 0x1000, 0x1fff)) return `JP 0x${hex(nnn, 3)}`;
    if (inRange(opcode, 0x2000, 0x2fff)) return `CALL 0x${hex(nnn, 3)}`;
    if (inRange(opcode, 0x3000, 0x3fff)) return `SE V${n} ${kk}`;
    if (inRange(opcode, 0x4000, 0x4fff)) return `SNE V${n} ${kk}`;
    if (inRange(opcode, 0x5000, 0x5fff)) return `SE V${x} V${y}`;
    if (inRange(opcode, 0x6000, 0x6fff)) return `LD V${x} ${kk}`;
    if (inRange(opcode, 0x7000, 0x7fff)) return `ADD V${x} ${kk}`;
    if (inRange(opcode, 0x8000, 0x8fff)) {
        if (n === 0x0) return `LD V${x} V${y}`;
        if (n === 0x1) return `OR V${x} V${y}`;
        if (n === 0x2) return `AND V${x} V${y}`;
        if (n === 0x3) return `XOR V${x} V${y}`;
        if (n === 0x4) return `ADD V${x} V${y}`;
        if (n === 0x5) return `SUB V${x} V${y}`;
        if (n === 0x6) return `SHR V${x}`;
        if (n === 0x7) return `SUBN V${x} V${y}`;
        if (n === 0xe) return `SHL V${x}`;
    }
    if (inRange(opcode, 0x9000, 0x9fff)) return `SNE V${x} V${y}`;
    if (inRange(opcode, 0xa000, 0xafff)) return `LDI ${nnn}`;
    if (inRange(opcode, 0xb000, 0xbfff)) return `JP V0 + ${nnn}`;
    if (inRange(opcode, 0xc000, 0xcfff)) return `RND ${kk}`;
    if (inRange(opcode, 0xd000, 0xdfff)) return `DRW V${x} V${y} ${n}`;
    if (inRange(opcode, 0xe000, 0xefff)) {
        if (kk === 0x9e) return `SKP V${x}`;
        if (kk === 0xa1) return `SKNP V${x}`;
    }
    if (inRange(opcode, 0xf000, 0xffff)) {
        if (kk === 0x07) return `LD V${x} DT`;
        if (kk === 0x0a) return `LD V${x} K`;
        if (kk === 0x15) return `LD DT, V${x}`;
        if (kk === 0x1e) return `ADD I, V${x}`;
        if (kk === 0x29) return `LD F, V${x}`;
        if (kk === 0x33) return `LD B, V${x}`;
        if (kk === 0x55) return `LD [I], ${x}`;
        if (kk === 0x65) return `LD ${x}, [I]`;
    }
    return "-";
}

function dumpVM(vm) {
    dumpMemory(vm);
    dumpRegisters(vm);
}

function dumpMemory(vm) {
    deleteChild("memory");
    let pc = vm.pc;
    while (pc < vm.pc + 32) { // only dump 16 opcode
        const clazz = `addr_${pc}`;
        const haddress = "0x" + hex(pc);
        appendChild("memory", `<div class='${clazz}'>${haddress} - ${dissassemble(
            vm.memory, pc)}</div>`);
        pc += 2;
    }
}

function dumpRegisters(vm) {
    deleteChild("register-v");
    for (let i = 0; i < vm.V.length; i++) {
        appendChild("register-v", `<div>V${i}: ${vm.V[i]}</div>`);
    }
    deleteChild("register-others");
    appendChild("register-others", `<div>PC: ${vm.pc}</div>`);
    appendChild("register-others", `<div>I: ${vm.I}</div>`);
}

function deleteChild(id) { // jQuery: empty()
    let e = document.getElementById(id);
    let child = e.lastElementChild;
    while (child) {
        e.removeChild(child);
        child = e.lastElementChild;
    }
}

function appendChild(parentId, html) { // jQuery: append()
    document.getElementById(parentId).insertAdjacentHTML( 'beforeend', html);
}

main();

},{"./chip8":1}]},{},[2]);
