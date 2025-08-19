// generate-hash.js
import bcrypt from 'bcryptjs';

const plain = 'test123'; // <- choose your new admin password
const rounds = 10;

const hash = await bcrypt.hash(plain, rounds);
console.log('BCRYPT HASH:', hash);
