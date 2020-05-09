const Chip8 = require('./chip8');

const vm = new Chip8();

test('opcode 00EE (ret)', () => {
    const program = [0x00, 0xEE]; // 0x00EE
    vm.loadProgram(program);
    let oldSp = 0x6;
    vm.sp = oldSp;
    vm.stack[vm.sp] = 0x4;
    vm.emulateCycle();

    expect(vm.pc).toBe(0x4);
    expect(vm.sp).toBe(oldSp - 1);
});

test('opcode 1NNN (jump)', () => {
    const program = [0x14, 0x56]; // 0x1456
    vm.loadProgram(program);
    vm.emulateCycle();

    expect(vm.pc).toBe(0x456);
});

test('opcode 2NNN (call)', () => {
    const program = [0x24, 0x56]; // 0x2456
    vm.loadProgram(program);
    let oldPc = vm.pc;
    vm.emulateCycle();

    expect(vm.sp).toBe(0);
    expect(vm.stack[vm.sp]).toBe(oldPc + 2);
    expect(vm.pc).toBe(0x456);
});

test('opcode 3XNN (skipIf), VX equals NN', () => {
    const program = [0x36, 0x78]; // 0x3678
    vm.loadProgram(program);
    vm.V[6] = 0x78;
    vm.emulateCycle();

    expect(vm.pc).toBe(0x200 + 4); // skip next instruction
});

test('opcode 3XNN (skipIf), VX not equals NN', () => {
    const program = [0x36, 0x78]; // 0x3678
    vm.loadProgram(program);
    vm.V[6] = 0x0;
    vm.emulateCycle();

    expect(vm.pc).toBe(0x200 + 2);
});

test('opcode 4XNN (skipIfNot), VX equals NN', () => {
    const program = [0x46, 0x78]; // 0x4678
    vm.loadProgram(program);
    vm.V[6] = 0x78;
    vm.emulateCycle();

    expect(vm.pc).toBe(0x200 + 2);
});

test('opcode 4XNN (skipIfNot), VX not equals NN', () => {
    const program = [0x46, 0x78]; // 0x4678
    vm.loadProgram(program);
    vm.V[6] = 0x0;
    vm.emulateCycle();

    expect(vm.pc).toBe(0x200 + 4);
});

test('opcode 5XY0 (skipIfXY), VX equals VY', () => {
    const program = [0x56, 0x70]; // 0x5670
    vm.loadProgram(program);
    vm.V[6] = 0x44;
    vm.V[7] = 0x44;
    vm.emulateCycle();

    expect(vm.pc).toBe(0x200 + 4);
});

test('opcode 5XY0 (skipIfXY), VX not equals VY', () => {
    const program = [0x56, 0x70]; // 0x5670
    vm.loadProgram(program);
    vm.V[6] = 0x44;
    vm.V[7] = 0x55;
    vm.emulateCycle();

    expect(vm.pc).toBe(0x200 + 2);
});

// ......

test('opcode 8XY4 (add), 10 + 20, register V0 V1', () => {
    const program = [0x80, 0x14]; // 0x8014
    vm.loadProgram(program);
    vm.V[0] = 10;
    vm.V[1] = 20;
    vm.emulateCycle();

    expect(vm.V[0]).toBe(30);
    expect(vm.V[0xF]).toBe(0);
});

test('opcode 8XY4 (add), 10 + 20, register VA VB', () => {
    const program = [0x8A, 0xB4]; // 0x8AB4
    vm.loadProgram(program);
    vm.V[0xA] = 10;
    vm.V[0xB] = 20;
    vm.emulateCycle();

    expect(vm.V[0xA]).toBe(30);
    expect(vm.V[0xF]).toBe(0);
});

test('opcode 8XY4 (add), 100 + 200, with carry', () => {
    const program = [0x80, 0x14]; // 0x8014
    vm.loadProgram(program);
    vm.V[0] = 100;
    vm.V[1] = 200;
    vm.emulateCycle();

    expect(vm.V[0xF]).toBe(1);
});
